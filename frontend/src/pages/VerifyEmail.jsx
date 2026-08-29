import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Terminal, ArrowRight, AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';

export default function VerifyEmail({ token: propToken, onNavigate, onBackToHome }) {
  const [token, setToken] = useState(propToken || '');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState(null);

  useEffect(() => {
    // If token not provided in props, extract from query string
    let activeToken = propToken;
    if (!activeToken && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      activeToken = params.get('token');
    }

    if (activeToken) {
      setToken(activeToken);
      verify(activeToken);
    } else {
      setLoading(false);
      setError('No verification token provided. Please check the link in your email.');
    }
  }, [propToken]);

  const verify = async (t) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyEmail({ token: t });
      if (res.token) {
        localStorage.setItem('axly_auth_token', res.token);
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Verification link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    try {
      setResendStatus('sending');
      await api.resendVerification({ email: resendEmail.trim() });
      setResendStatus('sent');
    } catch (err) {
      setResendStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top back navigation */}
      <div className="w-full max-w-md mb-6 relative z-10">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-3xl blur-xl transition-all" />

          <div className="relative rounded-3xl bg-[#0A0F1D] border border-slate-800/90 shadow-2xl p-8 sm:p-10 space-y-6 text-center">
            {loading ? (
              <div className="space-y-4 py-8">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
                <h1 className="text-xl font-bold text-white">Verifying your email…</h1>
                <p className="text-xs text-slate-400">Please wait while we confirm your account activation.</p>
              </div>
            ) : success ? (
              <div className="space-y-5 py-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Email Verified!</h1>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Your email address has been successfully verified. You're ready to start practicing.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.location.href = '/';
                      }
                    }}
                    className="w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 py-2">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-xl font-bold text-white tracking-tight">Verification Failed</h1>
                  <p className="text-xs text-rose-400 font-medium">{error}</p>
                </div>

                <div className="pt-2 text-left border-t border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-300">Request a new verification link</div>
                  <form onSubmit={handleResend} className="space-y-2">
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs text-white placeholder-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={resendStatus === 'sending'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-xs font-semibold text-white transition"
                    >
                      {resendStatus === 'sent' ? 'Verification Sent!' : resendStatus === 'sending' ? 'Sending…' : 'Send New Link'}
                    </button>
                  </form>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('login')}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
