import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Terminal, Shield, User, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#0B0F19]">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-axly-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-axly-600 to-cyan-400 shadow-xl shadow-axly-500/25 mb-4">
            <Terminal className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Axly DSA Tracker
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Structured daily practice, curriculum tracking, and habit mastery.
          </p>
          <div className="mt-2 flex items-center justify-center space-x-2">
            <span className="text-xs font-mono text-axly-400 bg-axly-500/10 px-2.5 py-0.5 rounded-full border border-axly-500/20">
              dsatracker.axly.in
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          {(error || authError) && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error || authError}</span>
            </div>
          )}

          {/* Primary Google OAuth Button */}
          <div>
            <button
              id="google-signin-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-2xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl active:scale-[0.99]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2 font-mono">
              Secured with Supabase Auth
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
              Quick Role Login (Dev/Demo)
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Quick Demo Switcher */}
          <div className="space-y-2.5">
            <button
              id="btn-login-user-alex"
              onClick={() => handleDevLogin('alex@example.com', 'user')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-axly-500/50 transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-axly-300">
                    Alex Mercer (Student / User)
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">alex@example.com</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-axly-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              id="btn-login-admin-axly"
              onClick={() => handleDevLogin('admin@axly.in', 'admin')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-purple-300">
                    Axly Admin (Mentor / Admin)
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">admin@axly.in</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
