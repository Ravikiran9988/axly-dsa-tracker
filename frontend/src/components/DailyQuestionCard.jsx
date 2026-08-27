import React from 'react';
import { Sparkles, CheckCircle2, Calendar, Code2, ArrowRight } from 'lucide-react';

export default function DailyQuestionCard({ dailyQuestion, dailyData, onStatusChange, onOpenAdminDailyModal, onOpenInPlatform, isAdmin }) {
  const todayUtc = new Date().toISOString().split('T')[0];
  const question = dailyQuestion || dailyData?.data;

  const difficultyBadge = {
    easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20'
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-[#080C14] p-6 sm:p-7 shadow-2xl backdrop-blur-2xl transition-all duration-300">
      <div className="relative z-10">
        {/* Header Top */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-500 text-white shadow-md shadow-cyan-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono">
                  Today's Challenge
                </h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <span className="flex items-center space-x-1.5 text-xs text-slate-300 font-mono bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{todayUtc} (UTC)</span>
            </span>

            {isAdmin && (
              <button
                id="btn-admin-manage-daily"
                onClick={onOpenAdminDailyModal}
                className="text-xs px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-all font-semibold shadow-sm"
              >
                Change Daily
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {question ? (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2.5 flex-1 min-w-0">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-3 py-0.5 rounded-full font-bold border uppercase tracking-wider ${difficultyBadge[question.difficulty] || ''}`}>
                    {question.difficulty}
                  </span>
                  {question.topic_name && (
                    <span className="text-xs px-3 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 font-medium">
                      {question.topic_name}
                    </span>
                  )}
                  <span className="text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-0.5 rounded-full font-semibold">
                    +{question.points || 20} points
                  </span>
                </div>

                {/* Problem Title */}
                <h3 
                  onClick={onOpenInPlatform}
                  className="text-xl sm:text-2xl font-extrabold text-white tracking-tight cursor-pointer hover:text-cyan-300 transition-colors"
                >
                  {question.title}
                </h3>
              </div>

              {/* Status & CTA */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono pl-1">
                    Status:
                  </span>
                  <select
                    id="daily-question-status-select"
                    value={question.submission_status || 'not_started'}
                    onChange={(e) => onStatusChange && onStatusChange(question.id, e.target.value)}
                    className="bg-slate-800 text-slate-100 text-xs font-bold rounded-xl px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer transition-colors"
                  >
                    <option value="not_started">⚪ Not Started</option>
                    <option value="attempted">⏳ Attempted</option>
                    <option value="solved">✅ Solved</option>
                    <option value="skipped">⏭️ Skipped</option>
                  </select>
                </div>

                <button
                  onClick={onOpenInPlatform}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-cyan-950/60 transition-all active:scale-95"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Solve in IDE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div id="daily-question-empty-state" className="py-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40 space-y-2">
            <p className="text-sm font-bold text-slate-200">No daily challenge scheduled for today</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Admins will set the next global daily problem for today ({todayUtc} UTC).
            </p>
            {isAdmin && (
              <button
                onClick={onOpenAdminDailyModal}
                className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 transition-all"
              >
                <span>Set Daily Question Now</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
