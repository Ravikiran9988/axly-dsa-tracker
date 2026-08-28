import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AdminQuestionModal from '../components/AdminQuestionModal';
import AdminAssignModal from '../components/AdminAssignModal';
import {
  Code2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  History,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Layers,
  Send,
  Eye,
  Check,
  X,
  RotateCcw
} from 'lucide-react';

export default function AdminQuestions({ onSelectProblem, onOpenCreateModal, onOpenAssignModal }) {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topicId, setTopicId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Modals & Actions
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetQuestion, setAssignTargetQuestion] = useState(null);
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState(null);
  const [versionModalQuestion, setVersionModalQuestion] = useState(null);
  const [versionsList, setVersionsList] = useState([]);
  const [selectedVersionDiff, setSelectedVersionDiff] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => {
    loadTopics();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [page, difficulty, topicId, status]);

  async function loadTopics() {
    try {
      const res = await api.getTopics();
      setTopics(res.data || []);
    } catch {}
  }

  async function loadQuestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getQuestions({
        page,
        limit,
        search: search || undefined,
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

  const handleDelete = async (questionId) => {
    try {
      await api.deleteQuestion(questionId);
      setDeleteConfirmQuestion(null);
      setActionSuccess('Question deleted successfully');
      loadQuestions();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleValidate = async (questionId) => {
    try {
      const res = await api.validateQuestion(questionId);
      setValidationResult(res.data);
    } catch (err) {
      alert(`Validation error: ${err.message}`);
    }
  };

  const handleOpenVersions = async (q) => {
    setVersionModalQuestion(q);
    setSelectedVersionDiff(null);
    try {
      const res = await api.getQuestionVersions(q.id);
      setVersionsList(res.data || []);
    } catch (err) {
      alert(`Failed to load versions: ${err.message}`);
    }
  };

  const handleRestoreVersion = async (questionId, version) => {
    if (!window.confirm(`Restore question to version ${version}? Current changes will be snapshotted as a new version.`)) return;
    try {
      await api.restoreQuestionVersion(questionId, version);
      setActionSuccess(`Restored to version ${version}`);
      setVersionModalQuestion(null);
      loadQuestions();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      alert(`Restore failed: ${err.message}`);
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
            <span>Problem Repository</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Question Management
          </h1>
          <p className="text-xs text-slate-400">
            Create, edit, validate, version, and manage algorithmic coding challenges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateModal}
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
          <div className="relative flex-1 min-w-[200px]">
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
            onClick={loadQuestions}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {/* Questions Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
            <div className="text-xs font-mono">Loading problem repository...</div>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-xs">{error}</div>
        ) : questions.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs space-y-2">
            <div>No questions match the current filter criteria.</div>
            <button
              onClick={onOpenCreateModal}
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
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned</th>
                  <th className="py-3.5 px-4">Version</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-850/40 transition-colors group">
                    {/* Title */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {q.title}
                      </div>
                      {q.points && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          {q.points} points &bull; {q.estimated_time || '30 mins'}
                        </div>
                      )}
                    </td>

                    {/* Topic */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                        {q.topic_name || 'General'}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${difficultyColors[q.difficulty?.toLowerCase()] || ''}`}>
                        {q.difficulty}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-bold uppercase text-[9px] border ${statusColors[q.status?.toLowerCase()] || statusColors.published}`}>
                        {q.status || 'published'}
                      </span>
                    </td>

                    {/* Assigned count */}
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {q.active_assignees_count || 0} learners
                    </td>

                    {/* Version */}
                    <td className="py-3.5 px-4 font-mono">
                      <button
                        onClick={() => handleOpenVersions(q)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[10px] border border-slate-700"
                        title="View version history"
                      >
                        v{q.current_version || 1}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Preview / Solve */}
                        {onSelectProblem && (
                          <button
                            onClick={() => onSelectProblem(q.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Preview in code workspace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Quick Assign */}
                        <button
                          onClick={() => {
                            if (onOpenAssignModal) onOpenAssignModal(null, q);
                            else {
                              setAssignTargetQuestion(q);
                              setIsAssignModalOpen(true);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300"
                          title="Assign to learner"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        {/* Validate */}
                        <button
                          onClick={() => handleValidate(q.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400"
                          title="Check publish validation"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingQuestion(q);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                          title="Edit question"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteConfirmQuestion(q)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          title="Delete question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <span className="text-slate-400 font-mono">
            Page {page} of {totalPages} ({total} total questions)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Edit Question Modal */}
      {isEditModalOpen && (
        <AdminQuestionModal
          isOpen={isEditModalOpen}
          initialData={editingQuestion}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingQuestion(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setEditingQuestion(null);
            setActionSuccess('Question updated successfully');
            loadQuestions();
            setTimeout(() => setActionSuccess(null), 3000);
          }}
        />
      )}

      {/* Version History Modal */}
      {versionModalQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] text-cyan-400 font-mono uppercase font-bold">Version History</div>
                <h3 className="text-sm font-bold text-white">{versionModalQuestion.title}</h3>
              </div>
              <button
                onClick={() => setVersionModalQuestion(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {versionsList.map((v) => (
                <div key={v.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white font-mono">v{v.version}</span>
                    <span className="text-slate-400 text-[11px] ml-2">
                      ({v.change_type}) &bull; {new Date(v.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRestoreVersion(versionModalQuestion.id, v.version)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-semibold hover:bg-amber-500/20"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setVersionModalQuestion(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Result Modal */}
      {validationResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <h3 className="text-sm font-bold text-white">Publish Quality Check</h3>
              </div>
              <button
                onClick={() => setValidationResult(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400"
              >
                ✕
              </button>
            </div>

            {validationResult.valid ? (
              <p className="text-xs text-emerald-300">
                All quality checks passed! Question meets all standards for production publishing.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-amber-300 font-semibold">Issues requiring resolution before publishing:</p>
                <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                  {validationResult.issues?.map((iss, i) => (
                    <li key={i}>{iss.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setValidationResult(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0F1D] border border-rose-900/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Question?</h3>
                <p className="text-xs text-slate-400">This action will deactivate the question from learner view.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white">
              "{deleteConfirmQuestion.title}"
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmQuestion(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmQuestion.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
