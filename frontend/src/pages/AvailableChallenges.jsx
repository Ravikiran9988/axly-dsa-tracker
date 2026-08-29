import React, { useEffect, useState } from 'react';
import { Compass, Search, CheckCircle2, ArrowRight, Code2, BookOpen, SlidersHorizontal, RotateCcw, Clock3, Ban } from 'lucide-react';
import { practiceApi } from '../services/practiceApi';

export default function AvailableChallenges({ onSelectProblem }) {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topic, setTopic] = useState('');
  const [pattern, setPattern] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    load();
  }, [difficulty, topic, pattern, status, search]);

  async function load() {
    setLoading(true);
    try {
      const [r, t, p] = await Promise.all([
        practiceApi.getProblems({ difficulty, topic_id: topic, pattern_id: pattern, status, search, limit: 100 }),
        practiceApi.getTopics(),
        practiceApi.getPatterns()
      ]);
      setQuestions(r.data || []);
      setTopics(t.data || []);
      setPatterns(p.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function abandon(id) {
    if (!window.confirm('Abandon this practice problem? You can start it again anytime.')) return;
    setBusy(id);
    try {
      await practiceApi.abandon(id);
      await load();
    } catch (e) {
      console.error(e);
      window.alert(e.message || 'Unable to abandon problem');
    } finally {
      setBusy(null);
    }
  }

  const dc = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0C1425] via-[#101A32] to-[#0C1425] border border-cyan-900/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Practice Library · Self-Selected</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Practice Problems Bank</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Choose any problem to practice at your own pace. Practice improves your personal analytics and progress, but gives <strong>0 competitive leaderboard points</strong>.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <div className="text-xl font-extrabold text-cyan-400">{questions.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total</div>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <div className="text-xl font-extrabold text-emerald-400">{questions.filter(q => q.practice_status === 'solved').length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Solved</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search problems by title, tags or concepts..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          value={topic}
          onChange={e => setTopic(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2"
        >
          <option value="">All Topics</option>
          {topics.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.problem_count})</option>
          ))}
        </select>

        <select
          value={pattern}
          onChange={e => setPattern(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2"
        >
          <option value="">All Patterns</option>
          {patterns.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2"
        >
          <option value="">All Progress States</option>
          <option value="unsolved">Not Started / Unsolved</option>
          <option value="in-progress">In Progress</option>
          <option value="solved">Solved</option>
          <option value="abandoned">Abandoned</option>
        </select>

        <button
          onClick={() => { setDifficulty(''); setTopic(''); setPattern(''); setStatus(''); setSearch(''); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white hover:bg-slate-800/60"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Problems Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <Compass className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No practice problems matched your filters</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting filters or adjusting search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map(q => {
            const solved = q.practice_status === 'solved';
            const inProgress = q.practice_status === 'in_progress';
            const abandoned = q.practice_status === 'abandoned';

            return (
              <div
                key={q.id}
                className="group p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-cyan-500/40 transition-all shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${dc[q.difficulty] || dc.easy}`}>
                      {q.difficulty}
                    </span>
                    {solved ? (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Solved
                      </span>
                    ) : inProgress ? (
                      <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1">
                        <Clock3 className="w-3 h-3" /> In Progress
                      </span>
                    ) : abandoned ? (
                      <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                        <Ban className="w-3 h-3" /> Abandoned
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 mb-1 leading-snug">{q.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{q.description}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {q.topic_name && <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">{q.topic_name}</span>}
                    {q.pattern_id && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300">
                        {patterns.find(p => p.id === q.pattern_id)?.name || q.pattern_id}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 font-mono">{q.estimated_time || '30 mins'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProblem(q.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{solved ? 'Review' : inProgress ? 'Continue' : abandoned ? 'Restart' : 'Start'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {inProgress && !solved && (
                      <button
                        disabled={busy === q.id}
                        onClick={() => abandon(q.id)}
                        title="Abandon practice problem"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 text-xs transition-all disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Abandon</span>
                      </button>
                    )}
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
