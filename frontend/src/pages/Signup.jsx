import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Terminal, ArrowRight, AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

export default function Signup({ onNavigate, onBackToHome }) {
  const { loginWithGoogle, signupWithEmail, verifyOtp, resendOtp, error: authError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // OTP Verification Step state
  const [step, setStep] = useState('register'); // 'register' | 'otp'
  const [otp, setOtp] = useState('');
  const [resendStatus, setResendStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
  const [resendTimer, setResendTimer] = useState(0);

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasLength && hasUpper && hasLower && hasNumber;

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signupWithEmail({ name: name.trim(), email: email.trim(), password });
      setStep('otp');
      setResendTimer(30);
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await verifyOtp({ email: email.trim(), otp: otp.trim() });
      // Authenticated user state updates automatically in AuthContext, redirecting to Dashboard
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      setResendStatus('sending');
      setError(null);
      await resendOtp({ email: email.trim() });
      setResendStatus('sent');
      setResendTimer(60);
    } catch (err) {
      setResendStatus('error');
      setError(err.message || 'Failed to resend verification code.');
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text1 flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative overflow-y-auto overflow-x-hidden font-sans">
      {/* Ambient Background - Subtle */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none opacity-50 dark:opacity-30" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f293d08_1px,transparent_1px),linear-gradient(to_bottom,#1f293d08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none dark:opacity-50" />

      {/* Top back navigation */}
      <div className="absolute top-6 left-4 sm:top-6 sm:left-8 z-20">
        <button
          onClick={step === 'otp' ? () => setStep('register') : onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-theme-text2 hover:text-theme-text1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{step === 'otp' ? 'Back to Registration' : 'Back to Home'}</span>
        </button>
      </div>

      {/* Clean Signup Card */}
      <div className="w-full max-w-[380px] relative z-10 mb-8 sm:mb-16">
        <div className="rounded-2xl bg-theme-surface border border-theme-border shadow-sm p-6 sm:p-8">
          
          {step === 'otp' ? (
            /* OTP VERIFICATION VIEW */
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-md mx-auto mb-4 text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold tracking-wider text-cyan-500 uppercase block mb-1">Verification Code</span>
                <h1 className="text-2xl font-bold text-theme-text1 tracking-tight mb-1">Enter your OTP</h1>
                <p className="text-sm text-theme-text2">
                  We've sent a 6-digit code to <strong className="text-theme-text1">{email}</strong>.
                </p>
              </div>

              {/* Error Banner */}
              {(error || authError) && (
                <div id="otp-error-msg" className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error || authError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-theme-text1 text-center block">6-Digit Verification Code</label>
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-center font-mono text-xl tracking-[0.4em] font-bold text-theme-text1 placeholder-theme-text3 transition-all"
                  />
                  <p className="text-[11px] text-theme-text3 text-center mt-1">Code expires in 10 minutes</p>
                </div>

                <button
                  id="btn-verify-otp"
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>{loading ? 'Verifying Code…' : 'Confirm & Complete'}</span>
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              {/* Resend OTP Actions */}
              <div className="pt-4 border-t border-theme-border flex items-center justify-between text-[13px]">
                <span className="text-theme-text2">Didn't receive code?</span>
                <button
                  id="btn-resend-otp"
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || resendStatus === 'sending'}
                  className="font-medium text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 disabled:text-theme-text3 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendStatus === 'sending' ? 'animate-spin' : ''}`} />
                  <span>
                    {resendTimer > 0
                      ? `Resend in ${resendTimer}s`
                      : resendStatus === 'sent'
                      ? 'Code Sent Again!'
                      : 'Resend Code'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* REGISTRATION FORM VIEW */
            <>
              {/* Brand Header */}
              <div className="text-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-md mx-auto mb-4 text-white">
                  <Terminal className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-bold text-theme-text1 tracking-tight mb-1">Create account</h1>
                <p className="text-sm text-theme-text2">Start mastering DSA with structured practice.</p>
              </div>

              {/* Error state */}
              {(error || authError) && (
                <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error || authError}</span>
                </div>
              )}

              <div className="space-y-5">
                {/* Google OAuth Button */}
                <button
                  id="google-signin-btn"
                  onClick={handleGoogleSignup}
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

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-theme-text1">Full Name</label>
                    <input
                      id="signup-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-theme-bg border border-theme-border focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-sm text-theme-text1 placeholder-theme-text3 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-theme-text1">Email Address</label>
                    <input
                      id="signup-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-theme-bg border border-theme-border focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-sm text-theme-text1 placeholder-theme-text3 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-theme-text1">Password</label>
                    <div className="relative">
                      <input
                        id="signup-password-input"
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

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-theme-text1">Confirm Password</label>
                    <div className="relative">
                      <input
                        id="signup-confirm-password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-theme-bg border border-theme-border focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-sm text-theme-text1 placeholder-theme-text3 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Requirements Checklist */}
                  <div className="p-3 rounded-xl bg-theme-bg border border-theme-border text-[11px] space-y-2 mt-2">
                    <div className="font-medium text-theme-text2">Password Requirements:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <span className={`flex items-center gap-1.5 ${hasLength ? 'text-cyan-500 dark:text-cyan-400' : 'text-theme-text3'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> 8+ characters
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-cyan-500 dark:text-cyan-400' : 'text-theme-text3'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Uppercase letter
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasLower ? 'text-cyan-500 dark:text-cyan-400' : 'text-theme-text3'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lowercase letter
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-cyan-500 dark:text-cyan-400' : 'text-theme-text3'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> At least 1 number
                      </span>
                    </div>
                  </div>

                  <button
                    id="btn-submit-signup"
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span>{loading ? 'Creating Account…' : 'Create Account'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                {/* Internal Footer Navigation */}
                <div className="pt-5 border-t border-theme-border text-center">
                  <p className="text-[13px] text-theme-text2">
                    Already have an account?{' '}
                    <button
                      onClick={() => onNavigate('login')}
                      className="text-cyan-500 font-semibold hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors ml-1"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
