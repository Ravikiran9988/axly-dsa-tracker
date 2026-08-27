import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Loader2, Code2 } from 'lucide-react';

export default function AdminQuestionModal({ isOpen, onClose, onSave, question, topics }) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [topicId, setTopicId] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (question) {
      setTitle(question.title || '');
      setDifficulty(question.difficulty || 'easy');
      setTopicId(question.topic_id || '');
      setUrl(question.url || '');
    } else {
      setTitle('');
      setDifficulty('easy');
      setTopicId(topics[0]?.id || '');
      setUrl('');
    }
    setError(null);
  }, [question, isOpen, topics]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave({
        id: question?.id,
        title,
        difficulty,
        topic_id: topicId || null,
        url
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0F1626] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-axly-500/10 text-axly-400 flex items-center justify-center border border-axly-500/20">
              <Code2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {question ? 'Edit DSA Question' : 'Add New DSA Question'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
              Question Title *
            </label>
            <input
              id="input-question-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Subarray Sum Equals K"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-axly-500 text-sm shadow-inner transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                Difficulty *
              </label>
              <select
                id="select-question-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white focus:outline-none focus:border-axly-500 text-sm shadow-inner transition-colors cursor-pointer"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                Topic
              </label>
              <select
                id="select-question-topic"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white focus:outline-none focus:border-axly-500 text-sm shadow-inner transition-colors cursor-pointer"
              >
                <option value="">No Specific Topic</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
              Problem URL (LeetCode, GFG, etc.) *
            </label>
            <input
              id="input-question-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://leetcode.com/problems/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-axly-500 text-sm shadow-inner transition-colors"
            />
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-question"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-axly-600 hover:bg-axly-500 text-white flex items-center space-x-2 transition-all shadow-md shadow-axly-600/30 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{loading ? 'Saving...' : 'Save Question'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
