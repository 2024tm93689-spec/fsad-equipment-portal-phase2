import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(()=>{
    setLoading(true);
    api.get('/api/equipment')
      .then(r=>setItems(r.data))
      .catch(e=>setErr(e.message || 'Failed to load'))
      .finally(()=>setLoading(false));
  },[]);

  const filtered = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()) || i.category.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Equipment</h1>
        <div className="text-sm">{user?.email} • <span className="capitalize">{user?.role}</span>
          <button className="ml-3 underline" onClick={()=>{ logout(); window.location.href='/login'; }}>Logout</button>
        </div>
      </div>

      {err && <div className="text-red-600">{err}</div>}
      {loading ? <div>Loading…</div> : (
        <>
          <input className="border p-2" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(it => (
              <div key={it.id} className="border p-4 rounded">
                <div className="font-semibold">{it.name}</div>
                <div className="text-sm">{it.category} • {it.condition}</div>
                <div className="text-sm">Qty: {it.quantity} • Available: {it.available}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {user?.role === 'admin' && <a className="bg-green-600 text-white px-3 py-2 rounded inline-block" href="/admin">Admin Panel</a>}
      <a className="bg-indigo-600 text-white px-3 py-2 rounded inline-block ml-2" href="/requests">Requests</a>
    </div>
  );
}
