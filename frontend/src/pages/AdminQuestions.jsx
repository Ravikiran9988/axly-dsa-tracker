import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AdminQuestionModal from '../components/AdminQuestionModal';
import { DifficultyBadge } from '../components/ui/index.jsx';
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
    archived: 'text-theme-text2 bg-slate-500/10 border-slate-500/20'
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-theme-surface border border-theme-border backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Code2 className="w-4 h-4" />
            <span>Practice Problem Library</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-theme-text1 tracking-tight">
            Question Bank Management
          </h1>
          <p className="text-xs text-theme-text2">
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
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="contents">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-text3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search questions by title or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-1.5 text-sm h-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text3 hover:text-theme-text2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Difficulty Filter */}
          <select
            value={difficulty}
            onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
            className="select-field h-9 text-sm"
          >
            <option value="">Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Topic Filter */}
          <select
            value={topicId}
            onChange={(e) => { setTopicId(e.target.value); setPage(1); }}
            className="select-field h-9 text-sm"
          >
            <option value="">Topic</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="select-field h-9 text-sm"
          >
            <option value="">Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <button
            type="submit"
            className="btn-secondary btn-sm h-9"
          >
            Filter
          </button>

          {(search || difficulty || topicId || status) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setDifficulty(''); setTopicId(''); setStatus(''); setPage(1); loadQuestions(); }}
              className="btn-ghost btn-sm flex items-center gap-1 h-9"
            >
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          )}

          <button
            type="button"
            onClick={loadQuestions}
            disabled={loading}
            className="p-2 rounded-md text-theme-text3 hover:text-theme-text1 hover:bg-theme-surface2 transition-colors ml-auto"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {/* Questions Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-theme-text2 space-y-3">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
            <div className="text-xs font-mono">Loading questions...</div>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-xs">{error}</div>
        ) : questions.length === 0 ? (
          <div className="py-20 text-center text-theme-text3 text-xs space-y-2">
            <div>No questions match the current filter criteria.</div>
            <button
              onClick={() => { setEditingQuestion(null); setIsEditModalOpen(true); }}
              className="btn-primary btn-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create First Question
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">#</th>
                  <th>Problem</th>
                  <th className="hidden sm:table-cell">Difficulty</th>
                  <th className="hidden md:table-cell">Topic</th>
                  <th className="hidden lg:table-cell">Pattern</th>
                  <th className="hidden sm:table-cell">Status</th>
                  <th className="text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => {
                  const topicName = topics.find(t => t.id === q.topic_id)?.name || q.topic_name || q.topic_id || '—';
                  const patternName = patterns.find(p => p.id === q.pattern_id)?.name || q.pattern_id || '—';

                  return (
                    <tr key={q.id} className="hover:bg-theme-surface2 transition-colors group">
                      {/* # */}
                      <td className="text-center text-theme-text3 font-mono text-xs w-12">
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* Title */}
                      <td>
                        <div
                          onClick={() => onSelectProblem && onSelectProblem(q.id)}
                          className="font-medium text-theme-text1 group-hover:text-cyan-500 transition-colors leading-snug cursor-pointer"
                        >
                          {q.title}
                        </div>
                        <div className="text-[10px] text-theme-text3 font-mono mt-0.5">
                          {q.id}
                        </div>
                      </td>

                      {/* Difficulty */}
                      <td className="hidden sm:table-cell">
                        <DifficultyBadge difficulty={q.difficulty} />
                      </td>

                      {/* Topic */}
                      <td className="hidden md:table-cell text-theme-text2 text-xs">
                        {topicName}
                      </td>

                      {/* Pattern */}
                      <td className="hidden lg:table-cell text-theme-text2 font-mono text-xs">
                        {patternName}
                      </td>

                      {/* Status */}
                      <td className="hidden sm:table-cell">
                        <span className={`badge text-[10px] uppercase font-bold ${q.status === 'published' ? 'badge-solved' : q.status === 'draft' ? 'badge-prog' : 'badge-neutral'}`}>
                          {q.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {/* View Preview */}
                          <button
                            onClick={() => setPreviewQuestion(q)}
                            className="p-1.5 rounded-lg border border-theme-border text-theme-text2 hover:text-cyan-400 hover:bg-theme-surface2 transition-colors"
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
                            className="p-1.5 rounded-lg border border-theme-border text-theme-text2 hover:text-indigo-400 hover:bg-theme-surface2 transition-colors"
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
                              className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
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
        <div className="p-4 border-t border-theme-border bg-theme-surface flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-theme-text2">
          <div>
            Showing <strong className="text-theme-text1">{questions.length}</strong> of <strong className="text-theme-text1">{total}</strong> questions
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-theme-surface2 hover:bg-theme-surface2 disabled:opacity-40 disabled:cursor-not-allowed text-theme-text1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-theme-surface2 hover:bg-theme-surface2 disabled:opacity-40 disabled:cursor-not-allowed text-theme-text1"
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
          <div className="w-full max-w-2xl rounded-3xl bg-theme-surface border border-theme-border shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="text-base font-bold text-theme-text1">{previewQuestion.title}</h3>
                <div className="text-xs text-theme-text2 font-mono mt-0.5">{previewQuestion.id} · {previewQuestion.difficulty}</div>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-1.5 rounded-xl bg-theme-surface2 text-theme-text2 hover:text-theme-text1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-theme-text2">
              <div>
                <div className="font-bold text-theme-text2 uppercase text-[10px] mb-1">Description</div>
                <p className="whitespace-pre-line leading-relaxed bg-theme-surface p-3 rounded-xl border border-theme-border">{previewQuestion.description || 'No description provided.'}</p>
              </div>

              {previewQuestion.constraints && (
                <div>
                  <div className="font-bold text-theme-text2 uppercase text-[10px] mb-1">Constraints</div>
                  <pre className="whitespace-pre-line bg-theme-surface p-3 rounded-xl border border-theme-border font-mono text-[11px]">{previewQuestion.constraints}</pre>
                </div>
              )}

              {previewQuestion.solution_approach && (
                <div>
                  <div className="font-bold text-cyan-400 uppercase text-[10px] mb-1">Solution Approach</div>
                  <p className="whitespace-pre-line bg-cyan-950/20 p-3 rounded-xl border border-cyan-900/30 text-cyan-700 dark:text-cyan-200">{previewQuestion.solution_approach}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-theme-border">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 rounded-xl bg-theme-surface2 text-theme-text1 text-xs font-semibold"
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
