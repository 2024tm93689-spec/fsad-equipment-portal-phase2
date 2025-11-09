import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Requests from './pages/Requests';

function Protected({ children }) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/login'; return null; }
  return children;
}

export default function App(){
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/" element={<Protected><Dashboard/></Protected>} />
          <Route path="/admin" element={<Protected><Admin/></Protected>} />
          <Route path="/requests" element={<Protected><Requests/></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
