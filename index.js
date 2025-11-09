const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { z } = require('zod');
const { Buffer } = require('buffer');

const app = express();
app.use(cors());
app.use(express.json());

// simple async wrapper
const wrap = (fn) => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

const db = new Database('equip.db');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('student','staff','admin')) NOT NULL
);
CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  available INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  equipmentId INTEGER NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending','approved','rejected','returned')) NOT NULL DEFAULT 'pending',
  FOREIGN KEY(userId) REFERENCES users(id),
  FOREIGN KEY(equipmentId) REFERENCES equipment(id)
);
`);

const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const seed = db.prepare('INSERT INTO users (email,password,role) VALUES (?,?,?)');
  seed.run('admin.unique@school.edu','admin123','admin');
  seed.run('staff.unique@school.edu','staff123','staff');
  seed.run('student.unique@school.edu','student123','student');
  console.log('Seeded default users.');
}

// Schemas
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(3) });
const equipmentSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  condition: z.string().min(1),
  quantity: z.number().int().positive()
});
const requestSchema = z.object({
  equipmentId: z.number().int().positive(),
  startDate: z.string().min(1),
  endDate: z.string().min(1)
});
const statusSchema = z.object({ status: z.enum(['approved','rejected','returned']) });

// auth
function auth(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({error:'No token'});
  const token = h.replace('Bearer ','').trim();
  try { req.user = JSON.parse(Buffer.from(token,'base64').toString()); next(); }
  catch { return res.status(401).json({error:'Bad token'}); }
}
const requireRole = (...roles) => (req,res,next) => (!req.user || !roles.includes(req.user.role))
  ? res.status(403).json({error:'Forbidden'}) : next();

// helpers
function hasOverlap(equipmentId, startDate, endDate){
  const rows = db.prepare(`
    SELECT 1 FROM requests
    WHERE equipmentId=? AND status IN ('pending','approved')
      AND NOT (date(endDate) < date(?) OR date(startDate) > date(?))
    LIMIT 1
  `).all(equipmentId, startDate, endDate);
  return rows.length > 0;
}

// routes
app.post('/api/login', wrap((req,res)=>{
  const { email, password } = loginSchema.parse(req.body || {});
  const user = db.prepare('SELECT id,email,role FROM users WHERE email=? AND password=?').get(email,password);
  if (!user) return res.status(401).json({error:'Invalid email or password'});
  const token = Buffer.from(JSON.stringify(user)).toString('base64');
  res.json({ token, user });
}));

app.get('/api/equipment', wrap((req,res)=>{
  const rows = db.prepare('SELECT * FROM equipment').all();
  res.json(rows);
}));

app.post('/api/equipment', auth, requireRole('admin'), wrap((req,res)=>{
  const body = equipmentSchema.parse(req.body || {});
  const stmt = db.prepare('INSERT INTO equipment (name,category,condition,quantity,available) VALUES (?,?,?,?,?)');
  const info = stmt.run(body.name, body.category, body.condition, body.quantity, body.quantity);
  res.status(201).json({ id: info.lastInsertRowid });
}));

app.delete('/api/equipment/:id', auth, requireRole('admin'), wrap((req,res)=>{
  const id = Number(req.params.id);
  db.prepare('DELETE FROM equipment WHERE id=?').run(id);
  res.json({ ok:true });
}));

app.get('/api/requests', auth, wrap((req,res)=>{
  const rows = db.prepare(`
    SELECT r.*, e.name AS equipmentName, u.email AS requester
    FROM requests r
    JOIN equipment e ON e.id=r.equipmentId
    JOIN users u ON u.id=r.userId
    ORDER BY r.id DESC
  `).all();
  res.json(rows);
}));

app.post('/api/requests', auth, requireRole('student','staff','admin'), wrap((req,res)=>{
  const body = requestSchema.parse(req.body || {});
  if (hasOverlap(body.equipmentId, body.startDate, body.endDate)) {
    return res.status(409).json({error:'Overlapping booking exists'});
  }
  const info = db.prepare(`
    INSERT INTO requests (userId,equipmentId,startDate,endDate,status)
    VALUES (?,?,?,?, 'pending')
  `).run(req.user.id, body.equipmentId, body.startDate, body.endDate);
  res.status(201).json({ id: info.lastInsertRowid });
}));

app.patch('/api/requests/:id/status', auth, requireRole('staff','admin'), wrap((req,res)=>{
  const { status } = statusSchema.parse(req.body || {});
  const id = Number(req.params.id);
  db.prepare('UPDATE requests SET status=? WHERE id=?').run(status, id);
  res.json({ ok:true });
}));

// error handler
app.use((err, req, res, next) => {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed', details: err.issues });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.get('/', (req,res)=> res.send('API v2 is up'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API v2 running on http://localhost:${PORT}`));
