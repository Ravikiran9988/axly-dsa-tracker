import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AdminDailyChallengeModal from '../components/AdminDailyChallengeModal';
import AdminScheduleDailyModal from '../components/AdminScheduleDailyModal';
import {
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Flame,
  Zap,
  Code2,
  Clock,
  ArrowRight,
  Sparkles,
  Edit2,
  Archive,
  Eye,
  Check,
  X,
  Layers,
  HelpCircle,
  BookOpen,
  CalendarDays,
  Clock3,
  Trash2,
  Send,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

export default function AdminDailyChallenge({ onSelectProblem }) {
  const [challenges, setChallenges] = useState([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, published: 0, scheduled: 0, active: 0, archived: 0 });
  const [todayChallenge, setTodayChallenge] = useState(null);
  const [nextScheduledChallenge, setNextScheduledChallenge] = useState(null);
  const [topics, setTopics] = useState([]);
  const [patterns, setPatterns] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topicId, setTopicId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals & Action States
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitialMode, setCreateModalInitialMode] = useState('manual');
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [schedulingChallenge, setSchedulingChallenge] = useState(null);
  const [previewChallenge, setPreviewChallenge] = useState(null);
  const [deletingChallenge, setDeletingChallenge] = useState(null);

  useEffect(() => {
    loadTaxonomy();
  }, []);

  useEffect(() => {
    loadData();
  }, [difficulty, topicId, statusFilter, dateFilter]);

  async function loadTaxonomy() {
    try {
      const [tRes, pRes] = await Promise.all([
        api.getTopics().catch(() => ({ data: [] })),
        api.getPatterns().catch(() => ({ data: [] }))
      ]);
      setTopics(tRes.data || []);
      setPatterns(pRes.data || []);
    } catch {}
  }

  async function loadData() {
    setLoading(true);
    setActionError(null);
    try {
      const res = await api.getDailyChallenges({
        difficulty: difficulty || undefined,
        topic_id: topicId || undefined,
        status: statusFilter || undefined,
        date: dateFilter || undefined,
        search: search.trim() || undefined
      });

      setChallenges(res.data || []);
      if (res.stats) setStats(res.stats);
      setTodayChallenge(res.today_challenge || null);
      setNextScheduledChallenge(res.next_scheduled_challenge || null);
    } catch (err) {
      setActionError(err.message || 'Failed to load Daily Challenge data');
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleTogglePublish = async (challenge) => {
    try {
      if (challenge.status === 'published') {
        await api.unpublishDailyChallenge(challenge.id);
        setActionSuccess(`"${challenge.title}" unpublished (set to draft/scheduled)`);
      } else {
        await api.publishDailyChallenge(challenge.id);
        setActionSuccess(`"${challenge.title}" published for students!`);
      }
      await loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setActionError(err.message || 'Failed to update publication status');
    }
  };

  const handleArchive = async (challengeId) => {
    if (!window.confirm('Archive this Daily Challenge?')) return;
    try {
      await api.archiveDailyChallenge(challengeId);
      setActionSuccess('Daily Challenge archived successfully');
      await loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setActionError(err.message || 'Failed to archive');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingChallenge) return;
    try {
      await api.deleteDailyChallenge(deletingChallenge.id);
      setActionSuccess(`Deleted "${deletingChallenge.title}" successfully`);
      setDeletingChallenge(null);
      await loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setActionError(err.message || 'Failed to delete challenge');
    }
  };

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const statusColors = {
    published: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    scheduled: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    draft: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    active: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    completed: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    archived: 'text-slate-500 bg-slate-500/10 border-slate-500/20'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Flame className="w-4 h-4 fill-amber-400" />
            <span>DAILY CHALLENGE SYSTEM</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Daily Challenge Portal
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Author independent competitive problems manually or generate them with AI. Daily Challenges are strictly separated from Practice questions.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setCreateModalInitialMode('ai');
              setIsCreateModalOpen(true);
            }}
            className="btn-secondary btn-sm inline-flex items-center gap-1.5 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Generate</span>
          </button>

          <button
            onClick={() => {
              setCreateModalInitialMode('manual');
              setIsCreateModalOpen(true);
            }}
            className="btn-primary btn-sm inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Daily Challenge</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono uppercase">Total Challenges</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{stats.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
          <div className="text-[11px] text-emerald-400 font-mono uppercase">Published</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{stats.published}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20">
          <div className="text-[11px] text-cyan-400 font-mono uppercase">Scheduled</div>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-1">{stats.scheduled}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20">
          <div className="text-[11px] text-amber-400 font-mono uppercase">Drafts</div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{stats.draft}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-500 font-mono uppercase">Archived</div>
          <div className="text-2xl font-black text-slate-500 font-mono mt-1">{stats.archived}</div>
        </div>
      </div>

      {/* Today's & Next Scheduled Live Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Active Challenge */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-amber-400 font-mono uppercase">TODAY'S ACTIVE CHALLENGE</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {new Date().toISOString().split('T')[0]}
            </span>
          </div>

          {todayChallenge ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white hover:text-amber-300 transition-colors cursor-pointer"
                    onClick={() => setPreviewChallenge(todayChallenge)}>
                  {todayChallenge.title}
                </h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${difficultyColors[todayChallenge.difficulty?.toLowerCase()] || ''}`}>
                  {todayChallenge.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>{todayChallenge.topic_name || 'General DSA'}</span>
                <span>&middot;</span>
                <span className="text-amber-400">+{todayChallenge.points || 100} pts</span>
                <span>&middot;</span>
                <span className="text-slate-400">{todayChallenge.created_via === 'ai' ? '✨ AI' : '✍ Manual'}</span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-slate-500 italic flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500/60" />
              <span>No challenge scheduled for today yet.</span>
            </div>
          )}
        </div>

        {/* Next Scheduled Challenge */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400 font-mono uppercase">NEXT SCHEDULED CHALLENGE</span>
            </div>
            {nextScheduledChallenge?.scheduled_date && (
              <span className="text-[11px] text-cyan-300 font-mono">
                {nextScheduledChallenge.scheduled_date}
              </span>
            )}
          </div>

          {nextScheduledChallenge ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer"
                    onClick={() => setPreviewChallenge(nextScheduledChallenge)}>
                  {nextScheduledChallenge.title}
                </h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${difficultyColors[nextScheduledChallenge.difficulty?.toLowerCase()] || ''}`}>
                  {nextScheduledChallenge.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>{nextScheduledChallenge.topic_name || 'General DSA'}</span>
                <span>&middot;</span>
                <span className="text-cyan-400">+{nextScheduledChallenge.points || 100} pts</span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-slate-500 italic flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-cyan-500/60" />
              <span>No upcoming challenges scheduled.</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search challenges by title or topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-8 w-full text-xs"
            />
          </div>
          <button type="submit" className="btn-secondary btn-sm text-xs">Search</button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="input-field py-1.5 text-xs font-mono"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-1.5 text-xs font-mono"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setDifficulty('');
              setTopicId('');
              setStatusFilter('');
              setDateFilter('');
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Daily Challenge Repository Table */}
      <div className="card overflow-hidden border border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div>
            <h3 className="text-sm font-bold text-white">Daily Challenge Repository</h3>
            <p className="text-[11px] text-slate-400">All authored competitive challenges, scheduled dates, and creation sources</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {challenges.length} Problem{challenges.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3.5 px-4 font-semibold">Title</th>
                <th className="py-3.5 px-3 font-semibold">Difficulty</th>
                <th className="py-3.5 px-3 font-semibold">Topic</th>
                <th className="py-3.5 px-3 font-semibold">Pattern</th>
                <th className="py-3.5 px-3 font-semibold">Points</th>
                <th className="py-3.5 px-3 font-semibold">Status</th>
                <th className="py-3.5 px-3 font-semibold">Scheduled Date</th>
                <th className="py-3.5 px-3 font-semibold">Created Via</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={9} className="py-4 px-4 text-center text-slate-500">Loading daily challenges...</td>
                  </tr>
                ))
              ) : challenges.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    No Daily Challenges found. Click <strong>+ Create Daily Challenge</strong> to author or generate one.
                  </td>
                </tr>
              ) : (
                challenges.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                    {/* Title */}
                    <td className="py-3 px-4">
                      <div className="font-sans font-bold text-slate-200 hover:text-amber-400 transition-colors cursor-pointer"
                           onClick={() => setPreviewChallenge(c)}>
                        {c.title}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{c.slug || c.id}</div>
                    </td>

                    {/* Difficulty */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${difficultyColors[c.difficulty?.toLowerCase()] || ''}`}>
                        {c.difficulty}
                      </span>
                    </td>

                    {/* Topic */}
                    <td className="py-3 px-3 text-slate-300 font-sans">
                      {c.topic_name || 'Arrays'}
                    </td>

                    {/* Pattern */}
                    <td className="py-3 px-3 text-slate-400 text-[11px] font-sans">
                      {c.pattern_name || c.pattern || '—'}
                    </td>

                    {/* Points */}
                    <td className="py-3 px-3 font-bold text-amber-400">
                      +{c.points || 100}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColors[c.status?.toLowerCase()] || ''}`}>
                        {c.status}
                      </span>
                    </td>

                    {/* Scheduled Date */}
                    <td className="py-3 px-3 text-slate-300">
                      {c.scheduled_date ? (
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {c.scheduled_date}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Created Via */}
                    <td className="py-3 px-3">
                      {c.created_via === 'ai' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> AI
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1">
                          ✍ Manual
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewChallenge(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setEditingChallenge(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          title="Edit Challenge"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSchedulingChallenge(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          title="Schedule Date"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleTogglePublish(c)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            c.status === 'published'
                              ? 'text-emerald-400 hover:text-amber-400 hover:bg-slate-800'
                              : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                          }`}
                          title={c.status === 'published' ? 'Unpublish to Draft' : 'Publish for Students'}
                        >
                          {c.status === 'published' ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => setDeletingChallenge(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete Challenge"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation / Edit Modal */}
      <AdminDailyChallengeModal
        isOpen={isCreateModalOpen || Boolean(editingChallenge)}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingChallenge(null);
        }}
        challengeToEdit={editingChallenge}
        initialMode={createModalInitialMode}
        topics={topics}
        patterns={patterns}
        onSaved={loadData}
      />

      {/* Scheduling Modal */}
      {schedulingChallenge && (
        <AdminScheduleDailyModal
          isOpen={Boolean(schedulingChallenge)}
          onClose={() => setSchedulingChallenge(null)}
          challenge={schedulingChallenge}
          onScheduled={loadData}
        />
      )}

      {/* Details Preview Modal */}
      {previewChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${difficultyColors[previewChallenge.difficulty?.toLowerCase()] || ''}`}>
                  {previewChallenge.difficulty}
                </span>
                <h3 className="text-base font-bold text-white">{previewChallenge.title}</h3>
              </div>
              <button onClick={() => setPreviewChallenge(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">Problem Description</span>
                <p className="text-slate-200 whitespace-pre-line mt-1">{previewChallenge.description}</p>
              </div>

              {previewChallenge.constraints && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">Constraints</span>
                  <p className="text-slate-300 font-mono text-[11px] mt-1 whitespace-pre-line">{previewChallenge.constraints}</p>
                </div>
              )}

              {previewChallenge.editorial && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-mono font-bold text-amber-400 uppercase">Editorial / Solution Approach</span>
                  <p className="text-slate-300 mt-1 whitespace-pre-line">{previewChallenge.editorial}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setPreviewChallenge(null)} className="btn-secondary btn-sm text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0B0F19] border border-rose-500/30 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Daily Challenge?</h3>
                <p className="text-[11px] text-slate-400">This action will permanently delete the problem and its test cases.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <strong className="text-white">{deletingChallenge.title}</strong>
              <div className="text-slate-500 text-[11px] mt-0.5">{deletingChallenge.id} &middot; {deletingChallenge.difficulty}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setDeletingChallenge(null)} className="btn-secondary btn-sm text-xs">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="btn-primary btn-sm text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold">
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
