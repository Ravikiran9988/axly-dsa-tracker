import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Code2,
  Clock,
  ExternalLink,
  Award,
  Sparkles
} from 'lucide-react';

export default function AdminSubmissions({ onSelectProblem }) {
  const [submissions, setSubmissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadSubmissions();
  }, [page, statusFilter]);

  async function loadSubmissions() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSubmissions({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit
      });
      setSubmissions(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadSubmissions();
  };

  const statusColors = {
    solved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    approved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    attempted: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    under_review: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    changes_requested: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    rejected: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Submission Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Learner Submissions & Executions
          </h1>
          <p className="text-xs text-slate-400">
            Real-time feed of all code runs, test pass rates, algorithmic scores, and solution reviews.
          </p>
        </div>

        <button
          onClick={loadSubmissions}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-3 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by student name or challenge title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
        >
          <option value="">All Statuses</option>
          <option value="solved">Solved</option>
          <option value="attempted">Attempted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {/* Submissions Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mx-auto" />
            <div className="text-xs font-mono">Loading submissions stream...</div>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-xs">{error}</div>
        ) : submissions.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            No submissions found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Challenge</th>
                  <th className="py-3.5 px-4">Difficulty</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Score</th>
                  <th className="py-3.5 px-4">Language</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-850/40 transition-colors">
                    {/* Student */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {sub.user_name || sub.user_email?.split('@')[0]}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {sub.user_email}
                      </div>
                    </td>

                    {/* Question */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200 truncate max-w-[200px]">
                        {sub.question_title}
                      </div>
                    </td>

                    {/* Difficulty */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${difficultyColors[sub.question_difficulty?.toLowerCase()] || ''}`}>
                        {sub.question_difficulty || 'easy'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${statusColors[sub.status] || 'bg-slate-800 text-slate-300'}`}>
                        {sub.status}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                      {sub.final_score !== null && sub.final_score !== undefined ? `${sub.final_score}/100` : (sub.manual_score ? `${sub.manual_score}/100` : '—')}
                    </td>

                    {/* Language */}
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {sub.language || 'javascript'}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {sub.updated_at ? new Date(sub.updated_at).toLocaleString() : 'Recent'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
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

      {/* Submission Inspector Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] text-rose-400 font-mono uppercase font-bold">Submission Inspector</div>
                <h3 className="text-sm font-bold text-white">
                  {selectedSubmission.question_title} &bull; {selectedSubmission.user_name || selectedSubmission.user_email}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">STATUS:</span>
                <span className="text-white font-bold uppercase">{selectedSubmission.status}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">FINAL SCORE:</span>
                <span className="text-cyan-400 font-bold">{selectedSubmission.final_score || 0}/100</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SOLVE DURATION:</span>
                <span className="text-slate-300">{Math.round(selectedSubmission.solve_duration_seconds / 60) || 0} mins</span>
              </div>
            </div>

            {selectedSubmission.source_code && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Submitted Source Code:</span>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-200 font-mono text-xs max-h-56 overflow-y-auto">
                  {selectedSubmission.source_code}
                </pre>
              </div>
            )}

            {selectedSubmission.feedback && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-amber-400 uppercase font-mono">Review Feedback:</span>
                <p className="text-slate-300">{selectedSubmission.feedback}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
