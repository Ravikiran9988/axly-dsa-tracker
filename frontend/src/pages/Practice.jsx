import React, { useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export default function Practice({ problems = [], onStart }) {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [topic, setTopic] = useState('All');
  const [pattern, setPattern] = useState('All');
  const [progress, setProgress] = useState('All');

  const topics = useMemo(() => ['All', ...new Set(problems.map(p => p.topic).filter(Boolean))], [problems]);
  const patterns = useMemo(() => ['All', ...new Set(problems.map(p => p.pattern).filter(Boolean))], [problems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter(p => {
      const state = p.progress || (p.solved ? 'Solved' : p.started ? 'In Progress' : 'Not Started');
      return (!q || `${p.title || ''} ${p.slug || ''} ${p.topic || ''} ${p.pattern || ''}`.toLowerCase().includes(q))
        && (difficulty === 'All' || p.difficulty === difficulty)
        && (topic === 'All' || p.topic === topic)
        && (pattern === 'All' || p.pattern === pattern)
        && (progress === 'All' || state === progress);
    });
  }, [problems, query, difficulty, topic, pattern, progress]);

  const counts = useMemo(() => {
    const result = { 'Not Started': 0, 'In Progress': 0, Solved: 0 };
    problems.forEach(p => {
      const state = p.progress || (p.solved ? 'Solved' : p.started ? 'In Progress' : 'Not Started');
      if (result[state] !== undefined) result[state]++;
    });
    return result;
  }, [problems]);

  const clearFilters = () => {
    setQuery(''); setDifficulty('All'); setTopic('All'); setPattern('All'); setProgress('All');
  };

  const hasFilters = query || difficulty !== 'All' || topic !== 'All' || pattern !== 'All' || progress !== 'All';

  return (
    <section className="practice-page">
      <div className="practice-header">
        <div>
          <h1>Practice</h1>
          <p>Choose problems from the library and build your progress. Practice does not affect competitive points.</p>
        </div>
      </div>

      <div className="practice-progress-tabs" role="tablist" aria-label="Practice progress">
        {['All', 'Not Started', 'In Progress', 'Solved'].map(tab => (
          <button key={tab} className={progress === tab ? 'active' : ''} onClick={() => setProgress(tab)}>
            {tab} {tab !== 'All' && <span>{counts[tab]}</span>}
          </button>
        ))}
      </div>

      <div className="practice-filters">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search problems, topics or patterns…" aria-label="Search practice problems" />
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)}><option>All</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
        <select value={topic} onChange={e => setTopic(e.target.value)}>{topics.map(x => <option key={x}>{x}</option>)}</select>
        <select value={pattern} onChange={e => setPattern(e.target.value)}>{patterns.map(x => <option key={x}>{x}</option>)}</select>
        {hasFilters && <button onClick={clearFilters}>Clear filters</button>}
      </div>

      <div className="practice-summary">Showing <strong>{filtered.length}</strong> of <strong>{problems.length}</strong> problems</div>

      {filtered.length === 0 ? (
        <div className="practice-empty">
          <h3>{problems.length === 0 ? 'Practice library is empty' : 'No problems found'}</h3>
          <p>{problems.length === 0 ? 'Practice problems will appear here once the seed is loaded.' : 'Try changing your search or filters.'}</p>
          {hasFilters && <button onClick={clearFilters}>Clear filters</button>}
        </div>
      ) : (
        <div className="practice-grid">
          {filtered.map(p => {
            const state = p.progress || (p.solved ? 'Solved' : p.started ? 'In Progress' : 'Not Started');
            const action = state === 'Solved' ? 'Review Problem' : state === 'In Progress' ? 'Continue' : 'Start Problem';
            return (
              <article className="practice-card" key={p.id || p.slug}>
                <div className="practice-card-top"><span>{p.difficulty}</span><span className={`practice-status ${state.toLowerCase().replace(' ', '-')}`}>{state}</span></div>
                <h3>{p.title}</h3>
                <div className="practice-meta"><span>{p.topic}</span>{p.pattern && <span>{p.pattern}</span>}{p.estimatedMinutes && <span>~{p.estimatedMinutes} min</span>}</div>
                {p.prerequisites?.length > 0 && <p className="practice-prereqs">Prerequisites: {p.prerequisites.join(', ')}</p>}
                <button onClick={() => onStart ? onStart(p) : window.location.assign(`/practice/${p.slug || p.id}`)}>{action}</button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
