import React from 'react';
import { Sparkles, ExternalLink, CheckCircle2, Clock, PlayCircle, AlertCircle, Calendar } from 'lucide-react';

export default function DailyQuestionCard({ dailyData, onStatusChange, onOpenAdminDailyModal, isAdmin }) {
  const todayUtc = new Date().toISOString().split('T')[0];
  const question = dailyData?.data;

  const difficultyColors = {
    easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    hard: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
  };

  const statusIcons = {
    not_started: <PlayCircle className="w-4 h-4 text-slate-400" />,
    attempted: <Clock className="w-4 h-4 text-amber-400" />,
    solved: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    skipped: <AlertCircle className="w-4 h-4 text-slate-500" />
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-axly-500/30 bg-gradient-to-br from-axly-950/40 via-slate-900/80 to-slate-950 p-6 shadow-xl backdrop-blur-xl">
      {/* Background ambient glow */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-axly-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-axly-500/20 text-axly-400 border border-axly-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-semibold tracking-wider text-axly-400 uppercase font-mono">
              Daily Challenge
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1 text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{todayUtc} (UTC)</span>
            </span>

            {isAdmin && (
              <button
                id="btn-admin-manage-daily"
                onClick={onOpenAdminDailyModal}
                className="text-xs px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-colors font-medium"
              >
                Change Daily Question
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {question ? (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${difficultyColors[question.difficulty] || ''}`}>
                    {question.difficulty}
                  </span>
                  {question.topic_name && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                      {question.topic_name}
                    </span>
                  )}
                  {question.is_assigned_to_me && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
                      Assigned to you
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white tracking-tight hover:text-axly-300 transition-colors">
                  <a href={question.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1.5 group">
                    <span>{question.title}</span>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-axly-400 transition-colors inline" />
                  </a>
                </h3>
              </div>

              {/* Status Self-Reporting Control */}
              <div className="flex items-center space-x-3 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-medium pl-1">My Status:</span>
                <select
                  id="daily-question-status-select"
                  value={question.submission_status || 'not_started'}
                  onChange={(e) => onStatusChange(question.id, e.target.value)}
                  className="bg-slate-800 text-slate-100 text-xs font-semibold rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-axly-500 cursor-pointer"
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
          /* Defined Empty State per PRD Section 17 & 24 */
          <div id="daily-question-empty-state" className="py-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No daily question set for today</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Check back soon! Admins will schedule the next global daily problem for today ({todayUtc} UTC).
            </p>
            {isAdmin && (
              <button
                onClick={onOpenAdminDailyModal}
                className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-axly-600 text-white hover:bg-axly-500 transition-colors"
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
