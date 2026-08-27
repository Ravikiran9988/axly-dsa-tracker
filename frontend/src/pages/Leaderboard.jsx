import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Award,
  Medal,
  Building,
  CheckCircle2,
  Zap,
  Crown
} from 'lucide-react';
import { api } from '../services/api';

export default function Leaderboard({ currentUser }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      const res = await api.getLeaderboard();
      setLeaders(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const top3Medals = [
    { rank: 1, color: 'text-amber-400', bg: 'from-amber-500/20 to-yellow-500/5', border: 'border-amber-500/40' },
    { rank: 2, color: 'text-slate-300', bg: 'from-slate-400/20 to-slate-600/5', border: 'border-slate-400/40' },
    { rank: 3, color: 'text-amber-600', bg: 'from-amber-700/20 to-orange-900/5', border: 'border-amber-700/40' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0C1425] via-[#152042] to-[#0C1425] border border-cyan-900/30 shadow-2xl text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Trophy className="w-3.5 h-3.5" />
          <span>Global Rankings</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Platform Hall of Fame & Leaderboard
        </h1>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          Compete with fellow developers and cohort peers. Earn points, maintain coding streaks, and solve complex algorithms to climb the ranks.
        </p>
      </div>

      {/* Top 3 Podium Cards */}
      {!loading && leaders.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Rank 2 */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-700/60 shadow-xl flex flex-col items-center text-center space-y-3 order-2 md:order-1">
            <div className="w-8 h-8 rounded-full bg-slate-400/20 text-slate-300 font-extrabold flex items-center justify-center text-xs">
              #2
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-600 to-slate-400 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              {leaders[1]?.name ? leaders[1].name[0].toUpperCase() : '2'}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{leaders[1]?.name}</div>
              <div className="text-[11px] text-slate-400">{leaders[1]?.institution || 'Student'}</div>
            </div>
            <div className="text-xs font-extrabold text-cyan-400">{leaders[1]?.points || 0} pts</div>
          </div>

          {/* Rank 1 */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-950/30 via-slate-900/90 to-slate-950 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 flex flex-col items-center text-center space-y-3 order-1 md:order-2 -translate-y-2">
            <Crown className="w-7 h-7 text-amber-400 fill-amber-400 animate-bounce" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-amber-500/30">
              {leaders[0]?.name ? leaders[0].name[0].toUpperCase() : '1'}
            </div>
            <div>
              <div className="text-base font-extrabold text-white">{leaders[0]?.name}</div>
              <div className="text-xs text-slate-400">{leaders[0]?.institution || 'Top Performer'}</div>
            </div>
            <div className="text-sm font-extrabold text-amber-400">{leaders[0]?.points || 0} pts</div>
          </div>

          {/* Rank 3 */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-amber-800/40 shadow-xl flex flex-col items-center text-center space-y-3 order-3">
            <div className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 font-extrabold flex items-center justify-center text-xs">
              #3
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-800 to-amber-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              {leaders[2]?.name ? leaders[2].name[0].toUpperCase() : '3'}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{leaders[2]?.name}</div>
              <div className="text-[11px] text-slate-400">{leaders[2]?.institution || 'Student'}</div>
            </div>
            <div className="text-xs font-extrabold text-cyan-400">{leaders[2]?.points || 0} pts</div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Developer</th>
                <th className="px-6 py-4">Institution</th>
                <th className="px-6 py-4 text-center">Completed</th>
                <th className="px-6 py-4 text-center">Streak</th>
                <th className="px-6 py-4 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading rankings...
                  </td>
                </tr>
              ) : (
                leaders.map((user, idx) => {
                  const isCurrent = currentUser?.id === user.id;
                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-cyan-950/30 border-l-4 border-l-cyan-500'
                          : 'hover:bg-slate-850/40'
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-300">
                        {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {user.name ? user.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {user.institution || 'Axly Academy'}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-emerald-400">
                        {user.completed_count || 0}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                          <Flame className="w-3.5 h-3.5 fill-amber-400" /> {user.streak || 0}d
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-cyan-400">
                        {user.points || 0}
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
