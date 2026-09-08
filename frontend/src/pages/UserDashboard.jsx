import React, { useState, useEffect } from 'react';
import {
  Calendar, Flame, Trophy, Compass, CheckCircle2, ArrowRight, Zap,
  TrendingUp, Clock, BookOpen, Code2, AlertTriangle, Sparkles, Award, Play
} from 'lucide-react';
import { api } from '../services/api';
import { practiceApi } from '../services/practiceApi';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton, DifficultyBadge, ErrorState } from '../components/ui/index.jsx';
import DailyQuestionCard from '../components/DailyQuestionCard';

export default function UserDashboard({ user, onNavigate, onOpenChallenge }) {
  const [dailyData, setDailyData] = useState(null);
  const [practiceProgress, setPracticeProgress] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [dailyRes, practiceRes, analyticsRes, submissionsRes, recsRes] = await Promise.allSettled([
        api.getDailyQuestion(),
        practiceApi.getProgress(),
        api.getUserAnalytics(),
        api.getSubmissions({ user_id: user?.id, limit: 3 }),
        api.getRecommendations(4)
      ]);
      
      if (dailyRes.status === 'fulfilled') setDailyData(dailyRes.value);
      if (practiceRes.status === 'fulfilled') setPracticeProgress(practiceRes.value.data || practiceRes.value);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data || analyticsRes.value);
      if (submissionsRes.status === 'fulfilled') setRecentSubmissions(submissionsRes.value.data?.submissions || []);
      if (recsRes.status === 'fulfilled') setRecommendations(recsRes.value.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  const dailyQuestion = dailyData?.data || dailyData;
  const totalSolved = practiceProgress?.solved ?? analytics?.summary?.solved_submissions ?? analytics?.problems_solved ?? 0;
  const individualStreak = user?.individualStreak ?? analytics?.summary?.individualStreak ?? user?.streak ?? 1;
  const dailyChallengeStreak = user?.dailyChallengeStreak ?? analytics?.summary?.dailyChallengeStreak ?? dailyQuestion?.dailyChallengeStreak ?? 0;
  const totalPoints = user?.points || analytics?.summary?.total_score || analytics?.total_points || 0;

  const practiceTotal = practiceProgress?.total ?? 0;
  const practiceSolved = practiceProgress?.solved ?? 0;
  const practicePercent = practiceTotal > 0 ? Math.round((practiceSolved / practiceTotal) * 100) : 0;
  
  const diffMap = { easy: {total:0, solved:0}, medium: {total:0, solved:0}, hard: {total:0, solved:0} };
  (practiceProgress?.difficulties || []).forEach(d => {
    const k = String(d.difficulty || '').toLowerCase();
    if (diffMap[k]) diffMap[k] = { total: Number(d.total), solved: Number(d.solved) };
  });

  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* 1. Welcome / Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Active Session
          </div>
          <h1 className="text-3xl font-extrabold text-theme-text1 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Learner'}!
          </h1>
          <p className="text-sm text-theme-text2 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => onNavigate('available')} variant="outline" className="gap-2 border-theme-border bg-transparent hover:bg-theme-surface3 text-theme-text1">
            <Compass className="w-4 h-4" /> Practice Library
          </Button>
          <Button onClick={() => onNavigate('daily')} className="gap-2 bg-gradient-to-r from-theme-cyan to-theme-indigo hover:from-cyan-400 hover:to-indigo-500 border-0 shadow-lg shadow-cyan-500/20 text-white">
            <Calendar className="w-4 h-4" /> Daily Challenge
          </Button>
        </div>
      </div>

      {/* 2. Key Progress Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Problems Solved', value: totalSolved, icon: CheckCircle2, color: 'var(--emerald-400)', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Individual Streak', value: `${individualStreak}d`, icon: Zap, color: 'var(--amber-400)', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Challenge Streak', value: `${dailyChallengeStreak}d`, icon: Flame, color: 'var(--rose-400)', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          { label: 'Total Score', value: totalPoints, icon: Award, color: 'var(--cyan-400)', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
          { label: 'Global Rank', value: analytics?.rank ? `#${analytics.rank}` : '—', icon: Trophy, color: 'var(--indigo-400)', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
        ].map((s, i) => (
          <Card key={i} className="p-5 flex flex-col justify-between hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-theme-text3 font-semibold uppercase tracking-wider">{s.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg} ${s.border} border`}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-3xl font-black text-theme-text1">
              {loading ? <Skeleton className="h-8 w-16" /> : s.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Daily Challenge & Recommended */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 3. Today's Challenge */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-theme-text1">Daily Challenge</h2>
                  <p className="text-xs text-theme-text2 font-medium">One focused problem. Build the habit.</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('daily')} className="text-theme-text2 hover:text-theme-text1">
                View Past <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            {loading ? (
              <Card className="p-6 space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-32 mt-4" />
              </Card>
            ) : (
              <DailyQuestionCard
                dailyData={dailyData}
                onOpenInPlatform={() => {
                  if (onOpenChallenge && dailyQuestion?.id) {
                    onOpenChallenge(dailyQuestion.id);
                  } else if (onNavigate) {
                    onNavigate('daily');
                  }
                }}
              />
            )}
          </section>

          {/* 4. Recommended Practice */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-theme-text1">Recommended For You</h2>
                <p className="text-xs text-theme-text2 font-medium">Based on your recent activity and weaknesses.</p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {loading ? (
                Array.from({length: 4}).map((_, i) => (
                  <Card key={i} className="p-5 border-theme-border bg-theme-surface">
                    <Skeleton className="h-5 w-3/4 mb-3" />
                    <div className="flex gap-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-20" /></div>
                  </Card>
                ))
              ) : recommendations?.length > 0 ? (
                recommendations.map((rec) => (
                  <Card key={rec.id} onClick={() => onOpenChallenge && onOpenChallenge(rec.id)} className="p-5 border-theme-border bg-theme-surface hover:border-theme-border transition-colors cursor-pointer group">
                    <h3 className="text-sm font-bold text-theme-text1 group-hover:text-cyan-400 transition-colors mb-3 line-clamp-1">
                      {rec.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DifficultyBadge difficulty={rec.difficulty} />
                        {rec.topic && <span className="text-[10px] px-2 py-0.5 rounded-md bg-theme-surface2 text-theme-text2 font-medium">{rec.topic}</span>}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-theme-surface2 flex items-center justify-center group-hover:bg-cyan-500/20 text-theme-text3 group-hover:text-cyan-400 transition-colors">
                        <Play className="w-3 h-3 ml-0.5" />
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 p-8 text-center border border-theme-border rounded-xl bg-theme-surface border-dashed">
                  <p className="text-sm text-theme-text3">Solve more problems to get personalized recommendations.</p>
                  <Button variant="outline" size="sm" onClick={() => onNavigate('available')} className="mt-4 border-theme-border">
                    Browse Library
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Progress & Activity */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* 5. Learning Progress */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-theme-text1">Library Progress</h2>
                <p className="text-xs text-theme-text2 font-medium">Difficulty breakdown</p>
              </div>
            </div>

            <Card className="p-5 border-theme-border bg-theme-surface">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <div className="text-3xl font-black text-theme-text1">{practiceSolved}<span className="text-lg text-theme-text3 font-medium">/{practiceTotal}</span></div>
                  <div className="text-xs text-theme-text2 font-medium mt-1">Total Curated Problems</div>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 flex items-center justify-center relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-cyan-500"
                      strokeDasharray={`${practicePercent}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="3"
                    />
                  </svg>
                  <span className="text-xs font-bold text-cyan-400">{practicePercent}%</span>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Easy', key: 'easy', color: 'bg-emerald-400' },
                  { label: 'Medium', key: 'medium', color: 'bg-amber-400' },
                  { label: 'Hard', key: 'hard', color: 'bg-rose-400' },
                ].map(d => {
                  const stats = diffMap[d.key];
                  const pct = stats.total > 0 ? (stats.solved / stats.total) * 100 : 0;
                  return (
                    <div key={d.label}>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-theme-text2">{d.label}</span>
                        <span className="text-theme-text3">{stats.solved}/{stats.total}</span>
                      </div>
                      <div className="h-1.5 w-full bg-theme-surface2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${d.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

          {/* 6. Recent Activity */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-theme-text1">Recent Activity</h2>
                <p className="text-xs text-theme-text2 font-medium">Your latest submissions</p>
              </div>
            </div>

            <Card className="border-theme-border bg-theme-surface overflow-hidden">
              {loading ? (
                <div className="p-5 space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex gap-3"><Skeleton className="w-8 h-8 rounded" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
                  ))}
                </div>
              ) : recentSubmissions?.length > 0 ? (
                <div className="divide-y divide-slate-800/60">
                  {recentSubmissions.map((sub, i) => (
                    <div key={sub.id || i} className="p-4 flex gap-3 hover:bg-theme-surface2 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sub.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {sub.status === 'accepted' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-theme-text1 truncate">{sub.question?.title || `Question #${sub.question_id}`}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${sub.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {sub.status}
                          </span>
                          <span className="text-[10px] text-theme-text3">
                            {new Date(sub.created_at || Date.now()).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-theme-text3">No recent submissions found.</p>
                </div>
              )}
            </Card>
          </section>

        </div>
      </div>
    </div>
  );
}
