import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock3, Play, Trophy, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function DailyChallenge({ onSelectProblem }) {
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { (async () => { try { const res = await api.getDailyQuestion(); setDaily(res.data || null); } catch (e) { setError(e.message || 'Unable to load today\'s challenge'); } finally { setLoading(false); } })(); }, []);

  if (loading) return <div className="max-w-4xl mx-auto py-16 text-center text-slate-400">Loading today&apos;s challenge...</div>;
  if (error) return <div className="max-w-4xl mx-auto p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-300 flex gap-3"><AlertCircle className="w-5 h-5" />{error}</div>;
  if (!daily) return <div className="max-w-4xl mx-auto p-8 rounded-2xl border border-slate-800 bg-slate-900 text-center"><Calendar className="w-8 h-8 mx-auto text-slate-500" /><h1 className="mt-3 text-xl font-bold text-white">No Daily Challenge Yet</h1><p className="mt-1 text-sm text-slate-400">A published problem will appear here when the daily challenge is available.</p></div>;

  const solved = ['solved','completed','approved'].includes(daily.submission_status);
  return <div className="max-w-4xl mx-auto space-y-6">
    <div className="p-7 rounded-3xl bg-gradient-to-r from-[#0C1425] via-[#121E3E] to-[#0C1425] border border-cyan-900/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider"><Calendar className="w-4 h-4" /> Daily Challenge</div><h1 className="mt-2 text-3xl font-extrabold text-white">Today&apos;s DSA Problem</h1><p className="mt-1 text-sm text-slate-400">One shared problem for every student. Solve it to earn competitive points.</p></div>
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20"><Trophy className="w-5 h-5 text-cyan-400" /><span className="font-bold text-cyan-300">100 pts</span></div>
      </div>
    </div>
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
      <div className="flex flex-wrap items-center gap-2 text-xs"><span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">{daily.difficulty}</span>{daily.topic_name && <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">{daily.topic_name}</span>}<span className={`px-2.5 py-1 rounded-lg ${solved ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{solved ? 'Completed' : 'Not completed'}</span></div>
      <h2 className="mt-5 text-2xl font-bold text-white">{daily.title}</h2>
      <p className="mt-2 text-sm text-slate-400">Challenge date: {daily.date}</p>
      <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => onSelectProblem(daily.id)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold"><Play className="w-4 h-4" />{solved ? 'Review Solution' : 'Solve Challenge'}</button>{daily.submission_status === 'attempted' && <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm"><Clock3 className="w-4 h-4" />In progress</span>}{solved && <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 text-emerald-300 text-sm"><CheckCircle2 className="w-4 h-4" />Completed</span>}</div>
    </div>
  </div>;
}
