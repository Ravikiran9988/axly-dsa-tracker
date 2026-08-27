import React from 'react';
import { Sparkles, ExternalLink, CheckCircle2, Clock, PlayCircle, AlertCircle, Calendar, ArrowUpRight, Flame } from 'lucide-react';

export default function DailyQuestionCard({ dailyData, onStatusChange, onOpenAdminDailyModal, isAdmin }) {
  const todayUtc = new Date().toISOString().split('T')[0];
  const question = dailyData?.data;

  const difficultyBadge = {
    easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20'
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-axly-500/30 bg-gradient-to-br from-axly-950/50 via-slate-900/90 to-[#080C14] p-6 sm:p-7 shadow-2xl backdrop-blur-2xl transition-all duration-300">
      {/* Background ambient glowing spheres */}
      <div className="absolute -right-16 -top-16 w-72 h-72 bg-axly-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 -bottom-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Card Header Top */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-axly-600 to-cyan-400 text-white shadow-md shadow-axly-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xs font-bold tracking-widest text-axly-400 uppercase font-mono">
                  Today's Challenge
                </h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-axly-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-axly-500"></span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <span className="flex items-center space-x-1.5 text-xs text-slate-300 font-mono bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-axly-400" />
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
              <div className="space-y-2.5">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-3 py-0.5 rounded-full font-bold border uppercase tracking-wider ${difficultyBadge[question.difficulty] || ''}`}>
                    {question.difficulty}
                  </span>
                  {question.topic_name && (
                    <span className="text-xs px-3 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 font-medium shadow-inner">
                      {question.topic_name}
                    </span>
                  )}
                  {question.is_assigned_to_me && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold">
                      Curriculum Assigned
                    </span>
                  )}
                </div>

                {/* Problem Title & Action Link */}
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  <a
                    href={question.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 group hover:text-axly-300 transition-colors"
                  >
                    <span>{question.title}</span>
                    <span className="p-1 rounded-lg bg-slate-800/80 group-hover:bg-axly-600/30 transition-colors">
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-axly-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </a>
                </h3>
              </div>

              {/* Status Self-Reporting Box */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-xl">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono pl-1">
                  My Status:
                </span>
                <select
                  id="daily-question-status-select"
                  value={question.submission_status || 'not_started'}
                  onChange={(e) => onStatusChange(question.id, e.target.value)}
                  className="bg-slate-800 text-slate-100 text-xs font-bold rounded-xl px-3.5 py-2 border border-slate-700 focus:outline-none focus:border-axly-500 hover:border-slate-600 cursor-pointer transition-colors shadow-inner"
                >
                  <option value="not_started">⚪ Not Started</option>
                  <option value="attempted">⏳ Attempted</option>
                  <option value="solved">✅ Solved</option>
                  <option value="skipped">⏭️ Skipped</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div id="daily-question-empty-state" className="py-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-200">No daily challenge scheduled for today</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Admins will set the next global daily problem for today ({todayUtc} UTC).
            </p>
            {isAdmin && (
              <button
                onClick={onOpenAdminDailyModal}
                className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-axly-600 hover:bg-axly-500 text-white shadow-md shadow-axly-600/30 transition-all"
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
