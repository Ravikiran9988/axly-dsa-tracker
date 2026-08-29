import React, { useState } from 'react';
import { api } from '../services/api';
import { Terminal, ArrowRight, AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function ResetPassword({ token, onNavigate, onBackToHome }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasLength && hasUpper && hasLower && hasNumber;

  const handleReset = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password does not meet the security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Missing password reset token. Please request a new link.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.resetPassword({ token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may be invalid or expired.');
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
            {success ? (
              <div className="text-center space-y-5 py-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Password reset complete</h1>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Your password has been updated successfully. You can now sign in with your new password.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('login')}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition"
                  >
                    Continue to Sign In
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
                    <h1 className="text-2xl font-bold text-white tracking-tight">Reset your password</h1>
                    <p className="text-xs text-slate-400">Choose a new secure password for your account.</p>
                  </div>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-slate-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-slate-500 transition"
                    />
                  </div>

                  {/* Requirements */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] space-y-1.5 text-slate-400">
                    <div className="font-semibold text-slate-300">Password Requirements:</div>
                    <div className="grid grid-cols-2 gap-1">
                      <span className={`flex items-center gap-1.5 ${hasLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> 8+ characters
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Uppercase letter
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lowercase letter
                      </span>
                      <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> At least 1 number
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span>{loading ? 'Resetting Password…' : 'Reset Password'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
