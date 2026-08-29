import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, CheckCircle2, Clock3, Ban, Compass, SlidersHorizontal,
  ArrowRight, RotateCcw, ChevronRight, X, Filter
} from 'lucide-react';
import { practiceApi } from '../services/practiceApi';
import { DifficultyBadge, SkeletonRows, EmptyState } from '../components/ui/index.jsx';

const STATUS_DISPLAY = {
  solved:      { icon: CheckCircle2, label: 'Solved',      cls: 'text-emerald-400' },
  in_progress: { icon: Clock3,       label: 'In Progress', cls: 'text-axly-400' },
  abandoned:   { icon: Ban,          label: 'Abandoned',   cls: 'text-amber-400' },
};

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

  const hasFilters = difficulty || topic || pattern || status || search;

  useEffect(() => { load(); }, [difficulty, topic, pattern, status, search]);

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

  function clearFilters() {
    setDifficulty(''); setTopic(''); setPattern(''); setStatus(''); setSearch('');
  }

  async function abandon(id, e) {
    e.stopPropagation();
    if (!window.confirm('Abandon this problem? You can restart it anytime.')) return;
    setBusy(id);
    try {
      await practiceApi.abandon(id);
      await load();
    } catch (e) {
      window.alert(e.message || 'Unable to abandon problem');
    } finally {
      setBusy(null);
    }
  }

  const solved = questions.filter(q => q.practice_status === 'solved').length;
  const inProgress = questions.filter(q => q.practice_status === 'in_progress').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Practice Library</h1>
          <p className="text-sm text-slate-400 mt-0.5">Self-paced practice &mdash; no competitive points</p>
        </div>
        <div className="flex items-center gap-4 text-sm shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white">{questions.length}</span>
            <span className="text-slate-500">problems</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-emerald-400">{solved}</span>
            <span className="text-slate-500">solved</span>
          </div>
          {inProgress > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-axly-400">{inProgress}</span>
              <span className="text-slate-500">in progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search problems..."
            aria-label="Search problems"
            className="input-field pl-9 py-1.5 text-sm h-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          aria-label="Filter by difficulty"
          className="select-field h-9 text-sm"
        >
          <option value="">Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          value={topic}
          onChange={e => setTopic(e.target.value)}
          aria-label="Filter by topic"
          className="select-field h-9 text-sm"
        >
          <option value="">Topic</option>
          {topics.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.problem_count})</option>
          ))}
        </select>

        <select
          value={pattern}
          onChange={e => setPattern(e.target.value)}
          aria-label="Filter by pattern"
          className="select-field h-9 text-sm"
        >
          <option value="">Pattern</option>
          {patterns.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="select-field h-9 text-sm"
        >
          <option value="">Status</option>
          <option value="unsolved">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="solved">Solved</option>
          <option value="abandoned">Abandoned</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="btn-ghost btn-sm flex items-center gap-1.5 h-9"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>Problem</th>
                <th className="hidden sm:table-cell">Difficulty</th>
                <th className="hidden md:table-cell">Topic</th>
                <th className="hidden lg:table-cell">Pattern</th>
                <th className="hidden lg:table-cell w-24">Est. Time</th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows count={8} cols={8} />
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-0 border-0">
                    <EmptyState
                      icon={Compass}
                      title="No problems match your filters"
                      description="Try adjusting your search or clearing the filters."
                      action={
                        hasFilters && (
                          <button onClick={clearFilters} className="btn-primary btn-sm mt-1">
                            Clear filters
                          </button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                questions.map((q, idx) => {
                  const solved = q.practice_status === 'solved';
                  const inProg = q.practice_status === 'in_progress';
                  const abandoned = q.practice_status === 'abandoned';
                  const statusInfo = STATUS_DISPLAY[q.practice_status];
                  const patternName = q.pattern_name || patterns.find(p => p.id === q.pattern_id)?.name;

                  return (
                    <tr
                      key={q.id}
                      className={`cursor-pointer ${solved ? 'opacity-75' : ''}`}
                      onClick={() => onSelectProblem(q.id)}
                    >
                      <td className="text-center text-slate-600 font-mono text-xs w-12">
                        {idx + 1}
                      </td>
                      <td>
                        <div className="font-medium text-slate-200 hover:text-white transition-colors leading-snug">
                          {q.title}
                        </div>
                        {/* Mobile: show difficulty + status inline */}
                        <div className="flex items-center gap-2 mt-1 sm:hidden">
                          <DifficultyBadge difficulty={q.difficulty} />
                          {statusInfo && (
                            <span className={`text-xs flex items-center gap-1 ${statusInfo.cls}`}>
                              <statusInfo.icon className="w-3 h-3" />
                              {statusInfo.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <DifficultyBadge difficulty={q.difficulty} />
                      </td>
                      <td className="hidden md:table-cell text-slate-400 text-xs">
                        {q.topic_name || '—'}
                      </td>
                      <td className="hidden lg:table-cell text-slate-500 text-xs">
                        {patternName || '—'}
                      </td>
                      <td className="hidden lg:table-cell text-slate-500 text-xs font-mono">
                        {q.estimated_time || '~30m'}
                      </td>
                      <td className="hidden sm:table-cell">
                        {statusInfo ? (
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${statusInfo.cls}`}>
                            <statusInfo.icon className="w-3.5 h-3.5" />
                            {statusInfo.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectProblem(q.id)}
                            className="btn-primary btn-sm inline-flex items-center gap-1"
                          >
                            {solved ? 'Review' : inProg ? 'Continue' : abandoned ? 'Restart' : 'Solve'}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          {inProg && !solved && (
                            <button
                              disabled={busy === q.id}
                              onClick={e => abandon(q.id, e)}
                              title="Abandon"
                              aria-label="Abandon problem"
                              className="btn-ghost btn-sm p-1.5 disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
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
