import React from 'react';
import { CheckCircle2, Clock, Target, TrendingUp, BarChart3, Zap } from 'lucide-react';

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
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 relative overflow-hidden group hover:border-axly-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-axly-400 font-mono">Completion</span>
            <div className="w-8 h-8 rounded-xl bg-axly-500/10 text-axly-400 flex items-center justify-center border border-axly-500/20">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span id="metric-completion-pct" className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {completion_percentage}%
            </span>
          </div>
          <div className="mt-3.5 w-full bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5 border border-slate-700/40">
            <div
              className="bg-gradient-to-r from-axly-500 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${Math.min(100, completion_percentage)}%` }}
            />
          </div>
        </div>

        {/* Solved Active */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">Solved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span id="metric-solved-count" className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {solved_count}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {assigned_count} assigned</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">Currently active curriculum</p>
        </div>

        {/* Pending Assignments */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span id="metric-pending-count" className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {pending_count}
            </span>
            <span className="text-xs text-slate-400 font-mono">questions left</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">To reach 100% completion</p>
        </div>

        {/* Attempted */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 group hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">Attempted</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span id="metric-attempted-count" className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {attempted_count}
            </span>
            <span className="text-xs text-slate-400 font-mono">questions</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">In-progress or completed</p>
        </div>
      </div>

      {/* Difficulty-wise Progress Breakdown */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/90">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-4 h-4 text-axly-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Difficulty Distribution (Assigned Questions)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Easy */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-emerald-400 uppercase tracking-wider font-mono">Easy</span>
              <span className="text-slate-300 font-mono font-medium">
                {difficulty_breakdown.easy?.solved || 0} / {difficulty_breakdown.easy?.assigned || 0}{' '}
                <span className="text-slate-400">({difficulty_breakdown.easy?.percentage || 0}%)</span>
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${difficulty_breakdown.easy?.percentage || 0}%` }}
              />
            </div>
          </div>

          {/* Medium */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-amber-400 uppercase tracking-wider font-mono">Medium</span>
              <span className="text-slate-300 font-mono font-medium">
                {difficulty_breakdown.medium?.solved || 0} / {difficulty_breakdown.medium?.assigned || 0}{' '}
                <span className="text-slate-400">({difficulty_breakdown.medium?.percentage || 0}%)</span>
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${difficulty_breakdown.medium?.percentage || 0}%` }}
              />
            </div>
          </div>

          {/* Hard */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/30 transition-colors">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-rose-400 uppercase tracking-wider font-mono">Hard</span>
              <span className="text-slate-300 font-mono font-medium">
                {difficulty_breakdown.hard?.solved || 0} / {difficulty_breakdown.hard?.assigned || 0}{' '}
                <span className="text-slate-400">({difficulty_breakdown.hard?.percentage || 0}%)</span>
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${difficulty_breakdown.hard?.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
