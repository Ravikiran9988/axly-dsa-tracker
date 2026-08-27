import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  Code2,
  Flame,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function AvailableChallenges({ onSelectProblem }) {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedDifficulty, selectedTopic, search]);

  async function loadData() {
    setLoading(true);
    try {
      const [qRes, tRes] = await Promise.all([
        api.getQuestions({
          difficulty: selectedDifficulty || undefined,
          topic_id: selectedTopic || undefined,
          search: search || undefined,
          limit: 100
        }),
        api.getTopics()
      ]);
      setQuestions(qRes.data || []);
      setTopics(tRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const filteredQuestions = questions.filter(q => {
    if (!selectedStatus) return true;
    if (selectedStatus === 'completed') return q.submission_status === 'solved';
    if (selectedStatus === 'assigned') return q.is_assigned_to_me;
    if (selectedStatus === 'available') return !q.is_assigned_to_me && q.submission_status !== 'solved';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1425] via-[#101A32] to-[#0C1425] border border-cyan-900/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5" />
            <span>Problem Exploration</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Available Coding Challenges</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse our curated collection of Data Structures & Algorithms challenges. Solve directly in our in-platform IDE.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <div className="text-lg font-bold text-cyan-400">{questions.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Bank</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <div className="text-lg font-bold text-emerald-400">
              {questions.filter(q => q.submission_status === 'solved').length}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Solved</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by challenge title or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Difficulty */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Topic */}
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Topics</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="available">Available (Unassigned)</option>
            <option value="assigned">Assigned to Me</option>
            <option value="completed">Completed / Solved</option>
          </select>
        </div>
      </div>

      {/* Challenge Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <Compass className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No challenges matched your filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try broadening your search query or removing filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuestions.map(q => {
            const isSolved = q.submission_status === 'solved';
            return (
              <div
                key={q.id}
                className="group relative p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${difficultyColors[q.difficulty] || difficultyColors.easy}`}>
                      {q.difficulty}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isSolved && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Solved
                        </span>
                      )}
                      <span className="text-xs text-cyan-400 font-semibold">
                        +{q.points || 20} pts
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1">
                    {q.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {q.description || 'Solve algorithmic edge cases with optimal time and space complexity.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {q.topic_name || 'Algorithms'}
                  </span>

                  <button
                    onClick={() => onSelectProblem(q.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950/40 transition-all active:scale-95"
                  >
                    <span>{isSolved ? 'Review Code' : 'Solve Problem'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
