import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plus, Sparkles, Search, Trash2, Pencil, Users, CheckCircle2, Layers } from 'lucide-react';
import AdminQuestionModal from '../components/AdminQuestionModal';
import AdminDailyQuestionModal from '../components/AdminDailyQuestionModal';

export default function AdminCoreDashboard({ onSelectProblem, onNavigate }) {
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questionModal, setQuestionModal] = useState(false);
  const [dailyModal, setDailyModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [q, s] = await Promise.all([
        api.getQuestions({ search: search || undefined, difficulty: difficulty || undefined, limit: 100 }),
        api.getAdminStats()
      ]);
      setQuestions(q.data || []); setStats(s.data || null);
    } catch (e) { setError(e.message || 'Failed to load admin data'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [search, difficulty]);

  const save = async (data) => { if (data.id) await api.updateQuestion(data.id, data); else await api.createQuestion(data); setQuestionModal(false); setEditing(null); await load(); };
  const remove = async (q) => { if (!window.confirm(`Deactivate "${q.title}"?`)) return; try { await api.deleteQuestion(q.id); await load(); } catch (e) { setError(e.message || 'Unable to deactivate question'); } };

  return <div className="max-w-7xl mx-auto space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="flex items-center gap-2"><h1 className="text-3xl font-extrabold text-white">Admin</h1><span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">CORE</span></div><p className="text-sm text-slate-400 mt-1">Manage the practice question library and the global Daily Challenge.</p></div><div className="flex gap-2"><button onClick={() => onNavigate ? onNavigate('admin-daily') : setDailyModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white"><Sparkles className="w-4 h-4" /> Daily Challenge</button><button onClick={() => { setEditing(null); setQuestionModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-sm font-bold text-white"><Plus className="w-4 h-4" /> Add Question</button></div></div>
    {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">{error}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{[
      ['Students', stats?.total_users ?? stats?.students?.total ?? stats?.total_students ?? 0, Users],
      ['Practice Questions', stats?.total_active_questions ?? stats?.questions?.total ?? stats?.practiceQuestions ?? 0, Layers],
      ['Solved', stats?.total_solved_submissions ?? stats?.solved ?? stats?.submissions?.solved ?? 0, CheckCircle2]
    ].map(([label, value, Icon]) => (
      <div key={label} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">{label}</span>
          <Icon className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="mt-3 text-2xl font-extrabold text-white">
          {loading ? <span className="text-slate-600 font-mono text-xl animate-pulse">Loading...</span> : (stats ? value : '—')}
        </div>
      </div>
    ))}</div>
    <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white outline-none" /></div><select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-300"><option value="">All difficulties</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden"><div className="px-5 py-4 border-b border-slate-800"><h2 className="font-bold text-white">Practice Question Bank <span className="text-slate-500">({questions.length})</span></h2></div>{loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : questions.length === 0 ? <div className="p-8 text-center text-slate-400">No questions found.</div> : <div className="divide-y divide-slate-800">{questions.map(q => <div key={q.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><button onClick={() => onSelectProblem(q.id)} className="text-left min-w-0"><div className="font-semibold text-white truncate">{q.title}</div><div className="text-xs text-slate-500 mt-1">{q.difficulty || 'Unknown'} {q.topic_name ? `• ${q.topic_name}` : ''}</div></button><div className="flex gap-2 shrink-0"><button onClick={() => { setEditing(q); setQuestionModal(true); }} className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white"><Pencil className="w-4 h-4" /></button><button onClick={() => remove(q)} className="p-2 rounded-lg border border-rose-900/40 text-rose-400 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>}</div>
    {questionModal && <AdminQuestionModal isOpen={questionModal} question={editing} onClose={() => { setQuestionModal(false); setEditing(null); }} onSuccess={save} />}
    {dailyModal && <AdminDailyQuestionModal isOpen={dailyModal} onClose={() => setDailyModal(false)} questions={questions} />}
  </div>;
}
