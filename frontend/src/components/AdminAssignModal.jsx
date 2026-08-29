import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, User, Code2, Calendar } from 'lucide-react';
import { api } from '../services/api';

export default function AdminAssignModal({ isOpen, onClose, onSuccess, initialUser, initialQuestion, users = [], questions = [] }) {
  const [userId, setUserId] = useState(initialUser?.id || '');
  const [questionId, setQuestionId] = useState(initialQuestion?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userId || !questionId) {
      setError('Please select both a student and a question');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createAssignment({
        user_id: userId,
        question_id: questionId,
        due_date: dueDate || undefined
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Assign Problem to Student</h2>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Student</label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">Select a student...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">DSA Problem</label>
            <select
              value={questionId}
              onChange={e => setQuestionId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">Select a question...</option>
              {questions.map(q => (
                <option key={q.id} value={q.id}>{q.title} ({q.difficulty})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Optional Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 disabled:opacity-50"
            >
              {submitting ? 'Assigning...' : 'Assign Problem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
