import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Admin(){
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name:'', category:'', condition:'', quantity:1 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = ()=> api.get('/api/equipment').then(r=>setItems(r.data));
  useEffect(()=>{ load(); },[]);

  const save = async ()=>{
    setErr(''); setLoading(true);
    try { await api.post('/api/equipment', {...form, quantity:Number(form.quantity)}); setForm({name:'',category:'',condition:'',quantity:1}); await load(); }
    catch(e){ setErr(e.response?.data?.error || 'Failed to add'); }
    finally{ setLoading(false); }
  };

  const remove = async (id)=>{
    setErr(''); setLoading(true);
    try { await api.delete(`/api/equipment/${id}`); await load(); }
    catch(e){ setErr(e.response?.data?.error || 'Failed to delete'); }
    finally{ setLoading(false); }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Admin • Manage Equipment</h1>
      {err && <div className="text-red-600">{err}</div>}
      <div className="space-x-2">
        <input className="border p-2" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <input className="border p-2" placeholder="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}/>
        <input className="border p-2" placeholder="Condition" value={form.condition} onChange={e=>setForm({...form, condition:e.target.value})}/>
        <input className="border p-2 w-24" type="number" placeholder="Qty" value={form.quantity} onChange={e=>setForm({...form, quantity:e.target.value})}/>
        <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={save} disabled={loading}>{loading?'Saving…':'Add'}</button>
      </div>
      <table className="w-full border">
        <thead><tr className="bg-gray-100"><th className="p-2">Name</th><th>Category</th><th>Condition</th><th>Qty</th><th></th></tr></thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className="border-t">
              <td className="p-2">{it.name}</td><td>{it.category}</td><td>{it.condition}</td><td>{it.quantity}</td>
              <td className="text-right p-2"><button className="bg-red-600 text-white px-3 py-1 rounded" onClick={()=>remove(it.id)} disabled={loading}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <a className="inline-block bg-indigo-600 text-white px-3 py-2 rounded" href="/">Back</a>
    </div>
  );
}
