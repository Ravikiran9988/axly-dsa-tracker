import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  Calendar,
  BarChart3,
  Target,
  Sparkles,
  ArrowRight,
  Code2,
  Clock3,
  Ban,
  BookOpen,
  PieChart,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { practiceApi } from '../services/practiceApi';

export default function StudentAnalytics({ onSelectProblem }) {
  const [analytics, setAnalytics] = useState(null);
  const [practiceProgress, setPracticeProgress] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [activeTab, setActiveTab] = useState('practice'); // 'practice' | 'telemetry'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [anRes, pracRes, recRes] = await Promise.all([
        api.getUserAnalytics().catch(() => ({ data: null })),
        practiceApi.getProgress().catch(() => ({ data: null })),
        api.getRecommendations(4).catch(() => ({ data: [] }))
      ]);
      setAnalytics(anRes?.data || null);
      setPracticeProgress(pracRes?.data || null);
      setRecommendations(recRes?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load progress analytics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-[3px] border-axly-500/20 border-t-axly-500 rounded-full animate-spin" />
        <div className="text-xs text-slate-500 font-mono">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
        <button onClick={loadData} className="btn-danger btn-sm ml-4">
          Retry
        </button>
      </div>
    );
  }

  const summary = analytics?.summary || {
    total_submissions: 0,
    solved_submissions: 0,
    average_score: 0,
    average_time_seconds: 0,
    success_percentage: 0,
    current_streak: 1,
    longest_streak: 1,
    points: 100
  };

  const prac = practiceProgress || {
    total: 80,
    solved: 0,
    inProgress: 0,
    notStarted: 80,
    abandoned: 0,
    completionPercent: 0,
    topics: [],
    difficulties: []
  };

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-cyan-950/40 border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Practice & Skill Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Learning Progress & Analytics
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Track your mastery across all 8 core DSA topics, completion percentage, and difficulty distributions. Practice progress is private to you and never affects competitive rank.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center shrink-0">
            <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {prac.solved} / {prac.total}
            </div>
            <div className="text-[10px] text-emerald-300/80 uppercase font-mono mt-0.5">{prac.completionPercent}% Solved</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center shrink-0">
            <div className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-amber-400" /> {summary.current_streak}d
            </div>
            <div className="text-[10px] text-amber-300/80 uppercase font-mono mt-0.5">Daily Streak</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('practice')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'practice'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Practice Bank Progress (80 Problems)</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'telemetry'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Skill Telemetry & Insights</span>
        </button>
      </div>

      {activeTab === 'practice' ? (
        <div className="space-y-6">
          {/* Overall Practice KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-2xl font-black text-white">{prac.total}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Total Problems</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-2xl font-black text-emerald-400">{prac.solved}</div>
              <div className="text-[10px] text-emerald-300/80 uppercase tracking-wider mt-1">Solved</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-2xl font-black text-cyan-400">{prac.inProgress}</div>
              <div className="text-[10px] text-cyan-300/80 uppercase tracking-wider mt-1">In Progress</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-2xl font-black text-slate-400">{prac.notStarted}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Not Started</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <div className="text-2xl font-black text-amber-400">{prac.abandoned}</div>
              <div className="text-[10px] text-amber-300/80 uppercase tracking-wider mt-1">Abandoned</div>
            </div>
          </div>

          {/* Topic Breakdown Grid (8 Topics) */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Topic Progress Breakdown (8 Core Topics)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Progress across the 80 curated Practice V1 problem bank.</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">{prac.completionPercent}% Overall Complete</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prac.topics.map((t) => {
                const pct = t.total > 0 ? Math.round((t.solved * 100) / t.total) : 0;
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/30 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white text-sm">{t.name}</span>
                      <span className="text-slate-400 font-mono">
                        <strong className="text-emerald-400">{t.solved}</strong> / {t.total} Solved
                      </span>
                    </div>

                    <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(3, pct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{pct}% Completed</span>
                      {t.in_progress > 0 && <span className="text-cyan-400 font-medium">{t.in_progress} In Progress</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficulty Progress Grid */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Difficulty Mastery</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {prac.difficulties.map((d) => {
                const pct = d.total > 0 ? Math.round((d.solved * 100) / d.total) : 0;
                const diffKey = String(d.difficulty).toLowerCase();

                return (
                  <div
                    key={d.difficulty}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${difficultyColors[diffKey] || difficultyColors.easy}`}>
                        {d.difficulty}
                      </span>
                      <span className="text-xs font-mono text-slate-300 font-semibold">
                        {d.solved} / {d.total} ({pct}%)
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          diffKey === 'easy' ? 'bg-emerald-500' : diffKey === 'medium' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(3, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Telemetry Tab */
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-xs font-medium">Daily Solved</div>
              <div className="text-2xl font-black text-white">
                {summary.solved_submissions}
                <span className="text-xs font-normal text-slate-500 ml-1">/ {summary.total_submissions}</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold">{summary.success_percentage}% solve rate</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-xs font-medium">Average Score</div>
              <div className="text-2xl font-black text-cyan-400">
                {summary.average_score}
                <span className="text-xs font-normal text-slate-500 ml-1">/ 100</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">Server-evaluated</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-xs font-medium">Avg Solve Duration</div>
              <div className="text-2xl font-black text-indigo-300">
                {Math.round(summary.average_time_seconds / 60) || 12}
                <span className="text-xs font-normal text-slate-500 ml-1">mins</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">Per accepted challenge</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-xs font-medium">Longest Streak</div>
              <div className="text-2xl font-black text-amber-400">
                {summary.longest_streak || summary.current_streak}
                <span className="text-xs font-normal text-slate-500 ml-1">days</span>
              </div>
              <div className="text-[11px] text-amber-300/80 font-mono">Personal best</div>
            </div>
          </div>

          {/* Recommendations Widget */}
          {recommendations.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase">
                <Sparkles className="w-4 h-4" />
                <span>Next Recommended Challenges</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendations.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-cyan-500/40 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                        {rec.title}
                      </h4>
                      <button
                        onClick={() => onSelectProblem && onSelectProblem(rec.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300"
                      >
                        <span>Solve</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {rec.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
