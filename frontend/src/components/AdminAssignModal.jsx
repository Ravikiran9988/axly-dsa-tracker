import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, Check, Loader2 } from 'lucide-react';

export default function AdminAssignModal({ isOpen, onClose, onAssign, targetQuestion, users, questions }) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (targetQuestion) {
      setSelectedQuestionIds([targetQuestion.id]);
    } else {
      setSelectedQuestionIds([]);
    }
    setSelectedUserIds([]);
    setError(null);
  }, [targetQuestion, isOpen]);

  if (!isOpen) return null;

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleQuestion = (questionId) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      setError('Please select at least one user to assign');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      setError('Please select at least one question');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (selectedUserIds.length === 1 && selectedQuestionIds.length === 1) {
        await onAssign({
          type: 'single',
          user_id: selectedUserIds[0],
          question_id: selectedQuestionIds[0]
        });
      } else {
        await onAssign({
          type: 'bulk',
          user_ids: selectedUserIds,
          question_ids: selectedQuestionIds
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0F1626] border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-axly-500/10 text-axly-400 flex items-center justify-center border border-axly-500/20">
              <UserPlus className="w-4 h-4" />
            </div>
            <span>Assign DSA Questions</span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Question(s) Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
              Selected Questions ({selectedQuestionIds.length})
            </label>
            {targetQuestion ? (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-bold text-white flex items-center justify-between shadow-inner">
                <span>{targetQuestion.title}</span>
                <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {targetQuestion.difficulty}
                </span>
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
                {questions.map((q) => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                        isSelected
                          ? 'bg-axly-600/20 text-white border border-axly-500/40 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <span>{q.title}</span>
                      <span className="uppercase text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">
                        {q.difficulty}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* User(s) Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Select Users ({selectedUserIds.length}/{users.length})
              </label>
              <button
                type="button"
                onClick={selectAllUsers}
                className="text-xs text-axly-400 hover:text-axly-300 font-bold transition-colors"
              >
                {selectedUserIds.length === users.length ? 'Deselect All' : 'Select All Users'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
              {users.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                      isSelected
                        ? 'bg-axly-600/20 text-white border border-axly-500/40'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-axly-300 font-bold flex items-center justify-center text-[10px]">
                        {u.name ? u.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                        isSelected ? 'bg-axly-600 border-axly-500 text-white shadow-sm' : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800/80 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-assign"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-axly-600 hover:bg-axly-500 text-white flex items-center space-x-2 transition-all shadow-md shadow-axly-600/30 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Assigning...' : 'Assign Selected'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
