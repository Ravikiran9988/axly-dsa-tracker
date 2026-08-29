import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  CheckCircle2,
  Calendar,
  Flame,
  Zap,
  HelpCircle,
  Code2
} from 'lucide-react';

export default function AdminDailyChallengeModal({
  isOpen,
  onClose,
  challengeToEdit = null,
  topics = [],
  patterns = [],
  onSaved
}) {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    difficulty: 'medium',
    topic_id: '',
    pattern_id: '',
    points: 100,
    estimated_time: 30,
    description: '',
    problem_statement: '',
    constraints: '',
    input_format: '',
    output_format: '',
    example_input: '',
    example_output: '',
    hints: ['', '', ''],
    solution_approach: '',
    status: 'draft',
    scheduled_date: '',
    test_cases: [
      { id: 'tc-1', input: '', expected_output: '', is_hidden: false },
      { id: 'tc-2', input: '', expected_output: '', is_hidden: true }
    ]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'testcases' | 'hints'

  useEffect(() => {
    if (challengeToEdit) {
      const hintsArr = Array.isArray(challengeToEdit.hints)
        ? challengeToEdit.hints
        : typeof challengeToEdit.hints === 'string'
        ? [challengeToEdit.hints]
        : [];
      while (hintsArr.length < 3) hintsArr.push('');

      setFormData({
        title: challengeToEdit.title || '',
        slug: challengeToEdit.slug || '',
        difficulty: challengeToEdit.difficulty || 'medium',
        topic_id: challengeToEdit.topic_id || '',
        pattern_id: challengeToEdit.pattern_id || '',
        points: challengeToEdit.points || 100,
        estimated_time: challengeToEdit.estimated_time || 30,
        description: challengeToEdit.description || '',
        problem_statement: challengeToEdit.problem_statement || '',
        constraints: challengeToEdit.constraints || '',
        input_format: challengeToEdit.input_format || '',
        output_format: challengeToEdit.output_format || '',
        example_input: challengeToEdit.example_input || '',
        example_output: challengeToEdit.example_output || '',
        hints: hintsArr.slice(0, 3),
        solution_approach: challengeToEdit.solution_approach || '',
        status: challengeToEdit.status || 'draft',
        scheduled_date: challengeToEdit.scheduled_date || '',
        test_cases: Array.isArray(challengeToEdit.test_cases) && challengeToEdit.test_cases.length > 0
          ? challengeToEdit.test_cases.map((tc, idx) => ({
              id: tc.id || `tc-${idx + 1}`,
              input: tc.input || '',
              expected_output: tc.expected_output || '',
              is_hidden: Boolean(tc.is_hidden)
            }))
          : [
              { id: 'tc-1', input: '', expected_output: '', is_hidden: false },
              { id: 'tc-2', input: '', expected_output: '', is_hidden: true }
            ]
      });
    } else {
      setFormData({
        title: '',
        slug: '',
        difficulty: 'medium',
        topic_id: topics[0]?.id || '',
        pattern_id: '',
        points: 100,
        estimated_time: 30,
        description: '',
        problem_statement: '',
        constraints: '',
        input_format: '',
        output_format: '',
        example_input: '',
        example_output: '',
        hints: ['', '', ''],
        solution_approach: '',
        status: 'draft',
        scheduled_date: '',
        test_cases: [
          { id: 'tc-1', input: '', expected_output: '', is_hidden: false },
          { id: 'tc-2', input: '', expected_output: '', is_hidden: true }
        ]
      });
    }
  }, [challengeToEdit, topics]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleHintChange = (index, value) => {
    setFormData(prev => {
      const nextHints = [...prev.hints];
      nextHints[index] = value;
      return { ...prev, hints: nextHints };
    });
  };

  const handleTestCaseChange = (index, field, value) => {
    setFormData(prev => {
      const nextCases = [...prev.test_cases];
      nextCases[index] = { ...nextCases[index], [field]: value };
      return { ...prev, test_cases: nextCases };
    });
  };

  const handleAddTestCase = () => {
    setFormData(prev => ({
      ...prev,
      test_cases: [
        ...prev.test_cases,
        { id: `tc-${Date.now()}`, input: '', expected_output: '', is_hidden: false }
      ]
    }));
  };

  const handleRemoveTestCase = (index) => {
    if (formData.test_cases.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, idx) => idx !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Challenge title is required.');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        points: Number(formData.points) || 100,
        estimated_time: Number(formData.estimated_time) || 30,
        hints: formData.hints.filter(h => typeof h === 'string' && h.trim().length > 0),
        test_cases: formData.test_cases.filter(tc => tc.input.trim().length > 0)
      };

      if (challengeToEdit?.id) {
        await api.updateDailyChallenge(challengeToEdit.id, payload);
      } else {
        await api.createDailyChallenge(payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save Daily Challenge.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Flame className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {challengeToEdit ? 'Edit Daily Challenge' : 'Create Independent Daily Challenge'}
              </h2>
              <p className="text-xs text-slate-400">
                Author separate competitive daily challenge content with its own test cases & reward points.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Problem Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('testcases')}
            className={`py-3 px-4 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'testcases'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Test Cases ({formData.test_cases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hints')}
            className={`py-3 px-4 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'hints'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Progressive Hints (3)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Challenge Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => handleChange('title', e.target.value)}
                    placeholder="e.g. Longest Subarray Challenge"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Custom Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e => handleChange('slug', e.target.value)}
                    placeholder="e.g. longest-subarray-challenge"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Difficulty *
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={e => handleChange('difficulty', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 capitalize"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Primary Topic
                  </label>
                  <select
                    value={formData.topic_id}
                    onChange={e => handleChange('topic_id', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="">-- Select Topic --</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Pattern
                  </label>
                  <input
                    type="text"
                    value={formData.pattern_id}
                    onChange={e => handleChange('pattern_id', e.target.value)}
                    placeholder="e.g. sliding-window"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Points (Streak Reward)
                  </label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={e => handleChange('points', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 font-bold font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => handleChange('status', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="published">Published (Ready for Scheduling)</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Scheduled Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={e => handleChange('scheduled_date', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                  Problem Description *
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="Provide the complete problem statement and clear instructions..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Constraints
                  </label>
                  <textarea
                    rows={3}
                    value={formData.constraints}
                    onChange={e => handleChange('constraints', e.target.value)}
                    placeholder="1 <= nums.length <= 10^5&#10;1 <= nums[i] <= 10^4"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Solution Approach / Editorial
                  </label>
                  <textarea
                    rows={3}
                    value={formData.solution_approach}
                    onChange={e => handleChange('solution_approach', e.target.value)}
                    placeholder="Explain the intended algorithmic pattern and time/space complexity..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Example Input
                  </label>
                  <input
                    type="text"
                    value={formData.example_input}
                    onChange={e => handleChange('example_input', e.target.value)}
                    placeholder='{"nums": [1, 2, 3], "k": 3}'
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 font-mono">
                    Example Output
                  </label>
                  <input
                    type="text"
                    value={formData.example_output}
                    onChange={e => handleChange('example_output', e.target.value)}
                    placeholder="3"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'testcases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    Test Cases (Public & Hidden)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Include at least one public example test case and one hidden evaluation test case.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTestCase}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Test Case</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.test_cases.map((tc, idx) => (
                  <div
                    key={tc.id || idx}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        Test Case #{idx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                          <input
                            type="checkbox"
                            checked={tc.is_hidden}
                            onChange={e => handleTestCaseChange(idx, 'is_hidden', e.target.checked)}
                            className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
                          />
                          <span>Hidden from Student</span>
                        </label>
                        {formData.test_cases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(idx)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          Input (Stdin / JSON)
                        </label>
                        <textarea
                          rows={2}
                          value={tc.input}
                          onChange={e => handleTestCaseChange(idx, 'input', e.target.value)}
                          placeholder='{"nums": [1, 2, 3]}'
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          Expected Output (Stdout)
                        </label>
                        <textarea
                          rows={2}
                          value={tc.expected_output}
                          onChange={e => handleTestCaseChange(idx, 'expected_output', e.target.value)}
                          placeholder="6"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'hints' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Progressive Hints (Pedagogical Guidance)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Hint 1 should guide observations, Hint 2 points to data structures/patterns, and Hint 3 gives implementation direction without dumping raw code.
                </p>
              </div>

              <div className="space-y-3">
                {[0, 1, 2].map(hintIdx => (
                  <div key={hintIdx} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <label className="block text-xs font-mono font-bold text-amber-400 uppercase">
                      Hint {hintIdx + 1}: {
                        hintIdx === 0 ? 'Observation & Intuition' :
                        hintIdx === 1 ? 'Data Structure & Pattern' : 'Implementation Direction'
                      }
                    </label>
                    <textarea
                      rows={2}
                      value={formData.hints[hintIdx] || ''}
                      onChange={e => handleHintChange(hintIdx, e.target.value)}
                      placeholder={`Enter hint ${hintIdx + 1}...`}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving...' : challengeToEdit ? 'Update Challenge' : 'Create Challenge'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
