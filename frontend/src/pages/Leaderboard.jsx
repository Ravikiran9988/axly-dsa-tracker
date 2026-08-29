import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Flame, Star, Zap, ChevronUp } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Skeleton, EmptyState, ErrorState } from '../components/ui/index.jsx';

const PERIODS = [
  { value: 'all',   label: 'All Time' },
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const RANK_MEDALS = {
  1: { cls: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  2: { cls: 'text-slate-300', bg: 'bg-slate-500/10 border-slate-500/20' },
  3: { cls: 'text-amber-600', bg: 'bg-amber-700/10 border-amber-700/20' },
};

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('all');

  useEffect(() => { load(); }, [period]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLeaderboard(period);
      setEntries(res.data || res || []);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myEntry = entries.find(e => e.user_id === user?.id || e.id === user?.id);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Leaderboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Competitive ranking based on Daily Challenge points</p>
        </div>
        {myEntry && (
          <div className="card px-4 py-2.5 flex items-center gap-3 shrink-0">
            <div className="text-xs text-slate-500">Your Rank</div>
            <div className="text-lg font-bold text-axly-400">#{entries.indexOf(myEntry) + 1}</div>
            <div className="h-5 w-px bg-[#1a2540]" />
            <div className="flex items-center gap-1 text-amber-400 text-sm font-bold" title="Competitive Daily Challenge Points">
              <Zap className="w-4 h-4" /> {myEntry.competitive_points ?? myEntry.points ?? 0} pts
            </div>
          </div>
        )}
      </div>

      {/* Info Callout */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 flex items-center gap-2.5">
        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Competitive Scoring:</strong> Rankings are calculated strictly from Daily Challenge points. Self-paced Practice points and streak bonuses contribute to your personal Total Score.
        </span>
      </div>

      {/* Period tabs */}
      <div className="tab-bar">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`tab-btn ${period === p.value ? 'tab-btn-active' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {/* Top 3 podium */}
      {!loading && !error && top3.length >= 2 && (
        <div className="grid grid-cols-3 gap-3">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, podiumIdx) => {
            const rank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
            const isFirst = rank === 1;
            const isMe = entry.user_id === user?.id || entry.id === user?.id;
            return (
              <div
                key={entry.user_id || entry.id}
                className={`card flex flex-col items-center py-5 px-3 text-center relative transition-colors ${isMe ? 'border-axly-500/40' : ''} ${isFirst ? 'col-start-2 row-start-1' : ''}`}
              >
                {isFirst && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="bg-amber-500 rounded-full px-2 py-0.5 text-[10px] font-bold text-black">👑 #1</div>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg font-bold mb-2 ${
                  isFirst ? 'border-amber-400 text-amber-400 bg-amber-500/10' :
                  rank === 2 ? 'border-slate-400 text-slate-300 bg-slate-500/10' :
                  'border-amber-600 text-amber-600 bg-amber-600/10'
                }`}>
                  {(entry.name || entry.display_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="text-xs font-semibold text-white truncate max-w-full">
                  {entry.name || entry.display_name || 'Unknown'}
                  {isMe && <span className="ml-1 text-axly-400">(You)</span>}
                </div>
                <div className={`text-sm font-bold mt-1 ${
                  isFirst ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : 'text-amber-600'
                }`}>
                  {entry.competitive_points ?? entry.points ?? 0} pts
                </div>
                {entry.streak > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1 font-mono">
                    <Flame className="w-3 h-3 fill-amber-400" /> {entry.streak}d streak
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full ranking table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16 text-center">Rank</th>
                <th>Student</th>
                <th className="text-right">Competitive Points</th>
                <th className="hidden sm:table-cell text-right">Daily Challenges Solved</th>
                <th className="hidden md:table-cell text-right">Challenge Streak</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td><Skeleton className="h-4" style={{ width: `${60 + i * 5}%` }} /></td>
                    <td className="text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                    <td className="hidden sm:table-cell text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
                    <td className="hidden md:table-cell text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border-0 py-0">
                    <EmptyState icon={Trophy} title="No rankings yet" description="Complete Daily Challenges to earn points and appear here." />
                  </td>
                </tr>
              ) : (
                entries.map((entry, idx) => {
                  const rank = idx + 1;
                  const isMe = entry.user_id === user?.id || entry.id === user?.id;
                  const medal = RANK_MEDALS[rank];
                  const challengeStreak = entry.dailyChallengeStreak ?? entry.daily_challenge_streak ?? entry.streak ?? 0;
                  return (
                    <tr key={entry.user_id || entry.id} className={isMe ? 'bg-axly-500/5' : ''}>
                      <td className="text-center">
                        {medal ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${medal.cls} ${medal.bg}`}>
                            {rank}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono text-sm">{rank}</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isMe ? 'bg-axly-600 text-white' : 'bg-[#1a2540] text-slate-300'
                          }`}>
                            {(entry.name || entry.display_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${isMe ? 'text-axly-300' : 'text-slate-200'}`}>
                              {entry.name || entry.display_name || 'Unknown'}
                              {isMe && <span className="ml-1.5 text-[10px] font-semibold text-axly-400 bg-axly-500/10 px-1.5 py-0.5 rounded">You</span>}
                            </div>
                            {entry.cohort_name && (
                              <div className="text-[10px] text-slate-600">{entry.cohort_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-right">
                        <span className={`font-bold text-sm ${rank <= 3 ? 'text-amber-400' : 'text-slate-200'}`}>
                          {(entry.total_points || entry.points || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell text-right text-slate-400 text-sm">
                        {entry.problems_solved || entry.solved_count || entry.completed_count || '—'}
                      </td>
                      <td className="hidden md:table-cell text-right">
                        {challengeStreak > 0 ? (
                          <div className="inline-flex items-center gap-1 text-rose-400 text-xs font-semibold justify-end">
                            <Flame className="w-3.5 h-3.5 fill-rose-400" /> {challengeStreak}d
                          </div>
                        ) : <span className="text-slate-600 text-sm">—</span>}
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
