import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Terminal, ArrowRight, AlertCircle, Target, Trophy, Flame, UserCheck, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { loginWithGoogle, devLogin, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginWithGoogle();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (email, role) => {
    try {
      setLoading(true);
      setError(null);
      await devLogin(email, role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#080C14]">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d0a_1px,transparent_1px),linear-gradient(to_bottom,#1f293d0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-lg space-y-8 relative z-10 py-10">
        <div className="text-center space-y-3">
          <div className="inline-flex relative group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-cyan-500/25 mx-auto transition-transform duration-300 group-hover:scale-105">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-75 transition duration-300 pointer-events-none" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">Axly DSA Tracker</h1>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">Master Data Structures & Algorithms with structured curriculum, daily challenges, and real-time progress.</p>
          </div>
          <span className="inline-block text-xs font-mono font-medium text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">dsatracker.axly.in</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur"><Flame className="w-4 h-4 text-amber-400 mx-auto mb-1" /><p className="text-[11px] font-medium text-slate-300">Daily Practice</p></div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur"><Target className="w-4 h-4 text-cyan-400 mx-auto mb-1" /><p className="text-[11px] font-medium text-slate-300">Curriculum Path</p></div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur"><Trophy className="w-4 h-4 text-emerald-400 mx-auto mb-1" /><p className="text-[11px] font-medium text-slate-300">Skill Mastery</p></div>
        </div>

        <div className="glass-panel p-7 sm:p-8 rounded-3xl border border-slate-800/80 shadow-2xl space-y-6">
          {(error || authError) && <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2.5"><AlertCircle className="w-4 h-4 shrink-0" /><span className="font-medium">{error || authError}</span></div>}
          
          <div className="space-y-3">
            <button id="google-signin-btn" onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center space-x-3 px-4 py-3.5 rounded-2xl bg-white text-slate-900 font-semibold hover:bg-slate-50 active:scale-[0.99] transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed">
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
              <span>{loading ? 'Signing in…' : 'Continue with Google'}</span><ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#080C14] px-2 text-slate-500 font-mono text-[10px]">Or quick dev login</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-login-user-alex"
                type="button"
                onClick={() => handleDevLogin('alex@example.com', 'user')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-semibold hover:text-white transition-all"
              >
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>Student Login</span>
              </button>

              <button
                id="btn-login-admin-axly"
                type="button"
                onClick={() => handleDevLogin('admin@axly.in', 'admin')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-500/50 text-slate-200 text-xs font-semibold hover:text-white transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>Admin Login</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
