import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Save } from 'lucide-react';

export default function AdminDailyQuestionModal({ isOpen, onClose, onSetDaily, questions, currentDailyQuestion }) {
  const [selectedQuestionId, setSelectedQuestionId] = useState(currentDailyQuestion?.id || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const todayUtc = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuestionId) {
      setError('Please select a question for today');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onSetDaily(selectedQuestionId);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to set daily question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-axly-400" />
            <span>Set Today's Global Daily Question</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
            <p>
              Setting this will immediately update the global daily challenge for all users on{' '}
              <strong className="text-white font-mono">{todayUtc} (UTC)</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Choose Question
            </label>
            <select
              id="select-daily-question"
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-axly-500 text-sm"
            >
              <option value="">-- Select a Question --</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  [{q.difficulty.toUpperCase()}] {q.title} {q.topic_name ? `(${q.topic_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-daily-question"
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-axly-600 hover:bg-axly-500 text-white flex items-center space-x-2 transition-all shadow-md shadow-axly-600/30"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Set As Daily Question'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
