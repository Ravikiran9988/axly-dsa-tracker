import React from 'react';
import {
  Terminal,
  ArrowRight,
  Target,
  Trophy,
  Flame,
  Code2,
  CheckCircle2,
  BarChart3,
  Layers,
  Zap,
  BookOpen,
  Cpu,
  Sparkles,
  Play
} from 'lucide-react';

export default function LandingPage({ onNavigateToLogin }) {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 font-sans relative overflow-x-hidden">
      {/* Ambient Lighting / Atmospheric Gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[44rem] sm:w-[60rem] h-[32rem] bg-gradient-to-b from-cyan-500/15 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-24 right-0 w-[28rem] h-[28rem] bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 -left-24 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Subtle Grid Accent */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      {/* 2. Public Header Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070B14]/85 border-b border-slate-800/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-white tracking-tight font-mono">AXLY DSA TRACKER</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">
              How It Works
            </button>
            <button onClick={() => scrollToSection('curriculum')} className="hover:text-white transition-colors">
              Curriculum
            </button>
            <button onClick={() => scrollToSection('comparison')} className="hover:text-white transition-colors">
              Practice vs Challenge
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToLogin}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onNavigateToLogin}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-xs font-bold text-white transition-all shadow-md shadow-cyan-500/20 active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pattern-First DSA Practice</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
                Master DSA. <br />
                <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
                  Build Problem-Solving Instincts.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Practice the patterns that matter, solve curated problems, take daily challenges, and track your progress as you build real algorithmic confidence.
              </p>
            </div>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onNavigateToLogin}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all active:scale-[0.98]"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollToSection('curriculum')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-sm transition-all"
              >
                <span>Explore Curriculum</span>
              </button>
            </div>
          </div>

          {/* Right Hero Visual: Algorithmic Pattern / Code Preview */}
          <div className="lg:col-span-5 max-w-lg mx-auto lg:max-w-none w-full">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl transition-all group-hover:from-cyan-500/30 group-hover:to-indigo-500/30" />
              
              <div className="relative rounded-3xl bg-[#0A0F1D] border border-slate-800/90 shadow-2xl p-6 space-y-4 overflow-hidden">
                {/* Visual Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 font-medium">pattern: two-pointers</span>
                </div>

                {/* Algorithmic Representation */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60 text-slate-300 space-y-1.5">
                    <div className="text-[11px] text-slate-500">// Problem: Two Sum II · Target = 9</div>
                    <div className="flex items-center gap-2 text-cyan-300 font-bold">
                      <span>nums = [2, 7, 11, 15]</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                      <span className="text-emerald-400 font-semibold">left → 0 (val 2)</span>
                      <span className="text-indigo-400 font-semibold">right ← 3 (val 15)</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-400 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Sum: 2 + 7 = 9</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">Target Matched</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-500/20 flex items-center justify-between">
                    <span className="text-xs text-white font-sans font-semibold">Execution Evaluation</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">✓ All Tests Passed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Product Value / Core Features */}
      <section id="features" className="py-20 bg-[#060911] border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">Core Value</h2>
            <p className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">Everything You Need to Master DSA</p>
            <p className="text-sm text-slate-400">Built to maximize pattern recognition, conceptual clarity, and problem-solving speed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Curated Practice */}
            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Curated Practice</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                80 carefully selected problems across essential DSA topics, filtered by pattern and difficulty for deliberate practice.
              </p>
            </div>

            {/* Card 2: Pattern-First Learning */}
            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Pattern-First Learning</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Problems organized around recognizable algorithmic patterns so you learn transferable problem-solving strategies.
              </p>
            </div>

            {/* Card 3: Daily Challenge */}
            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 hover:border-amber-500/40 transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Daily Challenge</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                One daily challenge designed to build consistency, earn competitive points, and maintain your solving streak.
              </p>
            </div>

            {/* Card 4: Progress Tracking */}
            <div className="p-6 rounded-3xl bg-[#0A0F1D] border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Progress Tracking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                See solved problems, topic progress, difficulty distribution, and learning progress on your personal dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Practice vs Daily Challenge Comparison */}
      <section id="comparison" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">Structured Paths</h2>
          <p className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">Practice Your Way. Challenge Yourself Every Day.</p>
          <p className="text-sm text-slate-400">Two dedicated modes designed for distinct learning objectives.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Self-Paced Practice */}
          <div className="p-8 rounded-3xl bg-[#0A0F1D] border border-slate-800 space-y-6 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono text-sm">SELF-PACED PRACTICE</h3>
                <p className="text-xs text-slate-400">Deep conceptual understanding & pattern mastery</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>80 curated problems</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Topic and pattern-based discovery</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Solve at your own pace</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Personal progress tracking</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>No competitive pressure</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>0 competitive points</span>
              </li>
            </ul>
          </div>

          {/* Right: Daily Challenge */}
          <div className="p-8 rounded-3xl bg-[#0A0F1D] border border-slate-800 space-y-6 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono text-sm">DAILY CHALLENGE</h3>
                <p className="text-xs text-slate-400">Daily consistency, problem solving & rankings</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>One daily challenge</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Build a consistent solving streak</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Competitive scoring (+100 pts)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Global leaderboard</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Designed for consistency and challenge</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Curriculum Section */}
      <section id="curriculum" className="py-20 bg-[#060911] border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">Targeted Curriculum</h2>
            <p className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">An 80-Problem Curriculum Built Around Core DSA</p>
            <p className="text-sm text-slate-400">Organized around controlled algorithmic patterns to ensure full coverage of foundational problem types.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { topic: 'Arrays', count: 12 },
              { topic: 'Strings', count: 10 },
              { topic: 'Hashing', count: 8 },
              { topic: 'Two Pointers / Sliding Window', count: 10 },
              { topic: 'Stack', count: 8 },
              { topic: 'Binary Search', count: 8 },
              { topic: 'Trees', count: 12 },
              { topic: 'Dynamic Programming', count: 12 }
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-white">{item.topic}</span>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-xs font-extrabold">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">Simple Process</h2>
            <p className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">How It Works</p>
            <p className="text-sm text-slate-400">Get started in minutes and track your path to mastery.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-7 rounded-3xl bg-[#0A0F1D] border border-slate-800 space-y-3.5">
              <div className="text-2xl font-black font-mono text-cyan-400">01</div>
              <h3 className="text-base font-bold text-white">Sign In</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Create your Axly account securely in one click.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#0A0F1D] border border-slate-800 space-y-3.5">
              <div className="text-2xl font-black font-mono text-indigo-400">02</div>
              <h3 className="text-base font-bold text-white">Practice & Solve</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose curated problems or take today's challenge and solve them directly in the browser.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#0A0F1D] border border-slate-800 space-y-3.5">
              <div className="text-2xl font-black font-mono text-emerald-400">03</div>
              <h3 className="text-base font-bold text-white">Track Progress</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Understand your growth across topics and difficulty levels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Code Practice */}
      <section className="py-20 bg-[#060911] border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">In-Browser Coding</h2>
            <p className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">Write. Run. Improve.</p>
            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Practice coding directly in the browser across multiple programming languages. Test your solutions against public test cases and inspect execution outputs before submitting.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#0A0F1D] border border-slate-800 font-semibold text-slate-300">
              Interactive Code Editor
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0A0F1D] border border-slate-800 font-semibold text-slate-300">
              Run Test Cases
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0A0F1D] border border-slate-800 font-semibold text-slate-300">
              Instant Feedback
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0A0F1D] border border-slate-800 font-semibold text-slate-300">
              Multiple Languages
            </div>
          </div>
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-r from-[#0C1425] via-[#121E3D] to-[#0C1425] border border-cyan-900/40 shadow-2xl space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Master DSA?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Start solving smarter with structured, pattern-first practice.
          </p>
          <button
            onClick={onNavigateToLogin}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all active:scale-95"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
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
            <button onClick={onNavigateToLogin} className="hover:text-slate-300 transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
