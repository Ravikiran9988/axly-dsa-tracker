import React, { useEffect, useState } from 'react';
import { Brain, Check, Clock3, Code2, ExternalLink, Github, Loader2, MessageSquare, Save, Sparkles, User, X, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function SubmissionReviewConsole() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [manualScore, setManualScore] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSubmissions({ review_status: 'under_review', limit: 100 });
      setItems(res.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openReview(item) {
    setSelected(item);
    setFeedback(item.manual_feedback || item.feedback || '');
    setManualScore(item.manual_score ?? '');
    setAiResult(null);
  }

  async function runAI() {
    if (!selected) return;
    setAiLoading(true);
    setError('');
    try {
      const res = await api.aiReviewSubmission(selected.id);
      setAiResult(res.data || res);
    } catch (e) {
      setError(e.message || 'AI review failed. Configure the LLM environment variables on the backend first.');
    } finally {
      setAiLoading(false);
    }
  }

  async function save(status) {
    if (!selected) return;
    if (manualScore !== '' && (Number(manualScore) < 0 || Number(manualScore) > 100)) {
      setError('Manual score must be between 0 and 100.');
      return;
    }
    if (status === 'changes_requested' && !feedback.trim()) {
      setError('Feedback is required when requesting changes.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.reviewSubmission(selected.id, {
        review_status: status,
        feedback: feedback.trim(),
        manual_score: manualScore === '' ? null : Number(manualScore),
        manual_feedback: feedback.trim() || null
      });
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  }

  const aiScore = aiResult?.ai_score ?? aiResult?.score ?? aiResult?.data?.ai_score;
  const aiFeedback = aiResult?.ai_feedback ?? aiResult?.feedback ?? aiResult?.data?.ai_feedback;
  const complexity = aiResult?.complexity || aiResult?.data?.complexity;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-theme-surface border border-theme-border backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>AI + Mentor Review</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-theme-text1 tracking-tight">
            Submission Review Console
          </h1>
          <p className="text-xs text-theme-text2">
            Run AI analysis, inspect execution results, then apply an optional manual score override.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-surface2 hover:bg-theme-surface2 text-theme-text1 text-xs font-semibold border border-theme-border"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-theme-text2 space-y-3">
          <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
          <div className="text-xs font-mono">Loading submissions...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-theme-surface border border-theme-border text-theme-text3 text-xs">
          No submissions waiting for review.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(item => (
            <div key={item.id} className="p-5 rounded-2xl bg-theme-surface border border-theme-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-theme-text2 font-mono">
                  <User className="w-3.5 h-3.5" />
                  {item.user_name || item.user_email || 'Student'}
                  <span className="text-theme-text3">•</span>
                  <Clock3 className="w-3.5 h-3.5" />
                  {item.execution_time_ms || 0} ms
                </div>
                <h3 className="text-sm font-bold text-theme-text1 truncate">
                  {item.question_title || 'DSA Submission'}
                </h3>
                <div className="text-[11px] text-theme-text2">
                  {item.passed_tests || 0}/{item.total_tests || 0} tests passed <span className="text-theme-text3 mx-1">•</span> {item.submission_type === 'github' ? 'GitHub' : item.language || 'Code Editor'}
                </div>
              </div>
              <button 
                onClick={() => openReview(item)} 
                className="px-4 py-2 rounded-xl bg-theme-text1 text-theme-bg hover:opacity-90 text-xs font-bold shrink-0 transition-opacity"
              >
                Review Submission
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-theme-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto custom-scrollbar rounded-3xl bg-theme-surface border border-theme-border shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold font-mono">Submission Review</div>
                <h2 className="text-lg font-bold text-theme-text1 mt-1">{selected.question_title}</h2>
                <p className="text-xs text-theme-text2 mt-1">{selected.user_name || selected.user_email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded text-theme-text2 hover:text-theme-text1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Tests', `${selected.passed_tests || 0}/${selected.total_tests || 0}`],
                ['Runtime', `${selected.execution_time_ms || 0} ms`],
                ['AI Score', aiScore ?? selected.ai_score ?? '—'],
                ['Final', selected.final_score ?? selected.manual_score ?? '—']
              ].map(([label, value]) => (
                <div key={label} className="p-3 rounded-xl bg-theme-surface border border-theme-border text-center sm:text-left">
                  <div className="text-[10px] uppercase tracking-wider text-theme-text3 font-semibold">{label}</div>
                  <div className="text-lg font-extrabold text-theme-text1 mt-1">{value}</div>
                </div>
              ))}
            </div>

            {selected.submission_type === 'github' ? (
              <a href={selected.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-4 rounded-xl bg-theme-surface border border-theme-border text-cyan-500 hover:text-cyan-400 text-xs break-all transition-colors">
                <Github className="w-4 h-4 shrink-0"/>
                {selected.github_url}
                <ExternalLink className="w-3 h-3 shrink-0"/>
              </a>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-theme-text2 flex items-center gap-2 uppercase tracking-wider">
                  <Code2 className="w-4 h-4" /> Source Code
                </div>
                <pre className="p-4 rounded-xl bg-theme-surface2/50 border border-theme-border text-xs text-theme-text1 max-h-52 overflow-auto custom-scrollbar font-mono">
                  {selected.source_code || '// Source code unavailable'}
                </pre>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-theme-surface2/30 border border-theme-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs font-bold text-cyan-500 flex items-center gap-2 uppercase tracking-wider">
                  <Brain className="w-4 h-4"/> AI Code Review
                </div>
                <button 
                  onClick={runAI} 
                  disabled={aiLoading} 
                  className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-theme-surface border border-theme-border text-theme-text1 hover:bg-theme-surface3 disabled:opacity-50 text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
                  {aiLoading ? 'Analyzing...' : 'Run AI Review'}
                </button>
              </div>
              
              {aiScore != null && (
                <div className="text-2xl font-black text-theme-text1">
                  {aiScore} <span className="text-xs font-semibold text-theme-text3 uppercase tracking-wide">/ 100</span>
                </div>
              )}
              
              {aiFeedback && (
                <p className="text-sm text-theme-text2 leading-relaxed">
                  {aiFeedback}
                </p>
              )}
              
              {complexity && (
                <pre className="p-3 rounded-lg bg-theme-surface/50 border border-theme-border text-[11px] text-theme-text2 whitespace-pre-wrap font-mono mt-2">
                  {typeof complexity === 'string' ? complexity : JSON.stringify(complexity, null, 2)}
                </pre>
              )}
              
              {!aiResult && (
                <p className="text-[11px] text-theme-text3">
                  AI review is optional and requires LLM configuration on the backend.
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-theme-text2">
                  Manual Score <span className="text-theme-text3 font-normal">(0–100)</span>
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={manualScore} 
                  onChange={e => setManualScore(e.target.value)} 
                  placeholder="Optional override" 
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-theme-surface border border-theme-border text-theme-text1 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-theme-text2">
                  Manual Feedback
                </label>
                <textarea 
                  rows={3} 
                  value={feedback} 
                  onChange={e => setFeedback(e.target.value)} 
                  placeholder="Review notes for the student..." 
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-theme-surface border border-theme-border text-theme-text1 text-sm focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-theme-border flex flex-col sm:flex-row flex-wrap sm:justify-end gap-2">
              <button 
                disabled={saving} 
                onClick={() => save('changes_requested')} 
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-theme-surface border border-theme-border hover:bg-orange-500/10 hover:text-orange-500 hover:border-orange-500/20 disabled:opacity-50 text-theme-text2 text-xs font-bold transition-all"
              >
                Request Changes
              </button>
              <button 
                disabled={saving} 
                onClick={() => save('rejected')} 
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-theme-surface border border-theme-border hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 disabled:opacity-50 text-theme-text2 text-xs font-bold transition-all"
              >
                Reject
              </button>
              <button 
                disabled={saving} 
                onClick={() => save('approved')} 
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
                Approve & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
