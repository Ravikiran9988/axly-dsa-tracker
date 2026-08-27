import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Flame,
  Trophy,
  Compass,
  CheckSquare,
  Sparkles,
  Zap,
  MessageSquareQuote,
  Layers,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import DailyQuestionCard from '../components/DailyQuestionCard';

export default function UserDashboard({ user, onSelectProblem, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [dailyRes, tasksRes, subsRes, qRes, profRes] = await Promise.all([
        api.getDailyQuestion().catch(() => ({ data: null })),
        api.getAssignments({ limit: 10 }).catch(() => ({ data: [] })),
        api.getSubmissions({ limit: 5 }).catch(() => ({ data: [] })),
        api.getQuestions({ limit: 6 }).catch(() => ({ data: [] })),
        api.getMyProfile().catch(() => ({ data: null }))
      ]);

      setDailyQuestion(dailyRes?.data || null);
      setTasks(tasksRes?.data || []);
      setSubmissions(subsRes?.data || []);
      setRecommended(qRes?.data || []);
      setProfile(profRes?.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const assignedTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.submission_status === 'solved' || t.status === 'completed').length;
  const ongoingTasks = tasks.filter(t => t.submission_status === 'attempted' || t.status === 'ongoing').length;
  const overdueTasks = tasks.filter(t => t.is_overdue).length;
  const pendingTasks = Math.max(0, assignedTasks - completedTasks);

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const recentFeedback = profile?.recent_feedback || [];

  return (
    <div className="space-y-8">
      {/* Welcome Hero Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0C1425] via-[#121E3D] to-[#0C1425] border border-cyan-900/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Learning Platform</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name || 'Developer'}! 👋
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl leading-relaxed">
            You are on a <strong>{user?.streak || 1} day coding streak</strong>. Solve today's challenge and complete your weekly cohort goals to climb the leaderboard.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('tasks')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/50 transition-all active:scale-95"
          >
            <CheckSquare className="w-4 h-4" />
            <span>View My Tasks</span>
          </button>
          <button
            onClick={() => onNavigate('available')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Browse Challenges</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xl font-extrabold text-white">{assignedTasks}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Assigned</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xl font-extrabold text-emerald-400">{completedTasks}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Completed</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xl font-extrabold text-cyan-400">{ongoingTasks}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Ongoing</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xl font-extrabold text-amber-400">{pendingTasks}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Pending</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xl font-extrabold text-rose-400">{overdueTasks}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Overdue</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xl font-extrabold text-indigo-400">{user?.points || 100}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Points</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center col-span-2 sm:col-span-1">
          <div className="text-xl font-extrabold text-amber-400 flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 fill-amber-400" /> {user?.streak || 1}d
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Streak</div>
        </div>
      </div>

      {/* SECTION A: Today's Daily Spotlight Challenge */}
      {dailyQuestion && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Today's Spotlight Challenge</span>
            </h2>
            <span className="text-xs text-slate-400">Daily refresh at 00:00 UTC</span>
          </div>

          <DailyQuestionCard
            dailyQuestion={dailyQuestion}
            onStatusChange={loadDashboardData}
            onOpenInPlatform={() => onSelectProblem(dailyQuestion.question_id || dailyQuestion.id)}
          />
        </div>
      )}

      {/* SECTION D: Mentor Feedback Callout (If Available) */}
      {recentFeedback.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-950/30 via-slate-900 to-slate-950 border border-orange-800/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <MessageSquareQuote className="w-4 h-4" />
              <span>Mentor Review Notification</span>
            </div>
            <button
              onClick={() => onNavigate('submissions')}
              className="text-xs text-orange-300 hover:underline font-semibold flex items-center gap-1"
            >
              <span>View All Feedback</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-white mb-0.5">{recentFeedback[0].question_title}</div>
              <p className="text-xs text-slate-300 italic">"{recentFeedback[0].feedback}"</p>
            </div>
            <button
              onClick={() => onSelectProblem(recentFeedback[0].question_id)}
              className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-md shrink-0 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revise in IDE</span>
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Split: Active Tasks & Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Active Assigned Tasks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              <span>Assigned Tasks & Deadlines</span>
            </h2>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {tasks.slice(0, 4).map(task => {
              const isCompleted = task.submission_status === 'solved' || task.status === 'completed';
              return (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${difficultyColors[task.question_difficulty] || difficultyColors.easy}`}>
                        {task.question_difficulty}
                      </span>
                      {task.priority && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {task.priority} Priority
                        </span>
                      )}
                      {task.is_overdue && (
                        <span className="text-[10px] text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-800/40 font-bold">
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white truncate">{task.question_title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      {task.due_date && <span>Due {task.due_date}</span>}
                      <span>+{task.question_points || 20} pts</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectProblem(task.question_id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1 shadow-md transition-all ${
                      isCompleted
                        ? 'bg-slate-800 text-white hover:bg-slate-700'
                        : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-950/40'
                    }`}
                  >
                    <span>{isCompleted ? 'Review' : 'Solve'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Recent Submissions & Progress */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Recent Submissions</span>
            </h2>
            <button
              onClick={() => onNavigate('submissions')}
              className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            {submissions.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">No recent submissions found.</div>
            ) : (
              submissions.map(sub => (
                <div key={sub.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white truncate max-w-[170px]">{sub.question_title}</div>
                    <div className="text-[10px] text-slate-400">
                      {sub.submission_type === 'github' ? 'GitHub Link' : 'In-Platform IDE'} • {sub.passed_tests || 0}/{sub.total_tests || 0} passed
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    sub.status === 'solved' || sub.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : sub.status === 'changes_requested'
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  }`}>
                    {sub.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SECTION G: Recommended Challenges */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Recommended Challenges</span>
          </h2>
          <button
            onClick={() => onNavigate('available')}
            className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1"
          >
            <span>Explore All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommended.slice(0, 3).map(q => (
            <div
              key={q.id}
              onClick={() => onSelectProblem(q.id)}
              className="group p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer shadow-lg flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${difficultyColors[q.difficulty] || difficultyColors.easy}`}>
                    {q.difficulty}
                  </span>
                  <span className="text-xs text-indigo-400 font-semibold">+{q.points || 20} pts</span>
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {q.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {q.description || 'Master key algorithm patterns and edge cases.'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span>{q.topic_name || 'Algorithms'}</span>
                <span className="text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Solve <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
