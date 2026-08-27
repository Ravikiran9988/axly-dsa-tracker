import React from 'react';
import { ExternalLink, CheckCircle2, Clock, PlayCircle, AlertCircle, Edit2, Trash2, UserPlus, UserCheck, ArrowUpRight } from 'lucide-react';

export default function QuestionCard({
  question,
  isAdmin,
  onStatusChange,
  onEdit,
  onDelete,
  onAssign
}) {
  const difficultyBadge = {
    easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20'
  };

  const statusBg = {
    not_started: 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600',
    attempted: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:border-amber-500/50',
    solved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50',
    skipped: 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
  };

  return (
    <div className="glass-panel-interactive p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-4 group">
      <div className="space-y-3">
        {/* Badges & Indicators Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${difficultyBadge[question.difficulty] || ''}`}>
              {question.difficulty}
            </span>
            {question.topic_name && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 font-medium">
                {question.topic_name}
              </span>
            )}
          </div>

          {/* User vs Admin Assignment Indicators */}
          {isAdmin ? (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
              {question.active_assignees_count > 0 ? (
                <span className="text-axly-400 font-semibold flex items-center space-x-1">
                  <UserCheck className="w-3 h-3 inline" />
                  <span>{question.active_assignees_count} assigned</span>
                </span>
              ) : (
                <span className="text-slate-500 font-medium">Unassigned</span>
              )}
            </span>
          ) : (
            question.is_assigned_to_me && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-axly-500/15 text-axly-300 border border-axly-500/30 font-semibold tracking-wide">
                Assigned
              </span>
            )
          )}
        </div>

        {/* Question Title & URL Link */}
        <h4 className="text-base font-bold text-slate-100 leading-snug">
          <a
            href={question.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group-hover:text-axly-300 transition-colors inline-flex items-center space-x-1.5"
          >
            <span>{question.title}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-axly-400 transition-colors shrink-0" />
          </a>
        </h4>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {/* Practice Self-Reporting Dropdown */}
        <div className="flex items-center space-x-2">
          <select
            value={question.submission_status || 'not_started'}
            onChange={(e) => onStatusChange(question.id, e.target.value)}
            className={`text-xs font-semibold rounded-xl px-2.5 py-1.5 border focus:outline-none focus:border-axly-500 cursor-pointer transition-all shadow-inner ${statusBg[question.submission_status || 'not_started']}`}
          >
            <option value="not_started">⚪ Not Started</option>
            <option value="attempted">⏳ Attempted</option>
            <option value="solved">✅ Solved</option>
            <option value="skipped">⏭️ Skipped</option>
          </select>
        </div>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <div className="flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onAssign(question)}
              title="Assign Question"
              className="p-1.5 rounded-lg text-slate-400 hover:text-axly-400 hover:bg-slate-800 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEdit(question)}
              title="Edit Question"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(question)}
              title="Deactivate Question"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
