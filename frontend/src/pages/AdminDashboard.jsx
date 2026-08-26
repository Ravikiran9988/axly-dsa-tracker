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
  ChevronRight
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Admin Header & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Management Portal</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
              RBAC: Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage question repository, global daily challenge, assignments, and learner progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-admin-set-daily"
            onClick={() => setIsDailyModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
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
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
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
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-axly-600 hover:bg-axly-500 text-white transition-all shadow-md shadow-axly-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* System Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</span>
              <Users className="w-4 h-4 text-axly-400" />
            </div>
            <p id="stat-total-users" className="mt-3 text-3xl font-extrabold text-white font-mono">
              {stats.total_users}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">Registered learners</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Questions</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <p id="stat-active-questions" className="mt-3 text-3xl font-extrabold text-white font-mono">
              {stats.total_active_questions}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">Available in question bank</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Assignments</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p id="stat-total-assignments" className="mt-3 text-3xl font-extrabold text-white font-mono">
              {stats.total_active_assignments}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">Active question assignments</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Solved</span>
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            </div>
            <p id="stat-total-solved" className="mt-3 text-3xl font-extrabold text-white font-mono">
              {stats.total_solved_submissions}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">Lifetime solved submissions</p>
          </div>
        </div>
      )}

      {/* Admin Tab Switcher */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          id="admin-tab-questions"
          onClick={() => setActiveAdminTab('questions')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeAdminTab === 'questions'
              ? 'bg-axly-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Question Repository ({pagination.total})
        </button>
        <button
          id="admin-tab-assignments"
          onClick={() => setActiveAdminTab('assignments')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeAdminTab === 'assignments'
              ? 'bg-axly-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Assignments Log ({assignments.length})
        </button>
        <button
          id="admin-tab-users"
          onClick={() => setActiveAdminTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeAdminTab === 'users'
              ? 'bg-axly-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Learner Progress ({userProgressList.length})
        </button>
      </div>

      {/* Tab 1: Question Repository */}
      {activeAdminTab === 'questions' && (
        <div className="space-y-6">
          {/* Filter Bar (Admin Context: Assigned = assigned to >= 1 user, Unassigned = assigned to nobody per PRD Section 9.1) */}
          <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-2 border-r border-slate-800">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </div>

            {/* Difficulty */}
            <div className="flex items-center space-x-1">
              {['', 'easy', 'medium', 'hard'].map((diff) => (
                <button
                  key={diff}
                  id={`admin-filter-diff-${diff || 'all'}`}
                  onClick={() => {
                    setDifficultyFilter(diff);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    difficultyFilter === diff
                      ? 'bg-axly-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {diff || 'All Difficulties'}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            {/* Assignment Filter for Admin per Section 9.1 */}
            <div className="flex items-center space-x-1">
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    assignedFilter === f.val
                      ? 'bg-axly-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-axly-500"
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
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Showing <span className="text-white font-mono">{questions.length}</span> of{' '}
                <span className="text-white font-mono">{pagination.total}</span> questions
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-300">
                  Page {pagination.page} / {totalPages}
                </span>
                <button
                  disabled={pagination.page >= totalPages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700"
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
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Active & Historical Assignments</h3>
            <span className="text-xs text-slate-400 font-mono">{assignments.length} total rows</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Learner</th>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Assignment Status</th>
                  <th className="px-4 py-3">Solve Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assignments.map((asgn) => (
                  <tr key={asgn.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">
                      <div>{asgn.user_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{asgn.user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      <a href={asgn.question_url} target="_blank" rel="noopener noreferrer" className="hover:text-axly-400 inline-flex items-center space-x-1">
                        <span>{asgn.question_title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {asgn.question_difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        asgn.status === 'assigned'
                          ? 'bg-axly-500/10 text-axly-400 border border-axly-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                        {asgn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        asgn.submission_status === 'solved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : asgn.submission_status === 'attempted'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {asgn.submission_status || 'not_started'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {asgn.status === 'assigned' && (
                        <button
                          onClick={() => handleUnassign(asgn.id)}
                          className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 font-medium transition-colors"
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
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Learner Performance & Completion</h3>
            <span className="text-xs text-slate-400 font-mono">{userProgressList.length} users</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Learner Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Assigned Active</th>
                  <th className="px-4 py-3">Solved Active</th>
                  <th className="px-4 py-3">Completion %</th>
                  <th className="px-4 py-3">Lifetime Solved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {userProgressList.map((usr) => (
                  <tr key={usr.user_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{usr.name}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{usr.email}</td>
                    <td className="px-4 py-3 font-mono">{usr.assigned_count}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">{usr.solved_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white">{usr.completion_percentage}%</span>
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-axly-500 h-full rounded-full"
                            style={{ width: `${usr.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{usr.historical_solved_count}</td>
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
