import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import QuestionCard from '../components/QuestionCard';
import AdminQuestionModal from '../components/AdminQuestionModal';
import AdminAssignModal from '../components/AdminAssignModal';
import AdminDailyQuestionModal from '../components/AdminDailyQuestionModal';
import { 
  Users, 
  Layers, 
  CheckCircle2, 
  Plus, 
  Sparkles, 
  UserPlus, 
  Trash2, 
  ExternalLink,
  Search,
  Filter,
  AlertCircle,
  TrendingUp,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  BarChart,
  ClipboardList,
  GraduationCap
} from 'lucide-react';

export default function AdminDashboard({ onOpenDailyModal }) {
  const [activeAdminTab, setActiveAdminTab] = useState('questions'); // 'questions' | 'assignments' | 'users'
  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [userProgressList, setUserProgressList] = useState([]);
  const [dailyData, setDailyData] = useState(null);

  // Filters for Questions tab
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });

  // Modals state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetQuestion, setAssignTargetQuestion] = useState(null);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all admin data
  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, topicsRes, usersRes, dailyRes, questionsRes, progRes, asgnRes] = await Promise.all([
        api.getAdminStats(),
        api.getTopics(),
        api.getUsers({ limit: 100 }),
        api.getDailyQuestion(),
        api.getQuestions({
          difficulty: difficultyFilter || undefined,
          assigned: assignedFilter || undefined,
          topic_id: topicFilter || undefined,
          search: searchQuery || undefined,
          page: pagination.page,
          limit: pagination.limit
        }),
        api.getAdminProgress({ limit: 50 }),
        api.getAssignments({ limit: 50 })
      ]);

      setStats(statsRes.data);
      setTopics(topicsRes.data || []);
      setUsers(usersRes.data || []);
      setDailyData(dailyRes);
      setQuestions(questionsRes.data || []);
      setUserProgressList(progRes.data || []);
      setAssignments(asgnRes.data || []);
      setPagination({
        page: questionsRes.page,
        limit: questionsRes.limit,
        total: questionsRes.total
      });
    } catch (err) {
      setError(err.message || 'Failed to load admin portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [difficultyFilter, assignedFilter, topicFilter, pagination.page]);

  // Question CRUD handlers
  const handleSaveQuestion = async (formData) => {
    if (formData.id) {
      await api.updateQuestion(formData.id, formData);
    } else {
      await api.createQuestion(formData);
    }
    await loadAdminData();
  };

  const handleDeleteQuestion = async (question) => {
    if (!window.confirm(`Are you sure you want to deactivate "${question.title}"?`)) return;
    try {
      await api.deleteQuestion(question.id);
      await loadAdminData();
    } catch (err) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  // Assignment handlers
  const handleAssignAction = async (payload) => {
    if (payload.type === 'single') {
      await api.createAssignment({
        user_id: payload.user_id,
        question_id: payload.question_id
      });
    } else {
      await api.bulkAssign({
        user_ids: payload.user_ids,
        question_ids: payload.question_ids
      });
    }
    await loadAdminData();
  };

  const handleUnassign = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to unassign this question? (Submissions history will be preserved)')) return;
    try {
      await api.unassign(assignmentId);
      await loadAdminData();
    } catch (err) {
      alert(`Unassign Error: ${err.message}`);
    }
  };

  // Daily Question Handler
  const handleSetDaily = async (questionId) => {
    await api.setDailyQuestion({ question_id: questionId });
    await loadAdminData();
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Admin Header & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Admin Management Portal</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-mono font-bold border border-purple-500/30">
              RBAC: Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage question repository, global daily challenge, assignments, and learner progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-admin-set-daily"
            onClick={() => setIsDailyModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-axly-400" />
            <span>Set Daily Question</span>
          </button>

          <button
            id="btn-admin-bulk-assign"
            onClick={() => {
              setAssignTargetQuestion(null);
              setIsAssignModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Bulk Assign</span>
          </button>

          <button
            id="btn-admin-add-question"
            onClick={() => {
              setEditingQuestion(null);
              setIsQuestionModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-axly-600 hover:bg-axly-500 text-white transition-all shadow-md shadow-axly-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* System Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 group hover:border-axly-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Total Users</span>
              <div className="w-8 h-8 rounded-xl bg-axly-500/10 text-axly-400 flex items-center justify-center border border-axly-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p id="stat-total-users" className="mt-3 text-3xl font-extrabold text-white font-mono tracking-tight">
              {stats.total_users}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">Registered learners</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 group hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Active Questions</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p id="stat-active-questions" className="mt-3 text-3xl font-extrabold text-white font-mono tracking-tight">
              {stats.total_active_questions}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">In question repository</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Total Assignments</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p id="stat-total-assignments" className="mt-3 text-3xl font-extrabold text-white font-mono tracking-tight">
              {stats.total_active_assignments}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">Active assigned questions</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 group hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Total Solved</span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p id="stat-total-solved" className="mt-3 text-3xl font-extrabold text-white font-mono tracking-tight">
              {stats.total_solved_submissions}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">Lifetime solutions verified</p>
          </div>
        </div>
      )}

      {/* Admin Tab Switcher */}
      <div className="flex space-x-2 border-b border-slate-800/80 pb-3">
        <button
          id="admin-tab-questions"
          onClick={() => setActiveAdminTab('questions')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeAdminTab === 'questions'
              ? 'bg-axly-600 text-white shadow-md shadow-axly-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Question Repository ({pagination.total})</span>
        </button>
        <button
          id="admin-tab-assignments"
          onClick={() => setActiveAdminTab('assignments')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeAdminTab === 'assignments'
              ? 'bg-axly-600 text-white shadow-md shadow-axly-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Assignments Log ({assignments.length})</span>
        </button>
        <button
          id="admin-tab-users"
          onClick={() => setActiveAdminTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeAdminTab === 'users'
              ? 'bg-axly-600 text-white shadow-md shadow-axly-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Learner Progress ({userProgressList.length})</span>
        </button>
      </div>

      {/* Tab 1: Question Repository */}
      {activeAdminTab === 'questions' && (
        <div className="space-y-6">
          {/* Admin Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg backdrop-blur-md">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 pr-3 border-r border-slate-800 font-mono">
              <Filter className="w-3.5 h-3.5 text-axly-400" />
              <span>Filters</span>
            </div>

            {/* Difficulty */}
            <div className="flex items-center space-x-1.5">
              {['', 'easy', 'medium', 'hard'].map((diff) => (
                <button
                  key={diff}
                  id={`admin-filter-diff-${diff || 'all'}`}
                  onClick={() => {
                    setDifficultyFilter(diff);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                    difficultyFilter === diff
                      ? 'bg-axly-600 text-white shadow-md shadow-axly-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  {diff || 'All Difficulties'}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            {/* Assignment Filter */}
            <div className="flex items-center space-x-1.5">
              {[
                { label: 'All Questions', val: '' },
                { label: 'Assigned to Anyone', val: 'true' },
                { label: 'Unassigned to Nobody', val: 'false' }
              ].map((f) => (
                <button
                  key={f.val}
                  id={`admin-filter-asgn-${f.val || 'all'}`}
                  onClick={() => {
                    setAssignedFilter(f.val);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    assignedFilter === f.val
                      ? 'bg-axly-600 text-white shadow-md shadow-axly-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            <select
              id="admin-filter-topic"
              value={topicFilter}
              onChange={(e) => {
                setTopicFilter(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="bg-slate-800 text-slate-200 text-xs font-medium rounded-xl px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-axly-500 cursor-pointer shadow-inner"
            >
              <option value="">All Topics</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Question Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                isAdmin={true}
                onStatusChange={() => {}}
                onEdit={(question) => {
                  setEditingQuestion(question);
                  setIsQuestionModalOpen(true);
                }}
                onDelete={handleDeleteQuestion}
                onAssign={(question) => {
                  setAssignTargetQuestion(question);
                  setIsAssignModalOpen(true);
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              <div>
                Showing <span className="text-white font-mono font-bold">{questions.length}</span> of{' '}
                <span className="text-white font-mono font-bold">{pagination.total}</span> questions
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-300 px-2">
                  Page <strong className="text-white">{pagination.page}</strong> / {totalPages}
                </span>
                <button
                  disabled={pagination.page >= totalPages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Assignments Log */}
      {activeAdminTab === 'assignments' && (
        <div className="glass-panel rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Active & Historical Assignments</h3>
              <p className="text-xs text-slate-400 mt-0.5">Audit who has been assigned questions and their solution progress</p>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              {assignments.length} total rows
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Learner</th>
                  <th className="px-5 py-3.5">Question</th>
                  <th className="px-5 py-3.5">Difficulty</th>
                  <th className="px-5 py-3.5">Assignment Status</th>
                  <th className="px-5 py-3.5">Solve Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assignments.map((asgn) => (
                  <tr key={asgn.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-axly-300 font-bold flex items-center justify-center text-[10px]">
                          {asgn.user_name ? asgn.user_name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div>{asgn.user_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{asgn.user_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-200">
                      <a href={asgn.question_url} target="_blank" rel="noopener noreferrer" className="hover:text-axly-400 inline-flex items-center space-x-1.5 font-medium group">
                        <span>{asgn.question_title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-axly-400" />
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      <span className="uppercase text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                        {asgn.question_difficulty}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        asgn.status === 'assigned'
                          ? 'bg-axly-500/15 text-axly-300 border border-axly-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                        {asgn.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        asgn.submission_status === 'solved'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : asgn.submission_status === 'attempted'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {asgn.submission_status || 'not_started'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {asgn.status === 'assigned' && (
                        <button
                          onClick={() => handleUnassign(asgn.id)}
                          className="px-3 py-1 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold transition-colors"
                        >
                          Unassign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Learner Progress Audit */}
      {activeAdminTab === 'users' && (
        <div className="glass-panel rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Learner Performance & Completion</h3>
              <p className="text-xs text-slate-400 mt-0.5">Track individual completion rates across assigned curriculum questions</p>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              {userProgressList.length} users
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Learner Name</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Assigned Active</th>
                  <th className="px-5 py-3.5">Solved Active</th>
                  <th className="px-5 py-3.5">Completion %</th>
                  <th className="px-5 py-3.5">Lifetime Solved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {userProgressList.map((usr) => (
                  <tr key={usr.user_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-axly-300 font-bold flex items-center justify-center text-[10px]">
                          {usr.name ? usr.name[0].toUpperCase() : 'U'}
                        </div>
                        <span>{usr.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-mono">{usr.email}</td>
                    <td className="px-5 py-4 font-mono font-medium text-slate-200">{usr.assigned_count}</td>
                    <td className="px-5 py-4 font-mono text-emerald-400 font-bold">{usr.solved_count}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-bold text-white">{usr.completion_percentage}%</span>
                        <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-axly-500 to-cyan-400 h-full rounded-full"
                            style={{ width: `${usr.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-300 font-semibold">{usr.historical_solved_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AdminQuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        onSave={handleSaveQuestion}
        question={editingQuestion}
        topics={topics}
      />

      <AdminAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignAction}
        targetQuestion={assignTargetQuestion}
        users={users.filter(u => u.role !== 'admin')}
        questions={questions}
      />

      <AdminDailyQuestionModal
        isOpen={isDailyModalOpen}
        onClose={() => setIsDailyModalOpen(false)}
        onSetDaily={handleSetDaily}
        questions={questions}
        currentDailyQuestion={dailyData?.data}
      />
    </div>
  );
}
