import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Terminal, ArrowRight, AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react';

export default function Login({ onNavigate, onBackToHome }) {
  const { loginWithGoogle, loginWithEmail, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resendStatus, setResendStatus] = useState(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUnverifiedEmail(null);
      await loginWithEmail(email.trim(), password);
    } catch (err) {
      if (err.code === 'UNVERIFIED_EMAIL') {
        setUnverifiedEmail(email.trim());
        setError('Please verify your email before signing in.');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    try {
      setResendStatus('sending');
      await api.resendVerification({ email: unverifiedEmail });
      setResendStatus('sent');
    } catch (err) {
      setResendStatus('error');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-theme-bg text-theme-text1 flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative overflow-y-auto overflow-x-hidden font-sans">
      {/* Ambient Background - Subtle */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none opacity-50 dark:opacity-30" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f293d08_1px,transparent_1px),linear-gradient(to_bottom,#1f293d08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none dark:opacity-50" />

      {/* Top back navigation */}
      <div className="absolute top-6 left-4 sm:top-6 sm:left-8 z-20">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-theme-text2 hover:text-theme-text1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Clean Login Card */}
      <div className="w-full max-w-[380px] relative z-10 mb-8 sm:mb-16">
        <div className="rounded-2xl bg-theme-surface border border-theme-border shadow-sm p-6 sm:p-8">
          
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-md mx-auto mb-4">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-theme-text1 tracking-tight mb-1">Welcome back</h1>
            <p className="text-sm text-theme-text2">Sign in to continue your DSA journey.</p>
          </div>

          {/* Error state */}
          {(error || authError) && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error || authError}</span>
              </div>
              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendStatus === 'sending' || resendStatus === 'sent'}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-300 hover:underline flex items-center gap-1 mt-1 ml-6"
                >
                  <Mail className="w-3 h-3" />
                  <span>{resendStatus === 'sent' ? 'Verification email sent!' : resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}</span>
                </button>
              )}
            </div>
          )}

          <div className="space-y-5">
            {/* Google OAuth Button */}
            <button
              id="google-signin-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-theme-bg border border-theme-border hover:bg-theme-surface2 text-theme-text1 font-semibold text-sm transition-colors shadow-sm active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* OR Divider */}
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-theme-border" />
              <span className="shrink-0 px-3 text-[10px] uppercase font-bold tracking-wider text-theme-text3">Or with email</span>
              <div className="flex-grow border-t border-theme-border" />
            </div>

            {/* Email + Password Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-theme-text1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-bg border border-theme-border focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-sm text-theme-text1 placeholder-theme-text3 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-theme-text1">Password</label>
                  <button
                    type="button"
                    onClick={() => onNavigate('forgot-password')}
                    className="text-[13px] font-medium text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-theme-bg border border-theme-border focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-sm text-theme-text1 placeholder-theme-text3 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text3 hover:text-theme-text2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{loading ? 'Signing In…' : 'Sign In'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Internal Footer Navigation */}
            <div className="pt-5 border-t border-theme-border text-center">
              <p className="text-[13px] text-theme-text2">
                Don't have an account?{' '}
                <button
                  onClick={() => onNavigate('signup')}
                  className="text-cyan-500 font-semibold hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors ml-1"
                >
                  Create account
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
