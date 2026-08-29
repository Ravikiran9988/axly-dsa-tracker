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
  HelpCircle
} from 'lucide-react';

export default function AdminDailyChallenge({ onSelectProblem }) {
  const [challenges, setChallenges] = useState([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, published: 0, scheduled: 0, archived: 0 });
  const [topics, setTopics] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [dailyData, setDailyData] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topicId, setTopicId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Action States
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [schedulingChallenge, setSchedulingChallenge] = useState(null);
  const [previewChallenge, setPreviewChallenge] = useState(null);

  useEffect(() => {
    loadTaxonomy();
  }, []);

  useEffect(() => {
    loadData();
  }, [difficulty, topicId, statusFilter]);

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
      const [dailyRes, challengesRes] = await Promise.all([
        api.getDailyQuestion().catch(() => ({ data: null })),
        api.getDailyChallenges({
          difficulty: difficulty || undefined,
          topic_id: topicId || undefined,
          status: statusFilter || undefined,
          search: search.trim() || undefined
        })
      ]);

      setDailyData(dailyRes?.data || null);
      setChallenges(challengesRes?.data || []);
      if (challengesRes?.stats) {
        setStats(challengesRes.stats);
      }
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
    const nextStatus = challenge.status === 'published' ? 'draft' : 'published';
    try {
      await api.updateDailyChallenge(challenge.id, { status: nextStatus });
      setActionSuccess(`Challenge status updated to "${nextStatus}"`);
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
    archived: 'text-slate-400 bg-slate-500/10 border-slate-500/20'
  };

  const todayChallenge = dailyData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Flame className="w-4 h-4 fill-amber-400" />
            <span>Daily Challenge Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Independent Daily Challenge System
          </h1>
          <p className="text-xs text-slate-400">
            Author, curate, and schedule competitive daily challenges independent of the practice problem bank.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Challenges</div>
          <div className="text-xl sm:text-2xl font-black text-white mt-1">{stats.total || challenges.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono font-bold uppercase text-amber-400">Drafts</div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{stats.draft || 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono font-bold uppercase text-emerald-400">Published</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{stats.published || 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] font-mono font-bold uppercase text-cyan-400">Scheduled</div>
          <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">{stats.scheduled || 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Archived</div>
          <div className="text-xl sm:text-2xl font-black text-slate-400 mt-1">{stats.archived || 0}</div>
        </div>
      </div>

      {/* Today's Featured Problem Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-950 border border-amber-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase font-mono">
            <Flame className="w-4 h-4 fill-amber-400" />
            <span>Today's Featured Daily Challenge</span>
          </div>
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>{todayChallenge?.date || new Date().toISOString().split('T')[0]} (UTC)</span>
          </span>
        </div>

        {todayChallenge ? (
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${difficultyColors[todayChallenge.difficulty?.toLowerCase()] || ''}`}>
                  {todayChallenge.difficulty}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {todayChallenge.topic_name || 'General DSA'}
                </span>
                {todayChallenge.pattern_name && (
                  <span className="text-xs text-slate-500 font-mono">
                    &bull; {todayChallenge.pattern_name}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {todayChallenge.status || 'Active'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white truncate">
                {todayChallenge.title}
              </h2>
              {todayChallenge.description && (
                <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">
                  {todayChallenge.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-amber-400 font-bold font-mono text-sm">
                  {todayChallenge.points || 100} pts
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-mono">Streak Reward</div>
              </div>

              {onSelectProblem && (
                <button
                  onClick={() => onSelectProblem(todayChallenge.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-colors"
                >
                  <span>Solve in IDE</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
            No daily challenge scheduled for today. Create or schedule a challenge below to activate today's featured problem.
          </div>
        )}
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
            <button
              onClick={() => {
                setEditingChallenge(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold hover:bg-amber-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Daily Challenge</span>
            </button>
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
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {c.id}
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
                              c.status === 'published'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                            title={c.status === 'published' ? 'Unpublish to Draft' : 'Publish Challenge'}
                          >
                            {c.status === 'published' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
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

      {/* Create / Edit Modal */}
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
