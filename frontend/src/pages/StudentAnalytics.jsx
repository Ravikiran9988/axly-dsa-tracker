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
  Ban
} from 'lucide-react';
import { api } from '../services/api';
import { practiceApi } from '../services/practiceApi';

export default function StudentAnalytics({ onSelectProblem }) {
  const [analytics, setAnalytics] = useState(null);
  const [practiceProgress, setPracticeProgress] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
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
      setError(err.message || 'Failed to load performance analytics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
        <div className="text-xs font-mono">Computing intelligent skill telemetry...</div>
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

  const difficultyBreakdown = analytics?.difficulty_breakdown || [];
  const topicBreakdown = analytics?.topic_breakdown || [];
  const weakTopics = analytics?.weak_topics || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-cyan-950/40 border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Telemetry & Progress Intelligence</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Progress & Skill Growth Intelligence
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Real-time algorithmic mastery insights, problem-solving velocity, weak-area detection, and personalized practice progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center shrink-0">
            <div className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-amber-400" /> {summary.current_streak}d
            </div>
            <div className="text-[10px] text-amber-300/80 uppercase font-mono mt-0.5">Active Streak</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center shrink-0">
            <div className="text-lg font-black text-cyan-400">{summary.points}</div>
            <div className="text-[10px] text-cyan-300/80 uppercase font-mono mt-0.5">Competitive Pts</div>
          </div>
        </div>
      </div>

      {/* Practice Progress Bar */}
      {practiceProgress && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-cyan-400" /> Practice Bank Status
            </span>
            <span className="text-slate-400 font-mono">
              {practiceProgress.solved || 0} Solved · {practiceProgress.in_progress || 0} In Progress · {practiceProgress.abandoned || 0} Abandoned
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {practiceProgress.solved || 0}
              </div>
              <div className="text-[10px] text-emerald-300/80 uppercase font-mono">Practice Solved</div>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
              <div className="text-lg font-black text-cyan-400 flex items-center justify-center gap-1">
                <Clock3 className="w-4 h-4" /> {practiceProgress.in_progress || 0}
              </div>
              <div className="text-[10px] text-cyan-300/80 uppercase font-mono">In Progress</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                <Ban className="w-4 h-4" /> {practiceProgress.abandoned || 0}
              </div>
              <div className="text-[10px] text-amber-300/80 uppercase font-mono">Abandoned</div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
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

      {/* 2-Column Analytics Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Topic Intelligence */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Topic Mastery Breakdown</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">Based on attempts</span>
            </div>

            {topicBreakdown.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Solve coding challenges or practice problems to unlock topic mastery telemetry.
              </div>
            ) : (
              <div className="space-y-3">
                {topicBreakdown.map((t, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{t.topic}</span>
                      <span className="text-slate-400 font-mono">
                        {t.solved}/{t.attempts} solved ({t.accuracy}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                        style={{ width: `${Math.max(5, t.accuracy)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weak Topics Spotlight */}
          {weakTopics.length > 0 && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-950/20 via-slate-900 to-slate-950 border border-rose-800/30 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase">
                <Target className="w-4 h-4" />
                <span>Identified Improvement Areas</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The platform detected lower accuracy in these topics. Focus on foundational easy/medium practice problems to build confidence:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {weakTopics.map((wt, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-medium"
                  >
                    {wt.topic} ({wt.accuracy}% accuracy)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Difficulty Distribution & Recommendations */}
        <div className="lg:col-span-5 space-y-6">
          {/* Difficulty Cards */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Difficulty Distribution</span>
            </h2>

            <div className="space-y-3">
              {['easy', 'medium', 'hard'].map((diff) => {
                const item = difficultyBreakdown.find(d => d.difficulty?.toLowerCase() === diff) || {
                  attempts: 0,
                  solved: 0,
                  accuracy: 0
                };
                const colors = {
                  easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                  hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                };

                return (
                  <div
                    key={diff}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${colors[diff]}`}>
                        {diff}
                      </span>
                      <span className="text-slate-300 font-semibold">{item.solved} Solved</span>
                    </div>
                    <span className="text-slate-400 font-mono">{item.accuracy}% pass rate</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Smart Recommendations Widget */}
          {recommendations.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase">
                <Sparkles className="w-4 h-4" />
                <span>Next Recommended Challenges</span>
              </div>

              <div className="space-y-2.5">
                {recommendations.slice(0, 3).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-cyan-500/40 transition-colors space-y-1.5"
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
      </div>
    </div>
  );
}
