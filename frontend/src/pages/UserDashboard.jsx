import React, { useState, useEffect } from 'react';
import {
  Calendar, Flame, Trophy, Compass, CheckCircle2, ArrowRight, Zap,
  TrendingUp, Clock, BookOpen, Code2, AlertTriangle, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { practiceApi } from '../services/practiceApi';
import { Skeleton, DifficultyBadge, ErrorState } from '../components/ui/index.jsx';
import DailyQuestionCard from '../components/DailyQuestionCard';

export default function UserDashboard({ user, onNavigate, onOpenChallenge }) {
  const [dailyData, setDailyData] = useState(null);
  const [practiceProgress, setPracticeProgress] = useState(null);
  const [recentProblems, setRecentProblems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [dailyRes, practiceRes, analyticsRes] = await Promise.allSettled([
        api.getDailyQuestion(),
        practiceApi.getProgress(),
        api.getUserAnalytics()
      ]);
      if (dailyRes.status === 'fulfilled') setDailyData(dailyRes.value);
      if (practiceRes.status === 'fulfilled') setPracticeProgress(practiceRes.value.data || practiceRes.value);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data || analyticsRes.value);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  const totalSolved = practiceProgress?.problems_solved || analytics?.summary?.solved_submissions || analytics?.problems_solved || 0;
  const individualStreak = user?.individualStreak ?? analytics?.summary?.individualStreak ?? user?.streak ?? 1;
  const dailyChallengeStreak = user?.dailyChallengeStreak ?? analytics?.summary?.dailyChallengeStreak ?? dailyQuestion?.dailyChallengeStreak ?? 0;
  const totalPoints = user?.points || analytics?.summary?.total_score || analytics?.total_points || 0;
  const dailyQuestion = dailyData?.data || dailyData;
  const dailySolved = dailyQuestion?.submission_status === 'solved' || dailyQuestion?.is_solved;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate('daily')} className="btn-primary btn-sm inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Daily Challenge
          </button>
          <button onClick={() => onNavigate('available')} className="btn-secondary btn-sm inline-flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" /> Practice
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadDashboard} />}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Problems Solved', value: loading ? '—' : totalSolved, icon: CheckCircle2, color: 'text-emerald-400', desc: 'Total problems completed' },
          { label: 'Individual Streak', value: loading ? '—' : `${individualStreak}d`, icon: Zap, color: 'text-amber-400', desc: "Consecutive days you've logged in to AXLY." },
          { label: 'Challenge Streak', value: loading ? '—' : `${dailyChallengeStreak}d`, icon: Flame, color: 'text-rose-400', desc: "Consecutive days you've completed the Daily Challenge." },
          { label: 'Total Score', value: loading ? '—' : totalPoints, icon: Award, color: 'text-cyan-400', desc: 'Practice + Daily + Streak bonus' },
          { label: 'Leaderboard', value: loading ? '—' : analytics?.rank ? `#${analytics.rank}` : '#1', icon: Trophy, color: 'text-violet-400', desc: 'Rank by Daily Challenge points' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex flex-col justify-between hover:border-slate-700 transition-colors" title={s.desc}>
            <div className="text-xs text-slate-400 font-medium mb-1 truncate">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color} flex items-center gap-2`}>
              {loading ? <Skeleton className="h-7 w-16" /> : (
                <>
                  <s.icon className="w-5 h-5 opacity-85" />
                  <span>{s.value}</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Daily Challenge (visually distinct: amber accent) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <h2 className="text-sm font-semibold text-white">Today's Challenge</h2>
            <span className="badge badge-neutral text-[10px]">Competitive · points</span>
          </div>
          <button onClick={() => onNavigate('daily')} className="btn-ghost btn-sm inline-flex items-center gap-1">
            View <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="card p-5 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-32 mt-2" />
          </div>
        ) : (
          <DailyQuestionCard
            dailyData={dailyData}
            onOpenInPlatform={() => onOpenChallenge && onOpenChallenge(dailyQuestion?.id)}
          />
        )}
      </section>

      {/* Practice section */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-axly-500" />
            <h2 className="text-sm font-semibold text-white">Practice Library</h2>
            <span className="badge badge-neutral text-[10px]">Self-paced · 0 pts</span>
          </div>
          <button onClick={() => onNavigate('available')} className="btn-ghost btn-sm inline-flex items-center gap-1">
            All problems <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {loading ? (
          <div className="card divide-y divide-[#1a2540]">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-7 w-20 ml-4" />
              </div>
            ))}
          </div>
        ) : practiceProgress ? (
          <div className="card overflow-hidden">
            {/* Progress summary */}
            <div className="px-5 py-3 border-b border-[#1a2540] flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-400">{practiceProgress.problems_solved || 0} solved</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">{practiceProgress.total_problems || practiceProgress.problems_total || '?'} total</span>
              </div>
              {(practiceProgress.total_problems || 1) > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-32 h-1.5 bg-[#1a2540] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-axly-500 rounded-full"
                      style={{ width: `${Math.round(((practiceProgress.problems_solved || 0) / (practiceProgress.total_problems || practiceProgress.problems_total || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {Math.round(((practiceProgress.problems_solved || 0) / (practiceProgress.total_problems || practiceProgress.problems_total || 1)) * 100)}%
                  </span>
                </div>
              )}
            </div>
            {/* Difficulty breakdown */}
            <div className="grid grid-cols-3 divide-x divide-[#1a2540]">
              {[
                { label: 'Easy',   key: 'easy_solved',   total: 'easy_total',   cls: 'text-emerald-400' },
                { label: 'Medium', key: 'medium_solved',  total: 'medium_total', cls: 'text-amber-400' },
                { label: 'Hard',   key: 'hard_solved',    total: 'hard_total',   cls: 'text-rose-400' },
              ].map(d => (
                <div key={d.label} className="p-4 text-center">
                  <div className={`text-lg font-bold ${d.cls}`}>
                    {practiceProgress[d.key] || 0}
                    <span className="text-xs text-slate-600 font-normal">/{practiceProgress[d.total] || '?'}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-5 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-slate-300">Start practicing</p>
              <p className="text-xs text-slate-500 mt-1">Build problem-solving skills at your own pace.</p>
            </div>
            <button onClick={() => onNavigate('available')} className="btn-primary btn-sm mx-auto">
              Browse Problems
            </button>
          </div>
        )}
      </section>

      {/* Quick links */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Problem Library',   icon: Compass,    view: 'available' },
            { label: 'Leaderboard',       icon: Trophy,     view: 'leaderboard' },
            { label: 'My Progress',       icon: TrendingUp, view: 'analytics' },
            { label: 'Submissions',       icon: Clock,      view: 'submissions' },
          ].map(link => (
            <button
              key={link.view}
              onClick={() => onNavigate(link.view)}
              className="card-interactive p-3.5 flex items-center gap-2.5 text-left"
            >
              <link.icon className="w-4 h-4 text-axly-400 shrink-0" />
              <span className="text-sm text-slate-300 font-medium">{link.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
