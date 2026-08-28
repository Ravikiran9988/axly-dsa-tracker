import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AdminAssignModal from '../components/AdminAssignModal';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

export default function AdminAssignments({ onOpenAssignModal, onSelectProblem }) {
  const [assignments, setAssignments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unassigningId, setUnassigningId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadAssignments();
  }, [statusFilter, page]);

  async function loadAssignments() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAssignments({
        status: statusFilter || undefined,
        limit,
        page
      });
      setAssignments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }

  const handleUnassign = async (id) => {
    if (!window.confirm('Unassign this challenge from the student?')) return;
    setUnassigningId(id);
    try {
      await api.unassignAssignment(id);
      setSuccessMsg('Assignment successfully removed.');
      loadAssignments();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert(`Unassign failed: ${err.message}`);
    } finally {
      setUnassigningId(null);
    }
  };

  const statusColors = {
    assigned: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    ongoing: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    submitted: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    under_review: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  };

  const priorityColors = {
    High: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Low: 'text-slate-400 bg-slate-500/10 border-slate-500/20'
  };

  const filteredAssignments = assignments.filter(a =>
    a.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    a.question_title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider">
            <ClipboardList className="w-4 h-4" />
            <span>Targeted Practice</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Assignments Management
          </h1>
          <p className="text-xs text-slate-400">
            Assign specific algorithmic challenges to individual students and track task completion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenAssignModal && onOpenAssignModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/15 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Assignment</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by student name, email, or question..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="assigned">Assigned</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="under_review">Under Review</option>
        </select>

        <button
          onClick={loadAssignments}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Assignments Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <div className="text-xs font-mono">Loading active assignments...</div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs space-y-2">
            <div>No assignments match the selected criteria.</div>
            <button
              onClick={() => onOpenAssignModal && onOpenAssignModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Assign First Challenge
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Learner</th>
                  <th className="py-3.5 px-4">Question</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned At</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                {filteredAssignments.map((asgn) => (
                  <tr key={asgn.id} className="hover:bg-slate-850/40 transition-colors">
                    {/* Learner */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {asgn.user_name || asgn.user_email?.split('@')[0]}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {asgn.user_email}
                      </div>
                    </td>

                    {/* Question */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">
                        {asgn.question_title}
                      </div>
                      {asgn.question_difficulty && (
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          [{asgn.question_difficulty}]
                        </span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${priorityColors[asgn.priority] || priorityColors.Medium}`}>
                        {asgn.priority || 'Medium'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${statusColors[asgn.status] || statusColors.assigned}`}>
                        {asgn.status || 'assigned'}
                      </span>
                    </td>

                    {/* Assigned At */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {asgn.assigned_at ? new Date(asgn.assigned_at).toLocaleDateString() : 'Recent'}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {asgn.due_date || 'None'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {onSelectProblem && asgn.question_id && (
                          <button
                            onClick={() => onSelectProblem(asgn.question_id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Preview question"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleUnassign(asgn.id)}
                          disabled={unassigningId === asgn.id}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove assignment"
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
      </div>
    </div>
  );
}
