import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Save, Loader2, Calendar } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0F1626] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-axly-500/10 text-axly-400 flex items-center justify-center border border-axly-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Set Today's Global Daily Question</span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start space-x-3">
            <Calendar className="w-4 h-4 text-axly-400 shrink-0 mt-0.5" />
            <p>
              Setting this will immediately update the global daily challenge for all registered users on{' '}
              <strong className="text-white font-mono">{todayUtc} (UTC)</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
              Choose Question
            </label>
            <select
              id="select-daily-question"
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white focus:outline-none focus:border-axly-500 text-xs font-medium shadow-inner transition-colors cursor-pointer"
            >
              <option value="">-- Select a Question --</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  [{q.difficulty.toUpperCase()}] {q.title} {q.topic_name ? `(${q.topic_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-daily-question"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-axly-600 hover:bg-axly-500 text-white flex items-center space-x-2 transition-all shadow-md shadow-axly-600/30 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{loading ? 'Saving...' : 'Set As Daily Question'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
