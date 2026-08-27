import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  MessageSquareQuote
} from 'lucide-react';
import { api } from '../services/api';

export default function MyTasks({ onSelectProblem }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'assigned' | 'ongoing' | 'completed' | 'incomplete' | 'overdue'
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTasks();
  }, [activeTab]);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await api.getAssignments({
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 100
      });
      setAssignments(res.data || []);
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

  const priorityColors = {
    High: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
    Medium: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
    Low: 'text-slate-400 bg-slate-800 border-slate-700'
  };

  const statusBadges = {
    completed: { label: 'Completed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    approved: { label: 'Approved', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    ongoing: { label: 'Ongoing', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    attempted: { label: 'Attempted', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    changes_requested: { label: 'Changes Requested', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    under_review: { label: 'Under Review', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    assigned: { label: 'Assigned', color: 'text-slate-300 bg-slate-800 border-slate-700' },
    incomplete: { label: 'Incomplete', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    overdue: { label: 'Overdue', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
  };

  const tabs = [
    { id: 'all', label: 'All Tasks' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'completed', label: 'Completed' },
    { id: 'incomplete', label: 'Incomplete' },
    { id: 'overdue', label: 'Overdue' }
  ];

  const filteredTasks = assignments.filter(task => {
    if (!search.trim()) return true;
    return task.question_title?.toLowerCase().includes(search.toLowerCase()) ||
      task.topic_name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1425] via-[#121B35] to-[#0C1425] border border-cyan-900/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Assigned Curriculum</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Tasks & Assignments</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track your assigned homework, active challenge deadlines, and mentor feedback revisions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <div className="text-lg font-bold text-cyan-400">{assignments.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Tasks</div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Task Cards List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <CheckSquare className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No tasks in this category</h3>
          <p className="text-xs text-slate-500 mt-1">You're all caught up or no assignments match your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const isCompleted = task.submission_status === 'solved' || task.status === 'completed';
            const isChangesRequested = task.submission_status === 'changes_requested' || task.review_status === 'changes_requested';
            const badge = statusBadges[task.submission_status] || statusBadges[task.status] || statusBadges.assigned;

            return (
              <div
                key={task.id}
                className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${difficultyColors[task.question_difficulty] || difficultyColors.easy}`}>
                      {task.question_difficulty}
                    </span>
                    {task.priority && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${priorityColors[task.priority] || priorityColors.Medium}`}>
                        {task.priority} Priority
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                    {task.is_overdue && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-tight truncate">
                    {task.question_title}
                  </h3>

                  {task.instructions && (
                    <p className="text-xs text-slate-400 line-clamp-1 italic">
                      "{task.instructions}"
                    </p>
                  )}

                  {task.feedback && isChangesRequested && (
                    <div className="p-2.5 rounded-xl bg-orange-950/30 border border-orange-800/40 text-orange-200 text-xs flex items-start gap-2">
                      <MessageSquareQuote className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-orange-300">Mentor Feedback: </span>
                        {task.feedback}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    {task.cohort_name && (
                      <span className="text-cyan-400">{task.cohort_name}</span>
                    )}
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Due {task.due_date}
                      </span>
                    )}
                    <span className="text-slate-400">+{task.question_points || 20} pts</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectProblem(task.question_id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 ${
                      isCompleted
                        ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        : isChangesRequested
                          ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-950/50'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View Solution</span>
                      </>
                    ) : isChangesRequested ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revise & Resubmit</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{task.submission_status === 'attempted' ? 'Continue' : 'Start Task'}</span>
                      </>
                    )}
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
