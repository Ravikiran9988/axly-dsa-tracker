import React, { useEffect, useState } from 'react';
import { Calendar, Flame, Trophy, Compass, Sparkles, ChevronRight, MessageSquareQuote, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import DailyQuestionCard from '../components/DailyQuestionCard';

export default function UserDashboard({ user, onSelectProblem, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => { loadDashboardData(); }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [dailyRes, subsRes, qRes, profRes] = await Promise.all([
        api.getDailyQuestion().catch(() => ({ data: null })),
        api.getSubmissions({ limit: 5 }).catch(() => ({ data: [] })),
        api.getQuestions({ limit: 6 }).catch(() => ({ data: [] })),
        api.getMyProfile().catch(() => ({ data: null }))
      ]);
      setDailyQuestion(dailyRes?.data || null);
      setSubmissions(subsRes?.data || []);
      setRecommended(qRes?.data || []);
      setProfile(profRes?.data || null);
    } finally {
      setLoading(false);
    }
  }

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };
  const recentFeedback = profile?.recent_feedback || [];
  const solvedCount = profile?.solved_count ?? user?.solved_count ?? 0;
  const practiceCount = profile?.practice_solved_count ?? 0;
  const points = user?.points ?? profile?.points ?? 0;
  const streak = user?.streak ?? profile?.streak ?? 0;

  return (
    <div className="space-y-8">
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0C1425] via-[#121E3D] to-[#0C1425] border border-cyan-900/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Daily Challenge + Practice</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Welcome back, {user?.name || 'Developer'}! 👋</h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl leading-relaxed">Keep your <strong>{streak} day streak</strong> alive with today's challenge, then practice any problem you want without affecting your competitive score.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => onNavigate('available')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg transition-all">
            <Compass className="w-4 h-4" /> Practice Problems
          </button>
          <button onClick={() => onNavigate('leaderboard')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all">
            <Trophy className="w-4 h-4" /> Leaderboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center"><div className="text-xl font-extrabold text-indigo-400">{points}</div><div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Daily Points</div></div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center"><div className="text-xl font-extrabold text-emerald-400">{solvedCount}</div><div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Problems Solved</div></div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center"><div className="text-xl font-extrabold text-cyan-400">{practiceCount}</div><div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Practice Solved</div></div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center"><div className="text-xl font-extrabold text-amber-400 flex items-center justify-center gap-1"><Flame className="w-4 h-4 fill-amber-400" /> {streak}d</div><div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Streak</div></div>
      </div>

      {dailyQuestion && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-cyan-400" /> Today's Daily Challenge</h2>
            <span className="text-xs text-slate-400">1 challenge • 100 competitive points</span>
          </div>
          <DailyQuestionCard dailyQuestion={dailyQuestion} onStatusChange={loadDashboardData} onOpenInPlatform={() => onSelectProblem(dailyQuestion.question_id || dailyQuestion.id)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="text-base font-bold text-white flex items-center gap-2"><Compass className="w-4 h-4 text-indigo-400" /> Practice freely</h2><p className="text-xs text-slate-400 mt-1">Choose any published problem. Practice has no competitive points.</p></div>
            <button onClick={() => onNavigate('available')} className="text-xs text-cyan-400 font-semibold flex items-center gap-1">Explore <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommended.slice(0, 4).map(q => (
              <button key={q.id} onClick={() => onSelectProblem(q.id)} className="text-left p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 transition-all">
                <div className="flex items-center justify-between gap-2"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${difficultyColors[q.difficulty] || difficultyColors.easy}`}>{q.difficulty}</span><span className="text-[10px] text-slate-500">Practice</span></div>
                <div className="text-sm font-bold text-white mt-2 truncate">{q.title}</div>
                <div className="text-[11px] text-slate-400 mt-1">{q.topic_name || 'Algorithms'}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Recent Activity</h2><button onClick={() => onNavigate('submissions')} className="text-xs text-cyan-400 font-semibold">History</button></div>
          {submissions.length === 0 ? <div className="text-center py-8 text-slate-400 text-xs">No submissions yet. Start with today's challenge or practice a problem.</div> : submissions.map(sub => (
            <div key={sub.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3">
              <div className="min-w-0"><div className="font-bold text-white text-xs truncate">{sub.question_title}</div><div className="text-[10px] text-slate-400 mt-1">{sub.submission_type === 'github' ? 'GitHub Link' : 'In-Platform IDE'} • {sub.passed_tests || 0}/{sub.total_tests || 0} passed</div></div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{sub.status}</span>
            </div>
          ))}
        </div>
      </div>

      {recentFeedback.length > 0 && <div className="p-5 rounded-2xl bg-orange-950/20 border border-orange-800/40 space-y-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider"><MessageSquareQuote className="w-4 h-4" /> Latest Review</div><button onClick={() => onNavigate('submissions')} className="text-xs text-orange-300">View feedback</button></div><div className="text-xs text-slate-300">{recentFeedback[0].question_title}: <span className="italic">"{recentFeedback[0].feedback}"</span></div></div>}

      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div><div className="text-sm font-bold text-white flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Your practice still counts toward learning</div><p className="text-xs text-slate-400 mt-1">Practice submissions improve your history, analytics and recommendations, but never add competitive leaderboard points.</p></div>
        <button onClick={() => onNavigate('available')} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-2">Browse Problems <ArrowRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
