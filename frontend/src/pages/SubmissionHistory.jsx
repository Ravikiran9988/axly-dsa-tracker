import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Code,
  Github,
  Calendar,
  Clock,
  MessageSquareQuote,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../services/api';

export default function SubmissionHistory({ onSelectProblem }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter]);

  async function loadSubmissions() {
    setLoading(true);
    try {
      const res = await api.getSubmissions({
        status: statusFilter || undefined,
        limit: 100
      });
      setSubmissions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredSubs = submissions.filter(sub => {
    if (methodFilter && sub.submission_type !== methodFilter) return false;
    return true;
  });

  const statusBadges = {
    approved: { label: 'Approved', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    solved: { label: 'Solved (100%)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    changes_requested: { label: 'Changes Requested', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    under_review: { label: 'Under Review', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    submitted: { label: 'Submitted', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    attempted: { label: 'Attempted', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    rejected: { label: 'Rejected', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1425] via-[#121D3A] to-[#0C1425] border border-cyan-900/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Submission Records</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Submission Proof & History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review your executed code, test results, GitHub repository submissions, and mentor review feedback.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <div className="text-lg font-bold text-cyan-400">{submissions.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Submissions</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Review Statuses</option>
            <option value="approved">Approved</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="under_review">Under Review</option>
            <option value="solved">Solved</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Methods (Code & GitHub)</option>
            <option value="code">Code Editor Submissions</option>
            <option value="github">GitHub Link Submissions</option>
          </select>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredSubs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <History className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No submissions found</h3>
          <p className="text-xs text-slate-500 mt-1">Submit challenges via Code Editor or GitHub link to see them here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubs.map(sub => {
            const badge = statusBadges[sub.review_status] || statusBadges[sub.status] || statusBadges.attempted;
            const isChangesRequested = sub.review_status === 'changes_requested';
            const isApproved = sub.review_status === 'approved' || sub.status === 'solved';

            return (
              <div
                key={sub.id}
                className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                        {sub.submission_type === 'github' ? <Github className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                        {sub.submission_type === 'github' ? 'GitHub Submission' : `In-Platform (${sub.language || 'JS'})`}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {sub.question_title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProblem(sub.question_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
                    >
                      <span>{isApproved ? 'Open IDE' : 'Edit & Resubmit'}</span>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mentor Feedback Banner */}
                {sub.feedback && (
                  <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    isApproved ? 'bg-emerald-950/30 border border-emerald-800/40 text-emerald-200' : 'bg-orange-950/30 border border-orange-800/40 text-orange-200'
                  }`}>
                    <MessageSquareQuote className="w-4 h-4 shrink-0 mt-0.5 text-current" />
                    <div className="space-y-1 flex-1">
                      <div className="font-semibold">
                        {isApproved ? 'Mentor Feedback (Approved):' : 'Mentor Revision Request:'}
                      </div>
                      <div className="leading-relaxed whitespace-pre-line">{sub.feedback}</div>
                      {sub.reviewer_name && (
                        <div className="text-[10px] opacity-75">— Reviewed by {sub.reviewer_name}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Proof details */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
                  <div className="flex flex-wrap items-center gap-4">
                    {sub.submission_type === 'github' ? (
                      <a
                        href={sub.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-mono text-[11px]"
                      >
                        <Github className="w-3.5 h-3.5" /> {sub.github_url} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span>
                        Passed: <strong>{sub.passed_tests || 0}/{sub.total_tests || 0}</strong> test cases ({sub.execution_time_ms || 0} ms)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3" /> Submitted {sub.updated_at || sub.created_at || 'recently'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
