import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  TrendingUp,
  Search,
  RefreshCw,
  Award,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  BarChart3,
  Layers,
  User
} from 'lucide-react';

export default function AdminProgress({ onSelectStudent }) {
  const [progressData, setProgressData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadProgress();
  }, [page]);

  async function loadProgress() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminProgress({
        page,
        limit,
        search: search || undefined
      });
      setProgressData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load progress analytics');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadProgress();
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Learner Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Student Progress & Velocity
          </h1>
          <p className="text-xs text-slate-400">
            Monitor real-time task completion ratios, active assignments, and solving velocity.
          </p>
        </div>

        <button
          onClick={loadProgress}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Search
          </button>
        </form>
      </div>

      {/* Progress Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
            <div className="text-xs font-mono">Aggregating progress telemetry...</div>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-xs">{error}</div>
        ) : progressData.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            No learner progress data found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Active Assigned</th>
                  <th className="py-3.5 px-4">Solved</th>
                  <th className="py-3.5 px-4">Pending</th>
                  <th className="py-3.5 px-4">Completion %</th>
                  <th className="py-3.5 px-4">Lifetime Solved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                {progressData.map((p) => (
                  <tr key={p.user_id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {p.name || p.email?.split('@')[0]}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.email}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {p.assigned_count} questions
                    </td>

                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                      {p.solved_count}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-amber-400">
                      {p.pending_count}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                            style={{ width: `${Math.max(4, p.completion_percentage)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-300">
                          {p.completion_percentage}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-cyan-400 font-bold">
                      {p.historical_solved_count || p.solved_count}
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
            Page {page} of {totalPages}
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
    </div>
  );
}
