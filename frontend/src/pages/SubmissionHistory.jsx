import React, { useState, useEffect } from 'react';
import {
  History, CheckCircle2, AlertTriangle, RotateCcw, ExternalLink, Code,
  Github, Clock, MessageSquareQuote, X
} from 'lucide-react';
import { api } from '../services/api';
import { Skeleton, EmptyState, ErrorState } from '../components/ui/index.jsx';

const REVIEW_BADGES = {
  approved:          { label: 'Approved',           cls: 'badge-solved' },
  solved:            { label: 'Solved (100%)',       cls: 'badge-solved' },
  changes_requested: { label: 'Changes Requested',  cls: 'badge badge-medium border-amber-500/20' },
  under_review:      { label: 'Under Review',        cls: 'badge badge-prog' },
  submitted:         { label: 'Submitted',           cls: 'badge badge-prog' },
  attempted:         { label: 'Attempted',           cls: 'badge badge-neutral' },
  rejected:          { label: 'Rejected',            cls: 'badge text-rose-400 bg-rose-500/10 border-rose-500/20' },
};

export default function SubmissionHistory({ onSelectProblem }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { loadSubmissions(); }, [statusFilter]);

  async function loadSubmissions() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSubmissions({ status: statusFilter || undefined, limit: 100 });
      setSubmissions(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  const filtered = submissions.filter(s => !methodFilter || s.submission_type === methodFilter);
  const approvedCount = submissions.filter(s => s.review_status === 'approved' || s.status === 'solved').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Submission History</h1>
          <p className="text-sm text-slate-400 mt-0.5">Code editor and GitHub link submissions</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{submissions.length}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{approvedCount}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Approved</div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Filter by review status"
          className="select-field h-9 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="changes_requested">Changes Requested</option>
          <option value="under_review">Under Review</option>
          <option value="solved">Solved</option>
        </select>
        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          aria-label="Filter by submission type"
          className="select-field h-9 text-sm"
        >
          <option value="">All Methods</option>
          <option value="code">Code Editor</option>
          <option value="github">GitHub Link</option>
        </select>
        {(statusFilter || methodFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setMethodFilter(''); }}
            className="btn-ghost btn-sm inline-flex items-center gap-1.5 h-9"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={loadSubmissions} />}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th className="hidden sm:table-cell">Method</th>
                <th>Status</th>
                <th className="hidden md:table-cell">Details</th>
                <th className="hidden lg:table-cell">Submitted</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton className="h-4 w-48" /></td>
                    <td className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td><Skeleton className="h-5 w-24" /></td>
                    <td className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></td>
                    <td className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></td>
                    <td><Skeleton className="h-7 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border-0 py-0">
                    <EmptyState
                      icon={History}
                      title="No submissions found"
                      description="Submit challenges via the Code Editor or GitHub link to see them here."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(sub => {
                  const badge = REVIEW_BADGES[sub.review_status] || REVIEW_BADGES[sub.status] || REVIEW_BADGES.attempted;
                  const isApproved = sub.review_status === 'approved' || sub.status === 'solved';
                  const isExpandable = sub.feedback;
                  return (
                    <React.Fragment key={sub.id}>
                      <tr
                        className={isExpandable ? 'cursor-pointer' : ''}
                        onClick={() => isExpandable && setExpanded(expanded === sub.id ? null : sub.id)}
                      >
                        <td>
                          <div className="font-medium text-slate-200 leading-snug">{sub.question_title}</div>
                          {/* Mobile extras */}
                          <div className="flex items-center gap-2 mt-1 sm:hidden">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              {sub.submission_type === 'github' ? <Github className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                              {sub.submission_type === 'github' ? 'GitHub' : sub.language?.toUpperCase() || 'Code'}
                            </span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            {sub.submission_type === 'github'
                              ? <><Github className="w-3.5 h-3.5" /> GitHub</>
                              : <><Code className="w-3.5 h-3.5" /> {sub.language?.toUpperCase() || 'Code'}</>
                            }
                          </div>
                        </td>
                        <td>
                          <span className={badge.cls}>{badge.label}</span>
                        </td>
                        <td className="hidden md:table-cell text-xs text-slate-400">
                          {sub.submission_type === 'github' ? (
                            <a href={sub.github_url} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-axly-400 hover:underline font-mono text-[11px]">
                              View repo <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span>{sub.passed_tests || 0}/{sub.total_tests || 0} tests · {sub.execution_time_ms || 0}ms</span>
                          )}
                        </td>
                        <td className="hidden lg:table-cell text-xs text-slate-500 font-mono">
                          {sub.updated_at || sub.created_at || '—'}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={e => { e.stopPropagation(); onSelectProblem(sub.question_id); }}
                            className="btn-primary btn-sm inline-flex items-center gap-1"
                          >
                            {isApproved ? 'Open IDE' : 'Resubmit'}
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                      {isExpandable && expanded === sub.id && (
                        <tr>
                          <td colSpan={6} className={`px-4 py-3 ${isApproved ? 'bg-emerald-950/20' : 'bg-amber-950/20'}`}>
                            <div className={`flex items-start gap-2.5 text-xs ${isApproved ? 'text-emerald-200' : 'text-amber-200'}`}>
                              <MessageSquareQuote className="w-4 h-4 shrink-0 mt-0.5" />
                              <div className="space-y-1 flex-1">
                                <div className="font-semibold">
                                  {isApproved ? 'Mentor Feedback (Approved):' : 'Mentor Revision Request:'}
                                </div>
                                <div className="leading-relaxed whitespace-pre-line">{sub.feedback}</div>
                                {sub.reviewer_name && (
                                  <div className="opacity-60 text-[10px]">— Reviewed by {sub.reviewer_name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
