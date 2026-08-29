import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  BookOpen,
  Calendar,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Code2,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminCreateFromPracticeModal({
  isOpen,
  onClose,
  onCreated
}) {
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // Form custom fields
  const [customTitle, setCustomTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [points, setPoints] = useState(100);
  const [status, setStatus] = useState('draft');

  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadPracticeQuestions();
      setSelectedQuestion(null);
      setCustomTitle('');
      setScheduledDate('');
      setPoints(100);
      setStatus('draft');
      setError(null);
      setSearch('');
    }
  }, [isOpen]);

  async function loadPracticeQuestions() {
    setLoadingQuestions(true);
    try {
      const res = await api.getQuestions({ limit: 100 });
      setQuestions(res.data || []);
    } catch (e) {
      setError('Failed to load practice questions');
    } finally {
      setLoadingQuestions(false);
    }
  }

  if (!isOpen) return null;

  const handleSelect = (q) => {
    setSelectedQuestion(q);
    setCustomTitle(`${q.title} Challenge`);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuestion) {
      setError('Please select a practice problem first');
      return;
    }
    if (!customTitle.trim()) {
      setError('Challenge title is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: customTitle.trim(),
        points: Number(points) || 100,
        scheduled_date: scheduledDate || null,
        status: scheduledDate ? 'scheduled' : status
      };

      await api.createDailyChallengeFromPractice(selectedQuestion.id, payload);
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to instantiate daily challenge from practice problem');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) || (q.topic_name && q.topic_name.toLowerCase().includes(search.toLowerCase()));
    const matchDiff = !difficultyFilter || q.difficulty?.toLowerCase() === difficultyFilter.toLowerCase();
    return matchSearch && matchDiff;
  });

  const diffCls = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Create Daily Challenge from Practice Problem
              </h2>
              <p className="text-xs text-slate-400">
                Instantiate an independent Daily Challenge record based on an existing Practice problem without altering the original.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Select Practice Problem */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                1. Select Source Practice Problem ({filteredQuestions.length})
              </label>
              {selectedQuestion && (
                <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selected: {selectedQuestion.title}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search practice library by title or topic..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={difficultyFilter}
                onChange={e => setDifficultyFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* List of Practice Problems */}
            <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/60 divide-y divide-slate-800/60">
              {loadingQuestions ? (
                <div className="p-6 text-center text-xs text-slate-500">Loading practice bank...</div>
              ) : filteredQuestions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No practice problems found.</div>
              ) : (
                filteredQuestions.map(q => {
                  const isSel = selectedQuestion?.id === q.id;
                  return (
                    <button
                      type="button"
                      key={q.id}
                      onClick={() => handleSelect(q)}
                      className={`w-full p-3 text-left flex items-center justify-between transition-colors ${
                        isSel
                          ? 'bg-indigo-950/40 border-l-4 border-indigo-500'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-2">
                          <span>{q.title}</span>
                          <span className={`px-2 py-0.5 rounded uppercase text-[9px] font-bold border ${diffCls[q.difficulty?.toLowerCase()] || ''}`}>
                            {q.difficulty}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
                          <span>{q.id}</span>
                          {q.topic_name && <span>&bull; {q.topic_name}</span>}
                          {q.pattern_id && <span>&bull; {q.pattern_id}</span>}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSel ? (
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold font-mono">
                            Selected
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 hover:text-slate-300">
                            Select &rarr;
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Configure Daily Challenge Properties */}
          {selectedQuestion && (
            <div className="space-y-4 pt-3 border-t border-slate-800 animate-fade-in">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                2. Challenge Configuration & Scheduling
              </label>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                  Challenge Title *
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Challenge title..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Points (Streak Reward)
                  </label>
                  <input
                    type="number"
                    value={points}
                    onChange={e => setPoints(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-bold font-mono text-xs focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    disabled={Boolean(scheduledDate)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 disabled:opacity-50"
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                <div className="font-bold text-slate-300">Automated Content Extraction:</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  The problem statement, constraints, example inputs/outputs, starter code, solution approach, 3-step progressive hints, and test cases will be cloned into the new Daily Challenge record automatically. The original Practice problem remains 100% untouched.
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !selectedQuestion}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? 'Creating Challenge...' : 'Create Daily Challenge'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
