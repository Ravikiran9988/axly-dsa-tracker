import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock3, Trophy, AlertCircle, Zap, Code2, ArrowRight, Flame, RefreshCw, Award } from 'lucide-react';
import { api } from '../services/api';
import { Spinner, ErrorState } from '../components/ui/index.jsx';
import { formatIstDate } from '../utils/dateUtils';

export default function DailyChallenge({ onSelectProblem }) {
  const [daily, setDaily] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [res, profRes] = await Promise.all([
        api.getTodayDailyChallenge().catch(() => api.getDailyQuestion()),
        api.getMyProfile().catch(() => ({ data: null }))
      ]);
      setDaily(res.data || null);
      setUserProfile(profRes.data || null);
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
        <p className="text-sm text-theme-text3">Loading today's challenge...</p>
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
          <h1 className="text-xl font-bold text-theme-text1 tracking-tight">Daily Challenge</h1>
          <p className="text-sm text-theme-text2 mt-0.5">Competitive &middot; earn points &middot; build your streak</p>
        </div>
        <div className="card p-12 flex flex-col items-center text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-600" strokeWidth={1.5} />
          <h2 className="text-base font-semibold text-theme-text2">No challenge scheduled for today yet.</h2>
          <p className="text-sm text-theme-text3 max-w-xs">A new competitive problem will appear here once scheduled by your admin.</p>
          <button onClick={load} className="btn-secondary btn-sm inline-flex items-center gap-1.5 mt-2">
            <RefreshCw className="w-3.5 h-3.5" /> Check again
          </button>
        </div>
      </div>
    );
  }

  const solved = ['solved', 'completed', 'approved'].includes(daily.submission_status);
  const inProgress = daily.submission_status === 'attempted';
  const displayDate = formatIstDate(daily.date || daily.scheduled_date);

  const diffStr = String(daily.difficulty || '').toLowerCase();
  const calculatedPoints = diffStr === 'hard' ? 150 : diffStr === 'medium' ? 100 : 50;
  const displayPoints = daily?.points ?? calculatedPoints;
  const diffCls = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' }[diffStr] || 'badge-neutral';

  const totalScore = userProfile?.stats?.total_score || userProfile?.points || 0;
  const lbScore = userProfile?.stats?.leaderboard_score || 0;
  const challengeStreak = daily?.dailyChallengeStreak ?? userProfile?.dailyChallengeStreak ?? userProfile?.stats?.dailyChallengeStreak ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-theme-text1 tracking-tight">Daily Challenge</h1>
          <p className="text-sm text-theme-text2 mt-0.5">Competitive &middot; earn points &middot; build your challenge streak</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="badge text-cyan-400 bg-cyan-500/10 border-cyan-500/20">
            <Zap className="w-3.5 h-3.5" /> +{displayPoints} pts
          </div>
          <div className="badge text-rose-400 bg-rose-500/10 border-rose-500/20" title="Consecutive days you've completed the Daily Challenge">
            <Flame className="w-3.5 h-3.5 fill-rose-400" /> {challengeStreak}d Challenge Streak
          </div>
        </div>
      </div>

      {/* Challenge card */}
      <div className={`rounded-xl border bg-theme-surface2 shadow-sm overflow-hidden transition-colors ${solved ? 'border-emerald-500/50' : 'border-theme-cyan'}`}>
        <div className="p-6 space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={diffCls}>{daily.difficulty}</span>
            {daily.topic_name && <span className="badge badge-neutral">{daily.topic_name}</span>}
            {daily.pattern_name && <span className="badge badge-neutral">{daily.pattern_name}</span>}
            {solved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Solved
              </span>
            )}
            {inProgress && (
              <span className="flex items-center gap-1 text-xs text-cyan-400 font-semibold">
                <Clock3 className="w-3.5 h-3.5" /> In Progress
              </span>
            )}
          </div>

          {/* Title & Description */}
          <div>
            <h2 className="text-2xl font-bold text-theme-text1 tracking-tight">{daily.title}</h2>
            {daily.description && (
              <p className="text-xs text-theme-text2 mt-2 leading-relaxed whitespace-pre-line line-clamp-3">
                {daily.description}
              </p>
            )}
            <p className="text-xs text-theme-text3 mt-2 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5" />
              <span>Challenge Date: {displayDate}</span>
            </p>
          </div>

          {/* Solved Rewards Banner */}
          {solved && (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ Challenge Solved</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-theme-text2">
                <div>+ {displayPoints} Daily Challenge Points</div>
                <div>+ 20 Streak Bonus</div>
                <div className="text-cyan-400 font-bold">Total Score: {totalScore} pts</div>
                <div className="text-amber-400 font-bold">Leaderboard: {lbScore} pts</div>
              </div>
            </div>
          )}

          {/* Action */}
          <div className="flex items-center gap-3 pt-2">
            <button
              id="btn-start-daily-challenge"
              onClick={() => onSelectProblem(daily.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 ${
                solved
                  ? 'bg-theme-surface3 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10'
                  : 'bg-gradient-to-r from-theme-cyan to-theme-indigo hover:from-cyan-400 hover:to-indigo-500 text-white border-0 shadow-cyan-500/20'
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
        <h3 className="text-sm font-semibold text-theme-text2">How Daily Challenge Scoring Works</h3>
        <ul className="space-y-2 text-xs text-theme-text2">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 shrink-0">✦</span>
            <strong>Difficulty-Based Points:</strong> Easy: +50 pts, Medium: +100 pts, Hard: +150 pts.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 shrink-0">✦</span>
            <strong>Leaderboard Score:</strong> Daily Challenge points directly drive competitive ranking. Practice points do not.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 shrink-0">✦</span>
            <strong>Streak Bonus:</strong> +20 streak points awarded per daily solve, contributing to your personal Total Score.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 shrink-0">✦</span>
            <strong>One-Time Award:</strong> Points are awarded once upon the first accepted submission.
          </li>
        </ul>
      </div>
    </div>
  );
}
