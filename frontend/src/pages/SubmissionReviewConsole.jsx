import React, { useEffect, useState } from 'react';
import { Brain, Check, Clock3, Code2, ExternalLink, Github, Loader2, MessageSquare, Save, Sparkles, User, X } from 'lucide-react';
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
    setLoading(true); setError('');
    try { const res = await api.getSubmissions({ review_status: 'under_review', limit: 100 }); setItems(res.data || []); }
    catch (e) { setError(e.message || 'Failed to load submissions'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openReview(item) {
    setSelected(item); setFeedback(item.manual_feedback || item.feedback || ''); setManualScore(item.manual_score ?? ''); setAiResult(null);
  }

  async function runAI() {
    if (!selected) return;
    setAiLoading(true); setError('');
    try { const res = await api.aiReviewSubmission(selected.id); setAiResult(res.data || res); }
    catch (e) { setError(e.message || 'AI review failed. Configure the LLM environment variables on the backend first.'); }
    finally { setAiLoading(false); }
  }

  async function save(status) {
    if (!selected) return;
    if (manualScore !== '' && (Number(manualScore) < 0 || Number(manualScore) > 100)) { setError('Manual score must be between 0 and 100.'); return; }
    if (status === 'changes_requested' && !feedback.trim()) { setError('Feedback is required when requesting changes.'); return; }
    setSaving(true); setError('');
    try {
      await api.reviewSubmission(selected.id, { review_status: status, feedback: feedback.trim(), manual_score: manualScore === '' ? null : Number(manualScore), manual_feedback: feedback.trim() || null });
      setSelected(null); await load();
    } catch (e) { setError(e.message || 'Failed to save review'); }
    finally { setSaving(false); }
  }

  const aiScore = aiResult?.ai_score ?? aiResult?.score ?? aiResult?.data?.ai_score;
  const aiFeedback = aiResult?.ai_feedback ?? aiResult?.feedback ?? aiResult?.data?.ai_feedback;
  const complexity = aiResult?.complexity || aiResult?.data?.complexity;

  return <div className="space-y-6 max-w-7xl mx-auto">
    <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0C1425] via-[#171735] to-[#0C1425] border border-indigo-900/40 shadow-xl">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold"><Sparkles className="w-3.5 h-3.5"/>AI + Mentor Review</div>
      <h1 className="text-2xl font-extrabold text-white mt-2">Submission Review Console</h1>
      <p className="text-xs text-slate-400 mt-1">Run AI analysis, inspect execution results, then apply an optional manual score override.</p>
    </div>

    {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">{error}</div>}

    {loading ? <div className="p-10 text-center text-slate-400 text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2"/>Loading submissions…</div> : items.length === 0 ? <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 text-sm">No submissions waiting for review.</div> :
      <div className="grid gap-3">{items.map(item => <div key={item.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0 space-y-2"><div className="flex items-center gap-2 text-[10px] text-slate-400"><User className="w-3.5 h-3.5"/>{item.user_name || item.user_email || 'Student'}<span>•</span><Clock3 className="w-3.5 h-3.5"/>{item.execution_time_ms || 0} ms</div><h3 className="text-sm font-bold text-white truncate">{item.question_title || 'DSA Submission'}</h3><div className="text-[11px] text-slate-400">{item.passed_tests || 0}/{item.total_tests || 0} tests passed • {item.submission_type === 'github' ? 'GitHub' : item.language || 'Code Editor'}</div></div>
        <button onClick={() => openReview(item)} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0">Review Submission</button>
      </div>)}</div>}

    {selected && <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between"><div><div className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Submission Review</div><h2 className="text-lg font-bold text-white mt-1">{selected.question_title}</h2><p className="text-xs text-slate-400 mt-1">{selected.user_name || selected.user_email}</p></div><button onClick={() => setSelected(null)}><X className="w-5 h-5 text-slate-400 hover:text-white"/></button></div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[['Tests',`${selected.passed_tests || 0}/${selected.total_tests || 0}`],['Runtime',`${selected.execution_time_ms || 0} ms`],['AI Score',aiScore ?? selected.ai_score ?? '—'],['Final',selected.final_score ?? selected.manual_score ?? '—']].map(([a,b]) => <div key={a} className="p-3 rounded-xl bg-slate-950 border border-slate-800"><div className="text-[10px] uppercase text-slate-500">{a}</div><div className="text-lg font-extrabold text-white mt-1">{b}</div></div>)}</div>

        {selected.submission_type === 'github' ? <a href={selected.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 text-xs break-all"><Github className="w-4 h-4 shrink-0"/>{selected.github_url}<ExternalLink className="w-3 h-3 shrink-0"/></a> : <div className="space-y-2"><div className="text-xs font-semibold text-slate-300 flex items-center gap-2"><Code2 className="w-4 h-4"/>Source Code</div><pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-100 max-h-52 overflow-auto">{selected.source_code || '// Source code unavailable'}</pre></div>}

        <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/30 space-y-3"><div className="flex items-center justify-between"><div className="text-xs font-bold text-indigo-300 flex items-center gap-2"><Brain className="w-4 h-4"/>AI Code Review</div><button onClick={runAI} disabled={aiLoading} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold">{aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'Run AI Review'}</button></div>{aiScore != null && <div className="text-2xl font-extrabold text-white">{aiScore}<span className="text-xs text-slate-500"> / 100</span></div>}{aiFeedback && <p className="text-xs text-slate-300 leading-relaxed">{aiFeedback}</p>}{complexity && <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">{typeof complexity === 'string' ? complexity : JSON.stringify(complexity, null, 2)}</pre>}{!aiResult && <p className="text-[11px] text-slate-500">AI review is optional and requires LLM configuration on the backend.</p>}</div>

        <div className="grid md:grid-cols-2 gap-4"><div><label className="text-xs font-semibold text-slate-300">Manual Score <span className="text-slate-500">(0–100)</span></label><input type="number" min="0" max="100" value={manualScore} onChange={e => setManualScore(e.target.value)} placeholder="Optional override" className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"/></div><div><label className="text-xs font-semibold text-slate-300">Manual Feedback</label><textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Review notes for the student…" className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"/></div></div>

        <div className="pt-3 border-t border-slate-800 flex flex-wrap justify-end gap-2"><button disabled={saving} onClick={() => save('changes_requested')} className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold">Request Changes</button><button disabled={saving} onClick={() => save('rejected')} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold">Reject</button><button disabled={saving} onClick={() => save('approved')} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}Approve & Save Score</button></div>
      </div>
    </div>}
  </div>;
}
