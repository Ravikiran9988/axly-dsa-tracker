import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Code,
  Github,
  Search,
  Filter,
  Check,
  X,
  MessageSquareQuote,
  ShieldCheck,
  Clock,
  User
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminSubmissionsReview() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('under_review');
  const [selectedSub, setSelectedSub] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter]);

  async function loadSubmissions() {
    setLoading(true);
    try {
      const res = await api.getSubmissions({
        review_status: statusFilter || undefined,
        limit: 100
      });
      setSubmissions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(review_status) {
    if (!selectedSub) return;
    if (review_status === 'changes_requested' && !feedback.trim()) {
      alert('Please provide feedback explaining the requested changes.');
      return;
    }

    setReviewing(true);
    try {
      await api.reviewSubmission(selectedSub.id, {
        review_status,
        feedback: feedback.trim()
      });
      setSelectedSub(null);
      setFeedback('');
      loadSubmissions();
    } catch (err) {
      alert(err.message || 'Failed to submit mentor review.');
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1425] via-[#1A1835] to-[#0C1425] border border-amber-900/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Mentor Review Hub</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Student Submission Reviews</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review student code submissions and GitHub repositories. Approve solutions or request code optimizations with structured feedback.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'under_review', label: 'Needs Review / Pending' },
          { id: 'changes_requested', label: 'Changes Requested' },
          { id: 'approved', label: 'Approved Submissions' },
          { id: '', label: 'All Submissions' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Submission Review List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">All caught up!</h3>
          <p className="text-xs text-slate-500 mt-1">No student submissions in this queue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <div
              key={sub.id}
              className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {sub.review_status || sub.status}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                    {sub.submission_type === 'github' ? <Github className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                    {sub.submission_type === 'github' ? 'GitHub Link' : `In-Platform (${sub.language || 'JS'})`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {sub.user_name ? sub.user_name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{sub.question_title}</h3>
                    <div className="text-xs text-slate-400">{sub.user_name} ({sub.user_email})</div>
                  </div>
                </div>

                {sub.feedback && (
                  <p className="text-xs text-amber-300/90 italic bg-amber-950/20 p-2 rounded-lg border border-amber-800/30">
                    Feedback: "{sub.feedback}"
                  </p>
                )}

                <div className="text-[11px] text-slate-400 flex items-center gap-4 pt-1">
                  {sub.submission_type === 'github' ? (
                    <a
                      href={sub.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-mono"
                    >
                      <Github className="w-3 h-3" /> {sub.github_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span>Passed: {sub.passed_tests || 0}/{sub.total_tests || 0} tests ({sub.execution_time_ms || 0} ms)</span>
                  )}
                  <span>Submitted {sub.updated_at || sub.created_at || 'recently'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setSelectedSub(sub); setFeedback(sub.feedback || ''); }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  <span>Review Solution</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedSub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-amber-400" /> Review Solution: {selectedSub.question_title}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Student: {selectedSub.user_name} ({selectedSub.user_email})</p>
              </div>
              <button onClick={() => setSelectedSub(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Submission Code / GitHub View */}
            {selectedSub.submission_type === 'github' ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Github className="w-4 h-4 text-white" /> Submitted GitHub Repository
                </div>
                <a
                  href={selectedSub.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline font-mono text-xs break-all"
                >
                  {selectedSub.github_url} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Source Code ({selectedSub.language || 'javascript'})</span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {selectedSub.passed_tests || 0}/{selectedSub.total_tests || 0} passed
                  </span>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-100 text-xs font-mono max-h-48 overflow-y-auto custom-scrollbar">
                  {selectedSub.source_code || '// No source code recorded.'}
                </pre>
              </div>
            )}

            {/* Feedback Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Mentor Feedback / Instructions <span className="text-slate-400 font-normal">(Required if requesting changes)</span>
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Great solution! Please optimize space complexity from O(N) to O(1) by reusing pointers..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleReview('changes_requested')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Request Changes</span>
                </button>

                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleReview('approved')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve Solution</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
