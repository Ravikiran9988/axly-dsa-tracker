import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock3, Trophy, AlertCircle, Zap, Code2, ArrowRight, Flame, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { Spinner, ErrorState } from '../components/ui/index.jsx';

export default function DailyChallenge({ onSelectProblem }) {
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getDailyQuestion();
      setDaily(res.data || null);
    } catch (e) {
      setError(e.message || "Unable to load today's challenge");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-24 space-y-3">
        <Spinner size="md" />
        <p className="text-sm text-slate-500">Loading today's challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  if (!daily) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Daily Challenge</h1>
          <p className="text-sm text-slate-400 mt-0.5">Competitive · earn points · build your streak</p>
        </div>
        <div className="card p-12 flex flex-col items-center text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-600" strokeWidth={1.5} />
          <h2 className="text-base font-semibold text-slate-300">No challenge today yet</h2>
          <p className="text-sm text-slate-500 max-w-xs">A problem will appear here once your admin publishes the daily challenge.</p>
          <button onClick={load} className="btn-secondary btn-sm inline-flex items-center gap-1.5 mt-2">
            <RefreshCw className="w-3.5 h-3.5" /> Check again
          </button>
        </div>
      </div>
    );
  }

  const solved = ['solved', 'completed', 'approved'].includes(daily.submission_status);
  const inProgress = daily.submission_status === 'attempted';
  const todayUtc = new Date().toISOString().split('T')[0];
  const diffCls = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' }[String(daily.difficulty).toLowerCase()] || 'badge-neutral';

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Daily Challenge</h1>
          <p className="text-sm text-slate-400 mt-0.5">Competitive &middot; earn points &middot; build your streak</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="badge text-amber-400 bg-amber-500/10 border-amber-500/20">
            <Zap className="w-3.5 h-3.5" /> +100 pts
          </div>
          <div className="badge text-orange-400 bg-orange-500/10 border-orange-500/20">
            <Flame className="w-3.5 h-3.5" /> Streak
          </div>
        </div>
      </div>

      {/* Challenge card */}
      <div className={`card border-l-2 overflow-hidden ${solved ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
        <div className="p-6 space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={diffCls}>{daily.difficulty}</span>
            {daily.topic_name && <span className="badge badge-neutral">{daily.topic_name}</span>}
            {solved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Solved
              </span>
            )}
            {inProgress && (
              <span className="flex items-center gap-1 text-xs text-axly-400 font-semibold">
                <Clock3 className="w-3.5 h-3.5" /> In Progress
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{daily.title}</h2>
            <p className="text-xs text-slate-500 mt-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              {daily.date || todayUtc} UTC &middot; One problem for all students
            </p>
          </div>

          {/* Action */}
          <div className="flex items-center gap-3 pt-2">
            <button
              id="btn-start-daily-challenge"
              onClick={() => onSelectProblem(daily.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-bold transition-colors ${
                solved
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              <Code2 className="w-4 h-4" />
              {solved ? 'Review Solution' : inProgress ? 'Continue Solving' : 'Solve Challenge'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">How Daily Challenges work</h3>
        <ul className="space-y-2 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 shrink-0">✦</span>
            One challenge is published each day for all students simultaneously.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 shrink-0">✦</span>
            Successfully solving it earns +100 competitive points and extends your streak.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 shrink-0">✦</span>
            Points contribute to the Leaderboard. Practice problems do not.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 shrink-0">✦</span>
            Submit via Code Editor (auto-graded) or GitHub link (mentor review).
          </li>
        </ul>
      </div>
    </div>
  );
}
