import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AdminDailyChallengeModal from '../components/AdminDailyChallengeModal';
import AdminScheduleDailyModal from '../components/AdminScheduleDailyModal';
import AdminCreateFromPracticeModal from '../components/AdminCreateFromPracticeModal';
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
  Clock3
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
  const [isFromPracticeModalOpen, setIsFromPracticeModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [schedulingChallenge, setSchedulingChallenge] = useState(null);
  const [previewChallenge, setPreviewChallenge] = useState(null);

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
      await api.publishDailyChallenge(challenge.id);
      setActionSuccess(`Status updated for "${challenge.title}"`);
      await loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setActionError(err.message || 'Failed to update status');
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Flame className="w-4 h-4 fill-amber-400" />
            <span>DAILY CHALLENGE MANAGEMENT</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Manage and schedule competitive daily problems.
          </h1>
          <p className="text-xs text-slate-400">
            Author independent daily challenges or instantiate challenges from practice problems for competitive leaderboards & streaks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Secondary Action: Create from Practice */}
          <button
            onClick={() => setIsFromPracticeModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Create from Practice Problem</span>
          </button>

          {/* Primary Action: Create New Daily Challenge */}
          <button
            onClick={() => {
              setEditingChallenge(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Daily Challenge</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Today's Challenge */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-amber-400">Today's Challenge</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-white mt-1.5 truncate">
            {todayChallenge ? todayChallenge.title : 'None scheduled'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {todayChallenge ? `${todayChallenge.difficulty?.toUpperCase()} · ${todayChallenge.points || 100} pts` : 'No active problem'}
          </div>
        </div>

        {/* Next Challenge */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-cyan-400">Next Challenge</span>
            <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white mt-1.5 truncate">
            {nextScheduledChallenge ? nextScheduledChallenge.title : 'None in queue'}
          </div>
          <div className="text-[11px] text-cyan-300 font-mono mt-0.5">
            {nextScheduledChallenge ? nextScheduledChallenge.scheduled_date : 'Schedule upcoming'}
          </div>
        </div>

        {/* Drafts */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono font-bold uppercase text-amber-400">Drafts</div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{stats.draft || 0}</div>
        </div>

        {/* Scheduled */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono font-bold uppercase text-cyan-400">Scheduled</div>
          <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">{stats.scheduled || 0}</div>
        </div>

        {/* Published */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono font-bold uppercase text-emerald-400">Published</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{stats.published || 0}</div>
        </div>
      </div>

      {/* Today's Featured Challenge & Next Challenge Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Challenge Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border border-amber-500/20 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase font-mono">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>Today's Featured Problem</span>
            </div>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{todayChallenge?.scheduled_date || new Date().toISOString().split('T')[0]}</span>
            </span>
          </div>

          {todayChallenge ? (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${difficultyColors[todayChallenge.difficulty?.toLowerCase()] || ''}`}>
                    {todayChallenge.difficulty}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{todayChallenge.topic_name || 'General DSA'}</span>
                  {todayChallenge.pattern_name && (
                    <span className="text-xs text-slate-500 font-mono">&bull; {todayChallenge.pattern_name}</span>
                  )}
                </div>
                <span className="text-xs text-amber-400 font-mono font-bold">{todayChallenge.points || 100} pts</span>
              </div>

              <h3 className="text-base font-bold text-white truncate">{todayChallenge.title}</h3>
              {todayChallenge.description && (
                <p className="text-xs text-slate-400 line-clamp-2">{todayChallenge.description}</p>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800/80">
                {onSelectProblem && (
                  <button
                    onClick={() => onSelectProblem(todayChallenge.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
                  >
                    <span>Solve in IDE</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
              No daily challenge active today. Schedule a challenge below to activate today's featured problem.
            </div>
          )}
        </div>

        {/* Next Scheduled Challenge Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase font-mono">
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              <span>Next Scheduled Challenge</span>
            </div>
            {nextScheduledChallenge && (
              <span className="text-xs text-cyan-400 font-mono flex items-center gap-1">
                <Clock3 className="w-3.5 h-3.5" />
                <span>{nextScheduledChallenge.scheduled_date}</span>
              </span>
            )}
          </div>

          {nextScheduledChallenge ? (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${difficultyColors[nextScheduledChallenge.difficulty?.toLowerCase()] || ''}`}>
                    {nextScheduledChallenge.difficulty}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{nextScheduledChallenge.topic_name || 'General DSA'}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {nextScheduledChallenge.status}
                </span>
              </div>

              <h3 className="text-base font-bold text-white truncate">{nextScheduledChallenge.title}</h3>
              {nextScheduledChallenge.description && (
                <p className="text-xs text-slate-400 line-clamp-2">{nextScheduledChallenge.description}</p>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800/80">
                <button
                  onClick={() => setPreviewChallenge(nextScheduledChallenge)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
              No future challenges queued. Use "Schedule" on any challenge in the repository to prepare upcoming daily challenges.
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search daily challenges by title or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <select
            value={topicId}
            onChange={e => setTopicId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
          >
            <option value="">All Topics</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400 font-mono"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-400 font-mono"
            title="Filter by Scheduled Date"
          />

          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              title="Clear date filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Daily Challenges Content Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Daily Challenge Repository
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono font-bold">
              {challenges.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
            <div className="text-xs font-mono">Loading Daily Challenges...</div>
          </div>
        ) : challenges.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs space-y-3">
            <div>No Daily Challenges found matching the current criteria.</div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setIsFromPracticeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold hover:bg-indigo-500/20 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Create from Practice</span>
              </button>
              <button
                onClick={() => {
                  setEditingChallenge(null);
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold hover:bg-amber-500/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Standalone</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Difficulty</th>
                  <th className="py-3.5 px-4">Topic</th>
                  <th className="py-3.5 px-4">Pattern</th>
                  <th className="py-3.5 px-4">Points</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Scheduled Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                {challenges.map(c => {
                  const topicName = topics.find(t => t.id === c.topic_id)?.name || c.topic_name || c.topic_id || 'General';
                  const patternName = patterns.find(p => p.id === c.pattern_id)?.name || c.pattern_name || c.pattern_id || '—';

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Title */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                          {c.title}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>{c.id}</span>
                          {c.source_question_id && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px]">
                              From Practice
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Difficulty */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${difficultyColors[c.difficulty?.toLowerCase()] || ''}`}>
                          {c.difficulty}
                        </span>
                      </td>

                      {/* Topic */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-300 font-medium">
                          {topicName}
                        </span>
                      </td>

                      {/* Pattern */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-400 font-mono text-[11px]">
                          {patternName}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-amber-400 font-bold">
                          {c.points || 100} pts
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${statusColors[c.status?.toLowerCase()] || statusColors.draft}`}>
                          {c.status}
                        </span>
                      </td>

                      {/* Scheduled Date */}
                      <td className="py-3.5 px-4">
                        {c.scheduled_date ? (
                          <div className="flex items-center gap-1 text-cyan-400 font-mono text-[11px]">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{c.scheduled_date}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">Unscheduled</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Preview */}
                          <button
                            onClick={() => setPreviewChallenge(c)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-colors"
                            title="Preview Challenge"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditingChallenge(c);
                              setIsCreateModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors"
                            title="Edit Challenge Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Schedule */}
                          <button
                            onClick={() => setSchedulingChallenge(c)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors"
                            title="Schedule Date"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Publish / Draft */}
                          <button
                            onClick={() => handleTogglePublish(c)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              c.status === 'published' || c.status === 'scheduled'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                            title={c.status === 'published' || c.status === 'scheduled' ? 'Unpublish to Draft' : 'Publish Challenge'}
                          >
                            {c.status === 'published' || c.status === 'scheduled' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </button>

                          {/* Archive */}
                          {c.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(c.id)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Archive Challenge"
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
      </div>

      {/* Standalone Create / Edit Modal */}
      {isCreateModalOpen && (
        <AdminDailyChallengeModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingChallenge(null);
          }}
          challengeToEdit={editingChallenge}
          topics={topics}
          patterns={patterns}
          onSaved={() => {
            loadData();
            setActionSuccess('Daily Challenge saved successfully');
            setTimeout(() => setActionSuccess(null), 3000);
          }}
        />
      )}

      {/* Create From Practice Modal */}
      {isFromPracticeModalOpen && (
        <AdminCreateFromPracticeModal
          isOpen={isFromPracticeModalOpen}
          onClose={() => setIsFromPracticeModalOpen(false)}
          onCreated={() => {
            loadData();
            setActionSuccess('Daily Challenge created from Practice Problem successfully!');
            setTimeout(() => setActionSuccess(null), 3500);
          }}
        />
      )}

      {/* Schedule Modal */}
      {schedulingChallenge && (
        <AdminScheduleDailyModal
          isOpen={Boolean(schedulingChallenge)}
          onClose={() => setSchedulingChallenge(null)}
          challenge={schedulingChallenge}
          onScheduled={(date) => {
            loadData();
            setActionSuccess(`Daily Challenge successfully scheduled for ${date}!`);
            setTimeout(() => setActionSuccess(null), 3500);
          }}
        />
      )}

      {/* Preview Modal */}
      {previewChallenge && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{previewChallenge.title}</h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>{previewChallenge.id}</span>
                  <span>&bull;</span>
                  <span className="uppercase font-bold text-amber-400">{previewChallenge.difficulty}</span>
                  <span>&bull;</span>
                  <span>{previewChallenge.points || 100} pts</span>
                  {previewChallenge.source_question_id && (
                    <>
                      <span>&bull;</span>
                      <span className="text-indigo-400">Source: {previewChallenge.source_question_id}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewChallenge(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <div className="font-bold text-slate-400 uppercase text-[10px] mb-1">Description</div>
                <p className="whitespace-pre-line leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {previewChallenge.description || 'No description.'}
                </p>
              </div>

              {previewChallenge.constraints && (
                <div>
                  <div className="font-bold text-slate-400 uppercase text-[10px] mb-1">Constraints</div>
                  <pre className="whitespace-pre-line bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px]">
                    {previewChallenge.constraints}
                  </pre>
                </div>
              )}

              {previewChallenge.solution_approach && (
                <div>
                  <div className="font-bold text-amber-400 uppercase text-[10px] mb-1">Solution Approach</div>
                  <p className="whitespace-pre-line bg-amber-950/20 p-3 rounded-xl border border-amber-900/30 text-amber-200">
                    {previewChallenge.solution_approach}
                  </p>
                </div>
              )}

              {Array.isArray(previewChallenge.hints) && previewChallenge.hints.length > 0 && (
                <div>
                  <div className="font-bold text-slate-400 uppercase text-[10px] mb-1">Hints ({previewChallenge.hints.length})</div>
                  <div className="space-y-2">
                    {previewChallenge.hints.map((h, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                        <span className="text-amber-400 font-bold font-mono mr-2">Hint {i + 1}:</span>
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              {onSelectProblem && (
                <button
                  onClick={() => {
                    const pid = previewChallenge.id;
                    setPreviewChallenge(null);
                    onSelectProblem(pid);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Open in Problem Workspace</span>
                </button>
              )}

              <button
                onClick={() => setPreviewChallenge(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold ml-auto"
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
