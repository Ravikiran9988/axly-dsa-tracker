import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AdminQuestionModal from '../components/AdminQuestionModal';
import {
  Code2,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Archive,
  Check,
  X,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';

export default function AdminQuestions({ onSelectProblem, onOpenCreateModal }) {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topicId, setTopicId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Modals & Editing
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => {
    loadTopicsAndPatterns();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [page, difficulty, topicId, status]);

  async function loadTopicsAndPatterns() {
    try {
      const [tRes, pRes] = await Promise.all([
        api.getTopics().catch(() => ({ data: [] })),
        api.getPatterns().catch(() => ({ data: [] }))
      ]);
      setTopics(tRes.data || []);
      setPatterns(pRes.data || []);
    } catch {}
  }

  async function loadQuestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getQuestions({
        page,
        limit,
        search: search.trim() || undefined,
        difficulty: difficulty || undefined,
        topic_id: topicId || undefined,
        status: status || undefined
      });
      setQuestions(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load question repository');
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadQuestions();
  };

  const handleTogglePublish = async (q) => {
    const newStatus = q.status === 'published' ? 'draft' : 'published';
    try {
      await api.updateQuestion(q.id, { status: newStatus });
      setActionSuccess(`Question status changed to ${newStatus}`);
      loadQuestions();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleArchive = async (questionId) => {
    if (!window.confirm('Archive this question? Archived questions will not appear in the active Practice bank.')) return;
    try {
      await api.updateQuestion(questionId, { status: 'archived', is_active: 0 });
      setActionSuccess('Question archived successfully');
      loadQuestions();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      alert(`Archive failed: ${err.message}`);
    }
  };

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const statusColors = {
    published: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    draft: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    archived: 'text-slate-400 bg-slate-500/10 border-slate-500/20'
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Code2 className="w-4 h-4" />
            <span>Practice Problem Library</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Question Bank Management
          </h1>
          <p className="text-xs text-slate-400">
            Author, edit, organize taxonomy, and manage the curated Practice problem repository.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingQuestion(null);
              setIsEditModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/15 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Toolbar: Search & Filters */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search questions by title or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
            />
          </div>

          {/* Topic Filter */}
          <select
            value={topicId}
            onChange={(e) => { setTopicId(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficulty}
            onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Filter
          </button>

          <button
            type="button"
            onClick={() => { setSearch(''); setDifficulty(''); setTopicId(''); setStatus(''); setPage(1); loadQuestions(); }}
            className="px-3 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={loadQuestions}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white ml-auto"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {/* Questions Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
            <div className="text-xs font-mono">Loading questions...</div>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-xs">{error}</div>
        ) : questions.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs space-y-2">
            <div>No questions match the current filter criteria.</div>
            <button
              onClick={() => { setEditingQuestion(null); setIsEditModalOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Create First Question
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Topic</th>
                  <th className="py-3.5 px-4">Difficulty</th>
                  <th className="py-3.5 px-4">Pattern</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                {questions.map((q) => {
                  const topicName = topics.find(t => t.id === q.topic_id)?.name || q.topic_name || q.topic_id || '—';
                  const patternName = patterns.find(p => p.id === q.pattern_id)?.name || q.pattern_id || '—';

                  return (
                    <tr key={q.id} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Title */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {q.title}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          <span>{q.id}</span>
                          {q.is_practice ? (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 text-[9px] uppercase font-bold">Practice V1</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Topic */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-300 font-medium">
                          {topicName}
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${difficultyColors[q.difficulty] || difficultyColors.easy}`}>
                          {q.difficulty}
                        </span>
                      </td>

                      {/* Pattern */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-400 font-mono text-[11px]">
                          {patternName}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${statusColors[q.status] || statusColors.draft}`}>
                          {q.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* View Preview */}
                          <button
                            onClick={() => setPreviewQuestion(q)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors"
                            title="Preview question"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditingQuestion(q);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors"
                            title="Edit question details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Publish / Unpublish Toggle */}
                          <button
                            onClick={() => handleTogglePublish(q)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              q.status === 'published'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                            title={q.status === 'published' ? 'Unpublish to Draft' : 'Publish Question'}
                          >
                            {q.status === 'published' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </button>

                          {/* Archive */}
                          {q.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(q.id)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Archive question"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{questions.length}</strong> of <strong className="text-white">{total}</strong> questions
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit / Create Modal */}
      {isEditModalOpen && (
        <AdminQuestionModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingQuestion(null);
          }}
          questionToEdit={editingQuestion}
          topics={topics}
          onSaved={() => {
            loadQuestions();
            setActionSuccess('Question saved successfully');
            setTimeout(() => setActionSuccess(null), 3000);
          }}
        />
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{previewQuestion.title}</h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5">{previewQuestion.id} · {previewQuestion.difficulty}</div>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <div className="font-bold text-slate-400 uppercase text-[10px] mb-1">Description</div>
                <p className="whitespace-pre-line leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">{previewQuestion.description || 'No description provided.'}</p>
              </div>

              {previewQuestion.constraints && (
                <div>
                  <div className="font-bold text-slate-400 uppercase text-[10px] mb-1">Constraints</div>
                  <pre className="whitespace-pre-line bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px]">{previewQuestion.constraints}</pre>
                </div>
              )}

              {previewQuestion.solution_approach && (
                <div>
                  <div className="font-bold text-cyan-400 uppercase text-[10px] mb-1">Solution Approach</div>
                  <p className="whitespace-pre-line bg-cyan-950/20 p-3 rounded-xl border border-cyan-900/30 text-cyan-200">{previewQuestion.solution_approach}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
