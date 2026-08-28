import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  Code2,
  Calendar,
  History,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Target,
  BarChart3,
  Layers,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';

export default function AdminDashboard({
  onOpenDailyModal,
  onOpenCreateModal,
  onOpenAssignModal,
  onSelectProblem,
  onNavigate
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminStats();
      setStats(res.data || {});
    } catch (err) {
      setError(err.message || 'Failed to load administrative analytics');
    } finally {
      setLoading(false);
    }
  }

  const learners = stats?.learners || { total: 0, active: 0 };
  const questions = stats?.questions || { total: 0, published: 0, draft: 0, by_difficulty: { easy: 0, medium: 0, hard: 0 }, by_topic: [] };
  const submissions = stats?.submissions || { total: 0, solved: 0, accuracy_rate: 0 };
  const todayChallenge = stats?.today_challenge || null;
  const recentActivity = stats?.recent_activity || [];

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const statusColors = {
    solved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    approved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    attempted: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    pending: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    under_review: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Platform Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Manage the Axly DSA learning platform, curate algorithmic questions, set daily challenges, and track learner growth.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/15 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>

          <button
            onClick={onOpenDailyModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-[0.98]"
          >
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Set Daily</span>
          </button>

          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadStats} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Learners */}
        <div
          onClick={() => onNavigate && onNavigate('admin-users')}
          className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Learners</span>
            <Users className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {learners.total}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{learners.active || learners.total} active this month</span>
          </div>
        </div>

        {/* DSA Questions */}
        <div
          onClick={() => onNavigate && onNavigate('admin-challenges')}
          className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>DSA Questions</span>
            <Code2 className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {questions.total}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {questions.published || questions.total} published &bull; {questions.draft || 0} drafts
          </div>
        </div>

        {/* Today's Challenge */}
        <div
          onClick={() => onNavigate && onNavigate('admin-daily')}
          className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Today's Challenge</span>
            <Calendar className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white truncate">
            {todayChallenge ? todayChallenge.title : 'No Daily Challenge'}
          </div>
          <div className="text-[11px]">
            {todayChallenge ? (
              <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[9px] border ${difficultyColors[todayChallenge.difficulty?.toLowerCase()] || ''}`}>
                {todayChallenge.difficulty}
              </span>
            ) : (
              <span className="text-amber-400 font-semibold text-[11px] underline">Click to set for today</span>
            )}
          </div>
        </div>

        {/* Total Submissions */}
        <div
          onClick={() => onNavigate && onNavigate('admin-submissions')}
          className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Submissions</span>
            <History className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {submissions.total}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {submissions.solved} solved ({submissions.accuracy_rate}%)
          </div>
        </div>
      </div>

      {/* Main Content 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Recent Submissions / Activity (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Recent Platform Activity</span>
                </h2>
                <p className="text-[11px] text-slate-400">Live submissions across all active learners.</p>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('admin-submissions')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs font-mono">Loading real-time submissions...</div>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No recent submissions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-mono text-[10px] uppercase">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Challenge</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300 text-xs">
                    {recentActivity.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">
                            {sub.user_name || sub.user_email?.split('@')[0]}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {sub.user_email}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-200 truncate max-w-[180px]">
                            {sub.question_title}
                          </div>
                          {sub.question_difficulty && (
                            <span className={`inline-block px-1.5 py-0.2 rounded font-bold uppercase text-[9px] border mt-0.5 ${difficultyColors[sub.question_difficulty?.toLowerCase()] || ''}`}>
                              {sub.question_difficulty}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold uppercase text-[10px] border ${statusColors[sub.status] || 'bg-slate-800 text-slate-300'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {sub.final_score !== null && sub.final_score !== undefined ? `${sub.final_score}/100` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400 font-mono text-[10px] whitespace-nowrap">
                          {sub.updated_at ? new Date(sub.updated_at).toLocaleDateString() : 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Today's Daily Challenge & Quick Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Today's Daily Challenge</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">UTC Today</span>
            </div>

            {todayChallenge ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded-md font-bold uppercase text-[9px] border ${difficultyColors[todayChallenge.difficulty?.toLowerCase()] || ''}`}>
                      {todayChallenge.difficulty}
                    </span>
                    <h3 className="text-sm font-bold text-white leading-snug">
                      {todayChallenge.title}
                    </h3>
                  </div>
                  <span className="text-cyan-400 font-bold text-xs shrink-0 font-mono">
                    {todayChallenge.points || 20} pts
                  </span>
                </div>

                {todayChallenge.topic_name && (
                  <div className="text-xs text-slate-400">
                    Topic: <span className="text-slate-200 font-medium">{todayChallenge.topic_name}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2 border-t border-slate-800/80">
                  <button
                    onClick={onOpenDailyModal}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Change Challenge
                  </button>
                  {onSelectProblem && todayChallenge.question_id && (
                    <button
                      onClick={() => onSelectProblem(todayChallenge.question_id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400"
                      title="Preview in workspace"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">No Challenge Set For Today</h4>
                  <p className="text-[11px] text-slate-400">Learners will see yesterday's problem until today's challenge is assigned.</p>
                </div>
                <button
                  onClick={onOpenDailyModal}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Set Today's Challenge
                </button>
              </div>
            )}
          </div>

          {/* Quick Management Links */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
              Admin Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={onOpenCreateModal}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>Create New Question</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={onOpenAssignModal}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <span>Assign Challenge to Students</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={() => onNavigate && onNavigate('admin-audit')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  <span>Inspect Audit Trail</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Question Distribution (Backed by Real API Data) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Difficulty Distribution */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Questions by Difficulty</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Total: {questions.total}</span>
          </div>

          <div className="space-y-3">
            {['easy', 'medium', 'hard'].map((diff) => {
              const count = questions.by_difficulty?.[diff] || 0;
              const pct = questions.total > 0 ? Math.round((count / questions.total) * 100) : 0;
              const barColors = {
                easy: 'bg-emerald-500',
                medium: 'bg-amber-500',
                hard: 'bg-rose-500'
              };

              return (
                <div key={diff} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${difficultyColors[diff]}`}>
                      {diff}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {count} questions ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className={`h-full ${barColors[diff]} rounded-full`} style={{ width: `${Math.max(4, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Topics Distribution */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Topic Curriculum Coverage</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Active Topics</span>
          </div>

          {questions.by_topic && questions.by_topic.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {questions.by_topic.slice(0, 6).map((top, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium truncate max-w-[140px]">{top.topic_name}</span>
                  <span className="text-cyan-400 font-mono font-bold">{top.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              No topic distributions available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
