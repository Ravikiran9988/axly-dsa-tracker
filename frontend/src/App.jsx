import React from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';
import { Loader2, Terminal } from 'lucide-react';

export default function App() {
  const { user, loading, logout, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C14]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-cyan-500/20">
            <Terminal className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Loading Axly DSA Platform...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Pure role-based layout separation
  if (isAdmin || user.role === 'admin') {
    return <AdminLayout user={user} onLogout={logout} />;
  }

  return <StudentLayout user={user} onLogout={logout} />;
}
