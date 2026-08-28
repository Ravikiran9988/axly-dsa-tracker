import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Flame,
  Zap,
  Code2,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function AdminDailyChallenge({ onSelectProblem }) {
  const [dailyData, setDailyData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [dailyRes, qRes] = await Promise.all([
        api.getDailyQuestion().catch(() => ({ data: null })),
        api.getQuestions({ limit: 100 })
      ]);
      setDailyData(dailyRes?.data || null);
      setQuestions(qRes?.data || []);
      if (dailyRes?.data?.question?.id) {
        setSelectedQuestionId(dailyRes.data.question.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load daily challenge data');
    } finally {
      setLoading(false);
    }
  }

  const handleSetDaily = async (questionIdToSet) => {
    const qId = questionIdToSet || selectedQuestionId;
    if (!qId) {
      alert('Please select a question first.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.setDailyQuestion({
        question_id: qId,
        date: targetDate
      });
      setSuccess(`Daily challenge successfully scheduled for ${targetDate}!`);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError(err.message || 'Failed to set daily question');
    } finally {
      setSaving(false);
    }
  };

  const filteredQuestions = questions.filter(q =>
    q.title?.toLowerCase().includes(search.toLowerCase()) ||
    q.topic_name?.toLowerCase().includes(search.toLowerCase())
  );

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const currentChallenge = dailyData?.question;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            <span>Daily Challenge Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Schedule & Curate Daily Problems
          </h1>
          <p className="text-xs text-slate-400">
            Set the featured problem of the day to drive student daily streaks and engagement.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Daily Challenge Active Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-950 border border-amber-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase font-mono">
            <Flame className="w-4 h-4 fill-amber-400" />
            <span>Today's Featured Problem</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Date: {dailyData?.date || targetDate}
          </span>
        </div>

        {currentChallenge ? (
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] border ${difficultyColors[currentChallenge.difficulty?.toLowerCase()] || ''}`}>
                  {currentChallenge.difficulty}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {currentChallenge.topic_name || 'General DSA'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">
                {currentChallenge.title}
              </h2>
              {currentChallenge.description && (
                <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">
                  {currentChallenge.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-cyan-400 font-bold font-mono text-sm">
                  {currentChallenge.points || 20} pts
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-mono">Reward</div>
              </div>

              {onSelectProblem && (
                <button
                  onClick={() => onSelectProblem(currentChallenge.id)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold"
                >
                  <span>Solve</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs">
            No daily challenge assigned for today. Select a problem below to publish today's daily challenge.
          </div>
        )}
      </div>

      {/* Select & Set New Daily Challenge */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-white tracking-tight">
              Select Problem to Schedule
            </h2>
            <p className="text-[11px] text-slate-400">Choose from published questions in the repository.</p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-mono">Target Date:</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        {/* Search repository */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search questions by name or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
          />
        </div>

        {/* List of candidates */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredQuestions.map((q) => {
            const isSelected = selectedQuestionId === q.id;
            return (
              <div
                key={q.id}
                onClick={() => setSelectedQuestionId(q.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${difficultyColors[q.difficulty?.toLowerCase()] || ''}`}>
                      {q.difficulty}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {q.topic_name || 'General'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate">
                    {q.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 font-mono">{q.points || 20} pts</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetDaily(q.id);
                    }}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
                  >
                    Set as Daily
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
