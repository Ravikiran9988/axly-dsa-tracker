import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import DailyQuestionCard from '../components/DailyQuestionCard';
import ProgressOverview from '../components/ProgressOverview';
import QuestionCard from '../components/QuestionCard';
import { Search, Filter, Layers, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Sparkles, X } from 'lucide-react';

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
      // Refresh progress, questions, daily
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

  const handleResetFilters = () => {
    setDifficultyFilter('');
    setAssignedFilter('');
    setTopicFilter('');
    setSearchQuery('');
    setPagination(p => ({ ...p, page: 1 }));
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
  const hasActiveFilters = Boolean(difficultyFilter || assignedFilter || topicFilter || searchQuery);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span className="font-medium">{error}</span>
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

      {/* 3. Question Bank & Curriculum Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Question Bank & Practice</h2>
            <p className="text-xs text-slate-400 mt-1">
              Explore curated curriculum problems, filter by topic, and self-report your solution status.
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-questions"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search problem title..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-axly-500 transition-colors shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="ml-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors shadow-sm"
            >
              Search
            </button>
          </form>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg backdrop-blur-md">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 pr-3 border-r border-slate-800 font-mono">
            <Filter className="w-3.5 h-3.5 text-axly-400" />
            <span>Filters</span>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center space-x-1.5">
            {['', 'easy', 'medium', 'hard'].map((diff) => (
              <button
                key={diff}
                id={`filter-diff-${diff || 'all'}`}
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

          {/* Topic Select Filter */}
          <select
            id="filter-topic-select"
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

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold ml-auto flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Loading Skeleton vs Question Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-5 rounded-full skeleton-shimmer" />
                  <div className="w-20 h-5 rounded skeleton-shimmer" />
                </div>
                <div className="w-3/4 h-6 rounded skeleton-shimmer" />
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="w-28 h-8 rounded-lg skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : questions.length > 0 ? (
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
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-200">No questions match your filters</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try searching for a different keyword or reset active topic/difficulty filters.
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <span>Clear All Filters</span>
              </button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-mono font-bold">{questions.length}</span> of{' '}
              <span className="text-white font-mono font-bold">{pagination.total}</span> problems
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
    </div>
  );
}
