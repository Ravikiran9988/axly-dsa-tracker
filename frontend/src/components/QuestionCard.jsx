import React from 'react';
import { ExternalLink, CheckCircle2, Clock, PlayCircle, AlertCircle, Edit2, Trash2, UserPlus, UserCheck } from 'lucide-react';

export default function QuestionCard({
  question,
  isAdmin,
  onStatusChange,
  onEdit,
  onDelete,
  onAssign
}) {
  const difficultyColors = {
    easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    hard: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
  };

  const statusBg = {
    not_started: 'bg-slate-800 text-slate-300 border-slate-700',
    attempted: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    solved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    skipped: 'bg-slate-800 text-slate-400 border-slate-700'
  };

  return (
    <div className="glass-panel-interactive p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between space-y-4">
      <div>
        {/* Badges & Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${difficultyColors[question.difficulty] || ''}`}>
              {question.difficulty}
            </span>
            {question.topic_name && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {question.topic_name}
              </span>
            )}
          </div>

          {/* User vs Admin Assignment Indicators */}
          {isAdmin ? (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {question.active_assignees_count > 0 ? (
                <span className="text-axly-400 flex items-center space-x-1">
                  <UserCheck className="w-3 h-3 inline" />
                  <span>{question.active_assignees_count} assigned</span>
                </span>
              ) : (
                <span className="text-slate-500">Unassigned</span>
              )}
            </span>
          ) : (
            question.is_assigned_to_me && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-axly-500/10 text-axly-400 border border-axly-500/30 font-medium">
                Assigned
              </span>
            )
          )}
        </div>

        {/* Title & URL Link */}
        <h4 className="text-base font-semibold text-slate-100 group">
          <a
            href={question.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-axly-400 transition-colors inline-flex items-center space-x-1.5"
          >
            <span>{question.title}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-axly-400 transition-colors" />
          </a>
        </h4>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        {/* Practice Self-Reporting Dropdown */}
        <div className="flex items-center space-x-2">
          <select
            value={question.submission_status || 'not_started'}
            onChange={(e) => onStatusChange(question.id, e.target.value)}
            className={`text-xs font-medium rounded-lg px-2.5 py-1 border focus:outline-none focus:border-axly-500 cursor-pointer ${statusBg[question.submission_status || 'not_started']}`}
          >
            <option value="not_started">⚪ Not Started</option>
            <option value="attempted">⏳ Attempted</option>
            <option value="solved">✅ Solved</option>
            <option value="skipped">⏭️ Skipped</option>
          </select>
        </div>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onAssign(question)}
              title="Assign Question"
              className="p-1.5 rounded-lg text-slate-400 hover:text-axly-400 hover:bg-slate-800 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(question)}
              title="Edit Question"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(question)}
              title="Deactivate Question"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
