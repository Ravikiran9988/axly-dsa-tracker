import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { practiceApi } from '../services/practiceApi';
import {
  Plus,
  Sparkles,
  Search,
  Trash2,
  Pencil,
  Users,
  CheckCircle2,
  Layers,
  ArrowRight,
  X,
  Compass,
  RefreshCw,
  Eye
} from 'lucide-react';
import AdminQuestionModal from '../components/AdminQuestionModal';
import { DifficultyBadge, SkeletonRows, EmptyState } from '../components/ui/index.jsx';

export default function AdminCoreDashboard({ onSelectProblem, onNavigate }) {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [stats, setStats] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topicId, setTopicId] = useState('');
  const [patternId, setPatternId] = useState('');
  const [status, setStatus] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questionModal, setQuestionModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const hasFilters = Boolean(search || difficulty || topicId || patternId || status);

  useEffect(() => {
    loadTaxonomy();
  }, []);

  useEffect(() => {
    loadData();
  }, [difficulty, status]);

  async function loadTaxonomy() {
    try {
      const [tRes, pRes] = await Promise.all([
        practiceApi.getTopics().catch(() => ({ data: [] })),
        practiceApi.getPatterns().catch(() => ({ data: [] }))
      ]);
      setTopics(tRes.data || []);
      setPatterns(pRes.data || []);
    } catch {
      // silently fail fallback
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [q, s] = await Promise.all([
        api.getQuestions({
          difficulty: difficulty || undefined,
          status: status || undefined,
          limit: 150
        }),
        api.getAdminStats()
      ]);
      setQuestions(q.data || []);
      setStats(s.data || null);
    } catch (e) {
      setError(e.message || 'Failed to load administrator data');
    } finally {
      setLoading(false);
    }
  }

  const clearFilters = () => {
    setSearch('');
    setDifficulty('');
    setTopicId('');
    setPatternId('');
    setStatus('');
  };

  const save = async (data) => {
    setQuestionModal(false);
    setEditing(null);
    await loadData();
  };

  const remove = async (q) => {
    if (!window.confirm(`Deactivate or delete challenge "${q.title}"?`)) return;
    try {
      await api.deleteQuestion(q.id);
      await loadData();
    } catch (e) {
      setError(e.message || 'Unable to delete question');
    }
  };

  // Client-side filtering for fast responsive typing
  const filteredQuestions = questions.filter((q) => {
    if (search) {
      const s = search.toLowerCase();
      const matchTitle = q.title?.toLowerCase().includes(s);
      const matchTopic = q.topic_name?.toLowerCase().includes(s);
      if (!matchTitle && !matchTopic) return false;
    }
    if (difficulty && q.difficulty?.toLowerCase() !== difficulty.toLowerCase()) {
      return false;
    }
    if (topicId && String(q.topic_id) !== String(topicId)) {
      return false;
    }
    if (patternId && String(q.pattern_id) !== String(patternId)) {
      return false;
    }
    if (status && q.status?.toLowerCase() !== status.toLowerCase()) {
      return false;
    }
    return true;
  });

  const publishedCount = questions.filter((q) => q.status === 'published').length;
  const draftCount = questions.filter((q) => q.status === 'draft').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-theme-text1 tracking-tight">Admin</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
              CORE
            </span>
          </div>
          <p className="text-sm text-theme-text2 mt-0.5">
            Manage the practice question library, daily challenges, and curriculum
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate && onNavigate('admin-daily')}
            className="btn-secondary btn-sm h-9 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Daily Challenge</span>
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setQuestionModal(true);
            }}
            className="btn-primary btn-sm h-9 flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Primary 3-Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="card p-4 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs text-theme-text3 font-semibold uppercase tracking-wider">
              Students
            </span>
            <div className="text-2xl font-black text-theme-text1 mt-1">
              {loading ? (
                <span className="text-sm text-theme-text3 animate-pulse">Loading...</span>
              ) : (
                stats?.total_users ?? stats?.students?.total ?? stats?.total_students ?? 0
              )}
            </div>
            <div className="text-[11px] text-theme-text2 font-mono mt-0.5">
              Active platform accounts
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs text-theme-text3 font-semibold uppercase tracking-wider">
              Practice Questions
            </span>
            <div className="text-2xl font-black text-theme-text1 mt-1">
              {loading ? (
                <span className="text-sm text-theme-text3 animate-pulse">Loading...</span>
              ) : (
                stats?.total_active_questions ?? stats?.questions?.total ?? questions.length ?? 0
              )}
            </div>
            <div className="text-[11px] text-theme-text2 font-mono mt-0.5">
              {publishedCount} published • {draftCount} drafts
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs text-theme-text3 font-semibold uppercase tracking-wider">
              Solved
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {loading ? (
                <span className="text-sm text-theme-text3 animate-pulse">Loading...</span>
              ) : (
                stats?.total_solved_submissions ?? stats?.solved ?? stats?.submissions?.solved ?? 0
              )}
            </div>
            <div className="text-[11px] text-emerald-400/80 font-mono mt-0.5">
              Verified problem submissions
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar (Matching Practice Library Exactly) */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-theme-text3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            aria-label="Search questions"
            className="input-field pl-9 py-1.5 text-sm h-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text3 hover:text-theme-text2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Difficulty */}
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          aria-label="Filter by difficulty"
          className="select-field h-9 text-sm"
        >
          <option value="">Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        {/* Topic */}
        <select
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          aria-label="Filter by topic"
          className="select-field h-9 text-sm"
        >
          <option value="">Topic</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {/* Pattern */}
        <select
          value={patternId}
          onChange={(e) => setPatternId(e.target.value)}
          aria-label="Filter by pattern"
          className="select-field h-9 text-sm"
        >
          <option value="">Pattern</option>
          {patterns.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="select-field h-9 text-sm"
        >
          <option value="">Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="btn-ghost btn-sm flex items-center gap-1.5 h-9"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-md text-theme-text3 hover:text-theme-text1 hover:bg-theme-surface2 transition-colors ml-auto"
          title="Refresh repository"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Practice Question Bank Table (Data-Table matching student UI) */}
      <div className="card overflow-hidden">
        {/* Table Card Header */}
        <div className="px-5 py-3.5 border-b border-theme-border flex items-center justify-between bg-theme-surface/50">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-theme-text1">Practice Question Bank</h2>
            <span className="text-xs font-mono text-theme-text3">
              ({filteredQuestions.length})
            </span>
          </div>
          <div className="text-xs text-theme-text3 font-mono">
            {questions.length} problems &bull; {publishedCount} published
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>Problem</th>
                <th className="hidden sm:table-cell">Difficulty</th>
                <th className="hidden md:table-cell">Topic</th>
                <th className="hidden lg:table-cell">Pattern</th>
                <th className="hidden lg:table-cell w-24">Est. Time</th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="text-right w-36">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows count={8} cols={8} />
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-0 border-0">
                    <EmptyState
                      icon={Compass}
                      title="No questions match your filters"
                      description="Try adjusting your search keywords or clearing active filters."
                      action={
                        <button
                          onClick={() => {
                            setEditing(null);
                            setQuestionModal(true);
                          }}
                          className="btn-primary btn-sm mt-2 flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add First Question
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const topicName =
                    topics.find((t) => t.id === q.topic_id)?.name ||
                    q.topic_name ||
                    '—';
                  const patternName =
                    patterns.find((p) => p.id === q.pattern_id)?.name ||
                    q.pattern_name ||
                    '—';

                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-theme-surface2 transition-colors group"
                    >
                      {/* # */}
                      <td className="text-center text-theme-text3 font-mono text-xs w-12">
                        {idx + 1}
                      </td>

                      {/* Problem Title */}
                      <td>
                        <div
                          onClick={() => onSelectProblem && onSelectProblem(q.id)}
                          className="font-medium text-theme-text1 group-hover:text-cyan-500 transition-colors leading-snug cursor-pointer"
                        >
                          {q.title}
                        </div>
                      </td>

                      {/* Difficulty Badge */}
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

                      {/* Est. Time */}
                      <td className="hidden lg:table-cell text-theme-text3 font-mono text-xs">
                        {q.estimated_time || '15 mins'}
                      </td>

                      {/* Status */}
                      <td className="hidden sm:table-cell">
                        <span
                          className={`badge text-[10px] uppercase font-bold ${
                            q.status === 'published'
                              ? 'badge-solved'
                              : q.status === 'draft'
                              ? 'badge-prog'
                              : 'badge-neutral'
                          }`}
                        >
                          {q.status || 'published'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectProblem && onSelectProblem(q.id)}
                            className="btn-primary btn-sm inline-flex items-center gap-1"
                            title="Solve / Test problem in workspace"
                          >
                            <span>Solve</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditing(q);
                              setQuestionModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-theme-border text-theme-text2 hover:text-theme-text1 hover:bg-theme-surface2 transition-colors"
                            title="Edit challenge details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => remove(q)}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                            title="Deactivate challenge"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Question Modal */}
      {questionModal && (
        <AdminQuestionModal
          isOpen={questionModal}
          questionToEdit={editing}
          question={editing}
          topics={topics}
          onClose={() => {
            setQuestionModal(false);
            setEditing(null);
          }}
          onSuccess={save}
          onSaved={save}
        />
      )}
    </div>
  );
}
