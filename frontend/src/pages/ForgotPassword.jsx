import React, { useState } from 'react';
import { api } from '../services/api';
import { Terminal, ArrowRight, AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';

export default function ForgotPassword({ onNavigate, onBackToHome }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to process your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-10 left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top back navigation */}
      <div className="w-full max-w-md mb-6 relative z-10">
        <button
          onClick={() => onNavigate('login')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </button>
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-3xl blur-xl transition-all" />

          <div className="relative rounded-3xl bg-[#0A0F1D] border border-slate-800/90 shadow-2xl p-7 sm:p-9 space-y-6">
            {submitted ? (
              <div className="text-center space-y-5 py-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <Mail className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Check your inbox</h1>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    If an account exists for <strong className="text-white">{email}</strong>, a password reset link has been sent.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('login')}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-xs font-bold text-white transition"
                  >
                    Return to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-cyan-500/25 mx-auto">
                    <Terminal className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Forgot your password?</h1>
                    <p className="text-xs text-slate-400">Enter your email address and we'll send you a link to reset your password.</p>
                  </div>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-slate-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span>{loading ? 'Sending link…' : 'Send Reset Link'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="text-center pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => onNavigate('login')}
                    className="text-xs text-cyan-400 font-semibold hover:text-cyan-300 transition"
                  >
                    Back to Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
