import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Requests(){
  const { user } = useAuth();
  const [items,setItems] = useState([]);
  const [requests,setRequests] = useState([]);
  const [form,setForm] = useState({ equipmentId:'', startDate:'', endDate:'' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(()=>{ api.get('/api/equipment').then(r=>setItems(r.data)); load(); },[]);
  const load = ()=> api.get('/api/requests').then(r=>setRequests(r.data));

  const create = async ()=>{
    setErr(''); setLoading(true);
    try{
      await api.post('/api/requests', { equipmentId:Number(form.equipmentId), startDate:form.startDate, endDate:form.endDate });
      setForm({ equipmentId:'', startDate:'', endDate:'' }); await load();
    }catch(e){ setErr(e.response?.data?.error || 'Failed to create'); }
    finally{ setLoading(false); }
  };

  const setStatus = async (id,status)=>{
    setErr(''); setLoading(true);
    try{ await api.patch(`/api/requests/${id}/status`, { status }); await load(); }
    catch(e){ setErr(e.response?.data?.error || 'Failed to update'); }
    finally{ setLoading(false); }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Borrow Requests</h1>
      {err && <div className="text-red-600">{err}</div>}

      {(user?.role==='student'||user?.role==='admin'||user?.role==='staff') && (
        <div className="space-x-2">
          <select className="border p-2" value={form.equipmentId} onChange={e=>setForm({...form, equipmentId:e.target.value})}>
            <option value="">Select equipment</option>
            {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
          </select>
          <input className="border p-2" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/>
          <input className="border p-2" type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/>
          <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={create} disabled={loading}>{loading?'Submitting…':'Request'}</button>
        </div>
      )}

      <table className="w-full border">
        <thead><tr className="bg-gray-100"><th className="p-2">Item</th><th>Requester</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {requests.map(r=>(
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.equipmentName}</td>
              <td>{r.requester}</td>
              <td>{r.startDate}</td>
              <td>{r.endDate}</td>
              <td className="capitalize">{r.status}</td>
              <td className="text-right p-2">
                {(user?.role==='staff'||user?.role==='admin') && (<>
                  <button className="bg-green-600 text-white px-2 py-1 mr-2 rounded" onClick={()=>setStatus(r.id,'approved')} disabled={loading}>Approve</button>
                  <button className="bg-yellow-600 text-white px-2 py-1 mr-2 rounded" onClick={()=>setStatus(r.id,'rejected')} disabled={loading}>Reject</button>
                  <button className="bg-gray-700 text-white px-2 py-1 rounded" onClick={()=>setStatus(r.id,'returned')} disabled={loading}>Returned</button>
                </>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <a className="inline-block bg-indigo-600 text-white px-3 py-2 rounded" href="/">Back</a>
    </div>
  );
}
