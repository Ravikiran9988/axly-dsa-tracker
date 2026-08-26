import React from 'react';
import { CheckCircle2, Clock, ListChecks, Target, Flame, TrendingUp } from 'lucide-react';

export default function ProgressOverview({ progress }) {
  if (!progress) return null;

  const {
    assigned_count = 0,
    attempted_count = 0,
    solved_count = 0,
    pending_count = 0,
    completion_percentage = 0,
    difficulty_breakdown = {
      easy: { assigned: 0, solved: 0, percentage: 0 },
      medium: { assigned: 0, solved: 0, percentage: 0 },
      hard: { assigned: 0, solved: 0, percentage: 0 }
    }
  } = progress;

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion % */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-axly-400">Completion</span>
            <Target className="w-4 h-4 text-axly-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span id="metric-completion-pct" className="text-3xl font-extrabold text-white font-mono">
              {completion_percentage}%
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-axly-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, completion_percentage)}%` }}
            />
          </div>
        </div>

        {/* Solved Active */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Solved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span id="metric-solved-count" className="text-3xl font-extrabold text-white font-mono">
              {solved_count}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {assigned_count} assigned</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">Currently assigned & active</p>
        </div>

        {/* Pending Assignments */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span id="metric-pending-count" className="text-3xl font-extrabold text-white font-mono">
              {pending_count}
            </span>
            <span className="text-xs text-slate-400 font-mono">questions left</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">To reach 100% completion</p>
        </div>

        {/* Attempted */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Attempted</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span id="metric-attempted-count" className="text-3xl font-extrabold text-white font-mono">
              {attempted_count}
            </span>
            <span className="text-xs text-slate-400 font-mono">questions</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">Attempted or solved</p>
        </div>
      </div>

      {/* Difficulty-wise Progress Breakdown */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Difficulty Breakdown (Assigned Questions)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Easy */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-emerald-400">Easy</span>
              <span className="text-slate-300 font-mono">
                {difficulty_breakdown.easy?.solved || 0} / {difficulty_breakdown.easy?.assigned || 0}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${difficulty_breakdown.easy?.percentage || 0}%` }}
              />
            </div>
          </div>

          {/* Medium */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-amber-400">Medium</span>
              <span className="text-slate-300 font-mono">
                {difficulty_breakdown.medium?.solved || 0} / {difficulty_breakdown.medium?.assigned || 0}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${difficulty_breakdown.medium?.percentage || 0}%` }}
              />
            </div>
          </div>

          {/* Hard */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-rose-400">Hard</span>
              <span className="text-slate-300 font-mono">
                {difficulty_breakdown.hard?.solved || 0} / {difficulty_breakdown.hard?.assigned || 0}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${difficulty_breakdown.hard?.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
