import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import DailyQuestionCard from '../components/DailyQuestionCard';
import ProgressOverview from '../components/ProgressOverview';
import QuestionCard from '../components/QuestionCard';
import { Search, Filter, Layers, RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export default function UserDashboard({ onOpenAdminDailyModal, isAdmin }) {
  const [dailyData, setDailyData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });

  // Filters
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Dashboard Data
  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dailyRes, progRes, topicsRes, questionsRes] = await Promise.all([
        api.getDailyQuestion(),
        api.getMyProgress(),
        api.getTopics(),
        api.getQuestions({
          difficulty: difficultyFilter || undefined,
          assigned: assignedFilter || undefined,
          topic_id: topicFilter || undefined,
          search: searchQuery || undefined,
          page: pagination.page,
          limit: pagination.limit
        })
      ]);

      setDailyData(dailyRes);
      setProgress(progRes.data);
      setTopics(topicsRes.data || []);
      setQuestions(questionsRes.data || []);
      setPagination({
        page: questionsRes.page,
        limit: questionsRes.limit,
        total: questionsRes.total
      });
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [difficultyFilter, assignedFilter, topicFilter, pagination.page]);

  // Handle Question status update
  const handleStatusChange = async (questionId, newStatus) => {
    try {
      await api.toggleSubmission(questionId, newStatus);
      // Refresh progress & questions
      const [progRes, questionsRes, dailyRes] = await Promise.all([
        api.getMyProgress(),
        api.getQuestions({
          difficulty: difficultyFilter || undefined,
          assigned: assignedFilter || undefined,
          topic_id: topicFilter || undefined,
          search: searchQuery || undefined,
          page: pagination.page,
          limit: pagination.limit
        }),
        api.getDailyQuestion()
      ]);

      setProgress(progRes.data);
      setQuestions(questionsRes.data);
      setDailyData(dailyRes);
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadDashboard();
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

      {/* 1. Global Daily Question Banner */}
      <DailyQuestionCard
        dailyData={dailyData}
        onStatusChange={handleStatusChange}
        onOpenAdminDailyModal={onOpenAdminDailyModal}
        isAdmin={isAdmin}
      />

      {/* 2. Personal Progress & Mastery Metrics */}
      <ProgressOverview progress={progress} />

      {/* 3. Question Bank & Curriculum Filters */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Question Bank & Practice</h2>
            <p className="text-xs text-slate-400 mt-0.5">Filter by difficulty, assignment status, and topic.</p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-questions"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search problem title..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-axly-500"
              />
            </div>
            <button
              type="submit"
              className="ml-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
            >
              Search
            </button>
          </form>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-2 border-r border-slate-800">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center space-x-1">
            {['', 'easy', 'medium', 'hard'].map((diff) => (
              <button
                key={diff}
                id={`filter-diff-${diff || 'all'}`}
                onClick={() => {
                  setDifficultyFilter(diff);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  difficultyFilter === diff
                    ? 'bg-axly-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {diff || 'All Difficulties'}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Assignment Filter for Users (Assigned vs Unassigned to logged-in user per PRD Section 9.1) */}
          <div className="flex items-center space-x-1">
            {[
              { label: 'All Questions', val: '' },
              { label: 'Assigned to Me', val: 'true' },
              { label: 'Unassigned', val: 'false' }
            ].map((f) => (
              <button
                key={f.val}
                id={`filter-asgn-${f.val || 'all'}`}
                onClick={() => {
                  setAssignedFilter(f.val);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  assignedFilter === f.val
                    ? 'bg-axly-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Topic Select Filter */}
          <select
            id="filter-topic-select"
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

          {/* Reset button */}
          {(difficultyFilter || assignedFilter || topicFilter || searchQuery) && (
            <button
              onClick={() => {
                setDifficultyFilter('');
                setAssignedFilter('');
                setTopicFilter('');
                setSearchQuery('');
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Question Cards Grid */}
        {questions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                isAdmin={false}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No questions match your filters</p>
            <p className="text-xs text-slate-500 mt-1">Try broadening your search or resetting filters.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.total > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-mono">{questions.length}</span> of{' '}
              <span className="text-white font-mono">{pagination.total}</span> problems
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-300">
                Page {pagination.page} / {totalPages}
              </span>
              <button
                disabled={pagination.page >= totalPages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
