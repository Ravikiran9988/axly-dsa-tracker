import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Database,
  Eye,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const limit = 20;

  useEffect(() => {
    loadAuditLogs();
  }, [page, actionFilter, resourceFilter]);

  async function loadAuditLogs() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAuditLogs({
        page,
        limit,
        action: actionFilter || undefined,
        resource_type: resourceFilter || undefined
      });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  const actionColors = {
    question_create: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    question_update: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    question_publish: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    question_delete: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    question_version_restore: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    assignment_create: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    assignment_bulk_create: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    assignment_unassign: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    submission_manual_review: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    submission_ai_review: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    user_role_update: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    ai_question_generate: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs uppercase font-bold tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Security & Compliance Trail</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            System & Admin Audit Logs
          </h1>
          <p className="text-xs text-slate-400">
            Immutable tracking of all question lifecycle changes, manual scoring overrides, assignments, and admin operations.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-semibold">Filter:</span>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
        >
          <option value="">All Actions</option>
          <option value="question_create">Question Created</option>
          <option value="question_update">Question Updated</option>
          <option value="question_publish">Question Published</option>
          <option value="question_delete">Question Soft Deleted</option>
          <option value="question_version_restore">Question Version Restored</option>
          <option value="assignment_create">Assignment Created</option>
          <option value="assignment_bulk_create">Bulk Assignment</option>
          <option value="assignment_unassign">Assignment Removed</option>
          <option value="submission_manual_review">Manual Submission Review</option>
          <option value="submission_ai_review">AI Submission Review</option>
          <option value="user_role_update">User Role Changed</option>
          <option value="ai_question_generate">AI Question Generated</option>
        </select>

        <select
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
        >
          <option value="">All Resources</option>
          <option value="question">Question</option>
          <option value="assignment">Assignment</option>
          <option value="submission">Submission</option>
          <option value="user">User</option>
          <option value="ai_question">AI Question</option>
        </select>

        <div className="ml-auto text-xs text-slate-400 font-mono">
          Showing <strong>{logs.length}</strong> of <strong>{total}</strong> logged events
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
            <div className="text-xs font-mono">Loading encrypted audit trail...</div>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-xs">{error}</div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            No audit logs match the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Timestamp (UTC)</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Resource</th>
                  <th className="py-3.5 px-4">IP / Client</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {log.created_at}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-sans font-medium text-slate-200">
                        {log.actor_name || log.actor_email || 'System'}
                      </div>
                      {log.actor_role && (
                        <span className="text-[10px] text-slate-400 uppercase">
                          [{log.actor_role}]
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${actionColors[log.action] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300 uppercase font-semibold">
                        {log.resource_type}
                      </span>
                      {log.resource_id && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {log.resource_id}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-[120px]">
                      {log.ip_address || 'Internal / Local'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-[11px] font-sans font-medium transition-colors"
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

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <span className="text-slate-400 font-mono">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="space-y-0.5">
                <div className="text-xs font-mono font-bold uppercase text-cyan-400">
                  Audit Entry Details
                </div>
                <h3 className="text-base font-bold text-white">
                  {selectedLog.action.replace(/_/g, ' ').toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">ACTOR ID:</span>
                <span className="text-slate-300">{selectedLog.actor_id || 'System'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">RESOURCE ID:</span>
                <span className="text-slate-300 truncate block">{selectedLog.resource_id || 'N/A'}</span>
              </div>
            </div>

            {selectedLog.before_data && (
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-slate-400 font-mono text-[10px] uppercase">
                  Before State (Sanitized):
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-200 font-mono text-[11px] max-h-40 overflow-y-auto">
                  {JSON.stringify(selectedLog.before_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.after_data && (
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-slate-400 font-mono text-[10px] uppercase">
                  After State (Sanitized):
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] max-h-40 overflow-y-auto">
                  {JSON.stringify(selectedLog.after_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.metadata && (
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-slate-400 font-mono text-[10px] uppercase">
                  Event Metadata:
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] max-h-32 overflow-y-auto">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
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
