import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AdminQuestionModal from '../components/AdminQuestionModal';
import AdminQuestionPreview from '../components/AdminQuestionPreview';
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
  BookOpen,
  Play,
  Bot,
  Zap
} from 'lucide-react';

export default function AdminQuestions({ onSelectProblem, onOpenCreateModal }) {
  const navigate = useNavigate();
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

  // AI Generation State
  const [automationStatus, setAutomationStatus] = useState(null);
  const [automationSettings, setAutomationSettings] = useState({ is_enabled: true, mode: 'auto_fill', retry_limit: 3 });
  const [automationLogs, setAutomationLogs] = useState([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);

  useEffect(() => {
    loadTopicsAndPatterns();
    loadAutomationStatus();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [page, difficulty, topicId, status]);

  async function loadAutomationStatus() {
    try {
      const res = await api.getQuestionBankGenerationStatus();
      if (res) setAutomationStatus(res);
      
      const [settingsRes, logsRes] = await Promise.all([
        api.getQuestionBankAutomationSettings().catch(() => null),
        api.getQuestionBankAutomationLogs(20).catch(() => null)
      ]);
      if (settingsRes) setAutomationSettings(settingsRes);
      if (logsRes) setAutomationLogs(logsRes);
    } catch (err) {
      console.error('Failed to load QB automation data', err);
    }
  }

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

  const handleUpdateAutomationMode = async (newMode) => {
    try {
      await api.updateQuestionBankAutomationSettings({ mode: newMode });
      setAutomationSettings(prev => ({ ...prev, mode: newMode }));
      setActionSuccess(`Automation mode updated to ${newMode.toUpperCase().replace('_', ' ')}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) { alert(err.message || 'Failed to update automation mode'); }
  };

  const handleToggleAutomationEnabled = async () => {
    try {
      const nextEnabled = !automationSettings.is_enabled;
      await api.updateQuestionBankAutomationSettings({ is_enabled: nextEnabled });
      setAutomationSettings(prev => ({ ...prev, is_enabled: nextEnabled }));
      setActionSuccess(`Automation ${nextEnabled ? 'enabled' : 'disabled'}`); setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) { alert(err.message || 'Failed to toggle automation'); }
  };

  const handleRunAutoFillNow = async () => {
    setIsRunningAutomation(true);
    try {
      const res = await api.generateQuestionBankManualAI();
      if (res && res.success) {
        setActionSuccess('Auto-fill generated 1 new question successfully!');
        loadQuestions();
        loadAutomationStatus();
      } else {
        alert(res?.error || 'Automatic challenge generation failed. Admin action required.');
      }
    } catch (err) { 
      alert(err.message || 'Automatic challenge generation failed.'); 
    } finally {
      setIsRunningAutomation(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
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

  const handleDelete = async (questionId) => {
    if (!window.confirm('Delete this question? This action cannot be undone and will permanently remove the question from the database.')) return;
    try {
      await api.deleteQuestion(questionId);
      setActionSuccess('Question deleted successfully');
      loadQuestions();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
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

      {automationStatus && (
        <div className="p-5 rounded-3xl bg-theme-surface border border-cyan-500/30 space-y-4 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme-border min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-theme-text1 truncate">QUESTION BANK AUTOMATION</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase shrink-0 ${automationSettings.is_enabled ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-theme-surface2 text-theme-text2'}`}>
                    {automationSettings.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-[11px] text-theme-text2 truncate">
                  Generates up to 12 questions/day (every 2 hours). Current Slot: {automationStatus.current_slot}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button onClick={handleRunAutoFillNow} disabled={isRunningAutomation} className="btn-primary btn-sm inline-flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shrink-0">
                {isRunningAutomation ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Running...</span></> : <><Play className="w-3.5 h-3.5 fill-current" /><span>Run Auto-Fill Now</span></>}
              </button>
              <button onClick={() => setShowLogsModal(true)} className="btn-secondary btn-sm text-xs text-theme-text2 hover:text-theme-text1 shrink-0">
                Logs ({automationLogs.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-theme-surface border border-theme-border space-y-1.5">
              <div className="text-[10px] font-mono text-theme-text2 uppercase">Automation Mode</div>
              <div className="flex items-center gap-1 pt-1">
                <button onClick={() => handleUpdateAutomationMode('ai_assist')} className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all ${automationSettings.mode === 'ai_assist' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30' : 'bg-theme-surface text-theme-text2 hover:text-theme-text1'}`}>AI Assist</button>
                <button onClick={() => handleUpdateAutomationMode('auto_fill')} className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all ${automationSettings.mode === 'auto_fill' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30' : 'bg-theme-surface text-theme-text2 hover:text-theme-text1'}`}>Auto Fill</button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-theme-surface border border-theme-border space-y-1 font-mono">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-theme-text2 uppercase">Daily Quota</div>
                <button onClick={handleToggleAutomationEnabled} className="text-xs text-cyan-400 hover:text-cyan-300">Toggle Power</button>
              </div>
              <div className="text-theme-text1 font-bold pt-1 text-lg">
                {automationStatus.generated_today} <span className="text-sm text-theme-text3">/ 12</span>
              </div>
              <div className="text-[11px] text-cyan-400">Slots Generated Today</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-theme-surface border border-theme-border space-y-1 font-mono">
              <div className="text-[10px] text-theme-text2 uppercase">Last Execution Status</div>
              <div className="flex items-center gap-2 pt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${automationSettings.last_run_status === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : automationSettings.last_run_status === 'failed' ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 'text-theme-text2 bg-theme-surface2'}`}>
                  {automationSettings.last_run_status || 'Never Run'}
                </span>
                <span className="text-[10px] text-theme-text3">{automationSettings.last_run_at ? new Date(automationSettings.last_run_at).toLocaleTimeString() : ''}</span>
              </div>
              <div className="text-[10px] text-theme-text3">Retry limit: {automationSettings.retry_limit || 3} attempts</div>
            </div>
          </div>
        </div>
      )}

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
          <>
            <div className="hidden md:block overflow-x-auto">
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
                          onClick={(e) => { e.stopPropagation(); setPreviewQuestion(q); }}
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
                            onClick={(e) => { e.stopPropagation(); setPreviewQuestion(q); }}
                            className="p-1.5 rounded-lg border border-theme-border text-theme-text2 hover:text-cyan-400 hover:bg-theme-surface2 transition-colors"
                            title="Preview question"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Solve */}
                          {true && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/solve/${q.id}`); }}
                              className="p-1.5 rounded-lg border border-theme-border text-theme-text2 hover:text-emerald-400 hover:bg-theme-surface2 transition-colors"
                              title="Solve in coding workspace"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
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
                            onClick={(e) => { e.stopPropagation(); handleTogglePublish(q); }}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              q.status === 'published'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                            title={q.status === 'published' ? 'Unpublish to Draft' : 'Publish Question'}
                          >
                            {q.status === 'published' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete */}
                          {q.status !== 'archived' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                              className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Mobile List View */}
          <div className="md:hidden flex flex-col divide-y divide-theme-border">
            {questions.map((q) => {
              const topicName = topics.find(t => t.id === q.topic_id)?.name || q.topic_name || q.topic_id || '—';
              return (
                <div key={q.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div 
                        onClick={(e) => { e.stopPropagation(); setPreviewQuestion(q); }}
                        className="font-medium text-theme-text1 hover:text-cyan-500 transition-colors leading-snug cursor-pointer truncate"
                      >
                        {q.title}
                      </div>
                      <div className="text-[10px] text-theme-text3 font-mono mt-0.5 truncate">{q.id}</div>
                    </div>
                    <div className="shrink-0">
                      <DifficultyBadge difficulty={q.difficulty} />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] text-theme-text2">
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${q.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : q.status === 'draft' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {q.status}
                    </span>
                    <span>•</span>
                    <span className="truncate">{topicName}</span>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-theme-border">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewQuestion(q); }}
                      className="p-1.5 rounded-lg border border-theme-border text-theme-text2 hover:text-cyan-400 hover:bg-theme-surface2 transition-colors"
                      title="Preview question"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {true && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/solve/${q.id}`); }}
                        className="p-1.5 rounded-lg border border-theme-border text-theme-text2 hover:text-emerald-400 hover:bg-theme-surface2 transition-colors"
                        title="Solve in coding workspace"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingQuestion(q);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-theme-border text-theme-text2 hover:text-indigo-400 hover:bg-theme-surface2 transition-colors"
                      title="Edit question details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePublish(q); }}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        q.status === 'published'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                      title={q.status === 'published' ? 'Unpublish to Draft' : 'Publish Question'}
                    >
                      {q.status === 'published' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    {q.status !== 'archived' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                        className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>
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
        <AdminQuestionPreview 
          itemId={previewQuestion.id} 
          type="question" 
          onClose={() => setPreviewQuestion(null)} 
        />
      )}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface border border-theme-border rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto custom-scrollbar p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-theme-text1">Question Bank Automation Logs</h3>
              </div>
              <button onClick={() => setShowLogsModal(false)} className="text-theme-text2 hover:text-theme-text1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {automationLogs.length === 0 ? (
                <div className="py-8 text-center text-theme-text3 text-xs">No automation run logs found.</div>
              ) : (
                automationLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-theme-surface border border-theme-border text-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.status === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : log.status === 'failed' ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 'text-theme-text2 bg-theme-surface2'}`}>
                          {log.status}
                        </span>
                        <span className="font-mono text-cyan-400 font-bold">Slot: {log.target_slot}</span>
                        <span className="text-theme-text3">Mode: {log.mode}</span>
                        {log.attempt_count > 0 && <span className="text-theme-text2">Attempts: {log.attempt_count}</span>}
                      </div>
                      <p className="text-[11px] text-theme-text2">{log.details || log.validation_result}</p>
                    </div>
                    <div className="text-[10px] text-theme-text3 font-mono shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-theme-border">
              <button onClick={() => setShowLogsModal(false)} className="btn-secondary btn-sm text-xs">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
