import React, { useState } from 'react';
import { X, Calendar, AlertCircle, CheckCircle2, Clock, Flame, Zap } from 'lucide-react';
import { api } from '../services/api';

export default function AdminScheduleDailyModal({
  isOpen,
  onClose,
  challenge,
  onScheduled
}) {
  const todayUtc = new Date().toISOString().split('T')[0];
  const [targetDate, setTargetDate] = useState(challenge?.scheduled_date || todayUtc);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !challenge) return null;

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!targetDate) {
      setError('Please select a date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.scheduleDailyChallenge(challenge.id, { date: targetDate });
      if (onScheduled) onScheduled(targetDate);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule daily challenge');
    } finally {
      setLoading(false);
    }
  };

  const diffCls = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  }[challenge.difficulty?.toLowerCase()] || 'text-slate-400 bg-slate-500/10';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Schedule Daily Challenge</h3>
              <p className="text-[11px] text-slate-400">Set active challenge date for students</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSchedule} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selected Challenge Card Preview */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${diffCls}`}>
                {challenge.difficulty}
              </span>
              <span className="text-xs text-amber-400 font-mono font-bold">
                {challenge.points || 100} pts
              </span>
            </div>
            <h4 className="text-sm font-bold text-white leading-snug">
              {challenge.title}
            </h4>
            <p className="text-[11px] text-slate-400 line-clamp-2">
              {challenge.description}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
              Target Challenge Date (UTC) *
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1">
              On this date, this challenge will be highlighted on student dashboards, awarding streaks and competitive leaderboard points.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{loading ? 'Scheduling...' : 'Confirm Schedule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
