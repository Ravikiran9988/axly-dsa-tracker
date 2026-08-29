import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Terminal,
  ArrowRight,
  AlertCircle,
  Target,
  Trophy,
  Flame,
  Code,
  CheckCircle2,
  BarChart3,
  Layers,
  Zap,
  Lock,
  Cpu
} from 'lucide-react';

export default function Login() {
  const { loginWithGoogle, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 font-sans relative overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[40rem] sm:w-[54rem] h-[30rem] bg-gradient-to-b from-cyan-600/15 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-20 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 -left-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Subtle Grid Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      {/* Public Header Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070B14]/80 border-b border-slate-800/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-tight">Axly DSA Tracker</span>
              <span className="text-[10px] font-mono text-cyan-400">Algorithmic Practice Platform</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">
              How It Works
            </button>
            <button onClick={() => scrollToSection('curriculum')} className="hover:text-white transition-colors">
              Curriculum (80 Problems)
            </button>
            <button onClick={() => scrollToSection('comparison')} className="hover:text-white transition-colors">
              Practice vs Challenge
            </button>
          </nav>

          <div>
            <button
              onClick={() => scrollToSection('auth-card')}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/60 text-xs font-semibold text-white hover:bg-slate-800 transition-all shadow-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pattern-First DSA Practice for Engineers</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
                Master DSA. <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
                  Build Problem-Solving Instincts.
                </span> <br className="hidden sm:inline" />
                Track Real Progress.
              </h1>
              <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                A structured, high-signal DSA platform featuring an 80-problem curated curriculum, daily competitive challenges, in-browser execution across 6 programming languages, and precision mastery analytics.
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur">
                <div className="text-xl font-bold text-white font-mono">80</div>
                <div className="text-[11px] text-slate-400 font-medium">Curated Problems</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur">
                <div className="text-xl font-bold text-cyan-400 font-mono">8</div>
                <div className="text-[11px] text-slate-400 font-medium">Core Topics</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur">
                <div className="text-xl font-bold text-indigo-400 font-mono">14</div>
                <div className="text-[11px] text-slate-400 font-medium">Algorithmic Patterns</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur">
                <div className="text-xl font-bold text-emerald-400 font-mono">6</div>
                <div className="text-[11px] text-slate-400 font-medium">Languages</div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Authentication Card */}
          <div id="auth-card" className="lg:col-span-5 max-w-md mx-auto lg:max-w-none w-full">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-3xl blur-xl transition-all group-hover:from-cyan-500/30 group-hover:to-indigo-500/30" />
              
              <div className="relative rounded-3xl bg-[#0A0F1D] border border-slate-800/90 shadow-2xl p-7 sm:p-9 space-y-6">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow-md">
                    <Lock className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Start Learning with Axly</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sign in securely with your Google account to access your personal dashboard, 80 curated problems, and daily challenges.
                  </p>
                </div>

                {(error || authError) && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{error || authError}</span>
                  </div>
                )}

                <div className="space-y-4 pt-1">
                  <button
                    id="google-signin-btn"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3.5 px-5 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-semibold text-sm transition-all shadow-lg hover:shadow-cyan-500/10 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0A0F1D] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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
                    <span>{loading ? 'Authenticating…' : 'Continue with Google'}</span>
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-[11px] text-slate-500 font-medium">
                      Enterprise-grade authentication with Google OAuth 2.0. No password required.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Section: Core Features */}
      <section id="features" className="py-20 bg-[#060911] border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">Production Capabilities</h2>
            <p className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">Everything You Need to Excel in DSA</p>
            <p className="text-sm text-slate-400">Focused, production-tested features built for deep conceptual retention and interview readiness.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: Practice Bank */}
            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">80 Curated Practice Bank</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hand-picked problems covering 14 core patterns across Arrays, Trees, Dynamic Programming, and more. Self-paced with zero competitive stress.
              </p>
            </div>

            {/* Feature 2: Daily Challenge */}
            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 hover:border-amber-500/40 transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Competitive Daily Challenge</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                One global algorithmic problem every UTC day. Maintain your streak, earn 100 points per solve, and compete on the global leaderboard.
              </p>
            </div>

            {/* Feature 3: In-Browser Code Runner */}
            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">6-Language Sandboxed Runner</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Write and test code in JavaScript, Python 3, TypeScript, Java, C++, and C with standard input/output support and execution limits.
              </p>
            </div>

            {/* Feature 4: Analytics */}
            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Mastery Analytics</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track topic-by-topic completion rates, difficulty distributions (Easy, Medium, Hard), and inspect detailed submission audit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Practice vs Daily Challenge Comparison */}
      <section id="comparison" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">Clear Separation</h2>
          <p className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">Practice vs. Daily Challenge</p>
          <p className="text-sm text-slate-400">Understand the deliberate product distinction between self-paced mastery and competitive scoring.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Practice Track */}
          <div className="p-8 rounded-3xl bg-[#0A0F1D] border border-slate-800 space-y-6 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Self-Paced Practice Library</h3>
                <p className="text-xs text-slate-400">Deep conceptual understanding & pattern recognition</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>80 curated problems</strong> structured across 8 essential topics.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>0 competitive points</strong>: Dedicated to low-stress, self-paced mastery.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Full lifecycle: Start, Continue, Review, and Abandon anytime.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Does not impact Daily Challenge streaks or global leaderboard ranking.</span>
              </li>
            </ul>
          </div>

          {/* Daily Challenge Track */}
          <div className="p-8 rounded-3xl bg-[#0A0F1D] border border-slate-800 space-y-6 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Competitive Daily Challenge</h3>
                <p className="text-xs text-slate-400">Consistency, streaks & competitive rankings</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>1 global challenge</strong> released every UTC midnight.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>+100 competitive points</strong> awarded upon first successful solution.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Maintains consecutive active day solve streaks.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Directly powers the global all-time and periodic leaderboards.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section: How It Works */}
      <section id="how-it-works" className="py-20 bg-[#060911] border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">Workflow</h2>
            <p className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">How Axly Works</p>
            <p className="text-sm text-slate-400">A streamlined three-step journey to algorithmic proficiency.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 space-y-4">
              <div className="text-2xl font-black font-mono text-cyan-400/60">01</div>
              <h3 className="text-base font-bold text-white">Sign In with Google</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect seamlessly in one click with your Google credentials. Your progress and submissions are securely stored under your user profile.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 space-y-4">
              <div className="text-2xl font-black font-mono text-indigo-400/60">02</div>
              <h3 className="text-base font-bold text-white">Practice & Solve</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select problems by pattern or take on today's Daily Challenge. Write, run, and evaluate your solution in the in-platform code editor.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 space-y-4">
              <div className="text-2xl font-black font-mono text-emerald-400/60">03</div>
              <h3 className="text-base font-bold text-white">Track Progress</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect your topic mastery, difficulty breakdown, and streak metrics on your interactive student dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Curriculum Overview */}
      <section id="curriculum" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">Curriculum Distribution</h2>
          <p className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">80 Hand-Crafted Problems</p>
          <p className="text-sm text-slate-400">Engineered to cover essential DSA foundations without unnecessary filler.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { topic: 'Arrays', count: 12, pattern: 'Prefix Sum, Kadane, Lookup' },
            { topic: 'Strings', count: 10, pattern: 'Sliding Window, Anagrams' },
            { topic: 'Hashing', count: 8, pattern: 'Hash Map Lookup, Counting' },
            { topic: 'Two Pointers / Sliding Window', count: 10, pattern: 'Two Pointers, Fast & Slow' },
            { topic: 'Stack', count: 8, pattern: 'Monotonic Stack, Validation' },
            { topic: 'Binary Search', count: 8, pattern: 'Search on Answer, Bounds' },
            { topic: 'Trees', count: 12, pattern: 'BFS Level Order, DFS, Recursion' },
            { topic: 'Dynamic Programming', count: 12, pattern: '1D DP, 2D DP, Subsequences' }
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{item.topic}</span>
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[11px] font-bold">
                  {item.count}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{item.pattern}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800/80 bg-[#050810] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-300">Axly DSA Tracker</span>
          </div>
          <p>© {new Date().getFullYear()} Axly DSA Tracker. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => scrollToSection('features')} className="hover:text-slate-300 transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-slate-300 transition-colors">
              How It Works
            </button>
            <button onClick={() => scrollToSection('auth-card')} className="hover:text-slate-300 transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
