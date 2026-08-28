import React, { useState, useEffect } from 'react';
import { Compass, Search, CheckCircle2, ArrowRight, Code2, BookOpen } from 'lucide-react';
import { api } from '../services/api';

export default function AvailableChallenges({ onSelectProblem }) {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => { loadData(); }, [selectedDifficulty, selectedTopic, search]);

  async function loadData() {
    setLoading(true);
    try {
      const [qRes, tRes] = await Promise.all([
        api.getQuestions({ difficulty: selectedDifficulty || undefined, topic_id: selectedTopic || undefined, search: search || undefined, limit: 100 }),
        api.getTopics()
      ]);
      setQuestions(qRes.data || []);
      setTopics(tRes.data || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const filteredQuestions = questions.filter(q => {
    if (!selectedStatus) return true;
    if (selectedStatus === 'completed') return q.submission_status === 'solved';
    if (selectedStatus === 'available') return q.submission_status !== 'solved';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1425] via-[#101A32] to-[#0C1425] border border-cyan-900/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Practice Mode</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Practice Problems</h1>
          <p className="text-xs text-slate-400 mt-1">Choose any problem from the question bank and practice at your own pace. Practice submissions improve your personal analytics but do not award competitive points.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <div className="text-lg font-bold text-cyan-400">{questions.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Problems</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <div className="text-lg font-bold text-emerald-400">{questions.filter(q => q.submission_status === 'solved').length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Solved</div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search problems..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)} className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500">
            <option value="">All Difficulties</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
          <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500">
            <option value="">All Topics</option>{topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500">
            <option value="">All Problems</option><option value="available">Unsolved</option><option value="completed">Solved</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="h-44 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />)}</div>
      ) : filteredQuestions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400"><Compass className="w-10 h-10 mx-auto text-slate-600 mb-3" /><h3 className="text-sm font-semibold text-slate-300">No practice problems matched</h3><p className="text-xs text-slate-500 mt-1">Try broadening your search or removing a filter.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuestions.map(q => {
            const isSolved = q.submission_status === 'solved';
            return (
              <div key={q.id} className="group relative p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${difficultyColors[q.difficulty] || difficultyColors.easy}`}>{q.difficulty}</span>
                    {isSolved && <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Solved</span>}
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1">{q.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{q.description || 'Practice this algorithmic problem and improve your problem-solving skills.'}</p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{q.topic_name || 'Algorithms'}</span>
                  <button onClick={() => onSelectProblem(q.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950/40 transition-all active:scale-95"><Code2 className="w-3.5 h-3.5" /><span>{isSolved ? 'Review Code' : 'Solve Problem'}</span><ArrowRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
