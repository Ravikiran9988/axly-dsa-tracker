import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Code,
  Layers,
  Sparkles,
  HelpCircle,
  FileCode,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminQuestionModal({ isOpen, onClose, questionToEdit, onSaved }) {
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'coding' | 'testcases'

  // Form Fields
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [topicId, setTopicId] = useState('');
  const [points, setPoints] = useState(20);
  const [estimatedTime, setEstimatedTime] = useState('30 mins');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('published');
  const [description, setDescription] = useState('');
  const [constraints, setConstraints] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [hints, setHints] = useState('');

  // Starter Code
  const [jsStarter, setJsStarter] = useState('');
  const [pyStarter, setPyStarter] = useState('');

  // Test Cases
  const [testCases, setTestCases] = useState([
    { input: '', expected_output: '', is_hidden: false }
  ]);

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTopics();
      if (questionToEdit) {
        setTitle(questionToEdit.title || '');
        setDifficulty(questionToEdit.difficulty || 'easy');
        setTopicId(questionToEdit.topic_id || '');
        setPoints(questionToEdit.points || 20);
        setEstimatedTime(questionToEdit.estimated_time || '30 mins');
        setDueDate(questionToEdit.due_date || '');
        setStatus(questionToEdit.status || 'published');
        setDescription(questionToEdit.description || '');
        setConstraints(questionToEdit.constraints || '');
        setInputFormat(questionToEdit.input_format || '');
        setOutputFormat(questionToEdit.output_format || '');
        setHints(questionToEdit.hints || '');

        if (questionToEdit.starter_code) {
          const sc = typeof questionToEdit.starter_code === 'object' ? questionToEdit.starter_code : {};
          setJsStarter(sc.javascript || '');
          setPyStarter(sc.python || '');
        }

        // Fetch detailed test cases
        api.getQuestionById(questionToEdit.id).then(res => {
          if (res.data?.test_cases && res.data.test_cases.length > 0) {
            setTestCases(res.data.test_cases);
          }
        }).catch(() => {});
      } else {
        // Defaults for new challenge
        setTitle('');
        setDifficulty('easy');
        setTopicId('');
        setPoints(20);
        setEstimatedTime('30 mins');
        setDueDate('');
        setStatus('published');
        setDescription('');
        setConstraints('');
        setInputFormat('');
        setOutputFormat('');
        setHints('');
        setJsStarter(`const fs = require('fs');\n\nfunction solve(input) {\n  return input;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(solve(input));`);
        setPyStarter(`import sys\n\ndef solve(raw):\n    return raw\n\nif __name__ == '__main__':\n    print(solve(sys.stdin.read().strip()))`);
        setTestCases([
          { input: '', expected_output: '', is_hidden: false }
        ]);
      }
    }
  }, [isOpen, questionToEdit]);

  async function loadTopics() {
    try {
      const res = await api.getTopics();
      setTopics(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  function handleAddTestCase() {
    setTestCases([...testCases, { input: '', expected_output: '', is_hidden: false }]);
  }

  function handleRemoveTestCase(index) {
    setTestCases(testCases.filter((_, idx) => idx !== index));
  }

  function handleTestCaseChange(index, field, value) {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        difficulty,
        topic_id: topicId || null,
        points: Number(points),
        estimated_time: estimatedTime,
        due_date: dueDate || null,
        status,
        description: description.trim(),
        constraints: constraints.trim(),
        input_format: inputFormat.trim(),
        output_format: outputFormat.trim(),
        hints: hints.trim(),
        starter_code: {
          javascript: jsStarter,
          python: pyStarter
        },
        test_cases: testCases.filter(tc => tc.input.trim() || tc.expected_output.trim())
      };

      if (questionToEdit) {
        await api.updateQuestion(questionToEdit.id, payload);
      } else {
        await api.createQuestion(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to save challenge.');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>{questionToEdit ? 'Edit Challenge Definition' : 'Create New Coding Challenge'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure in-platform problem description, starter code, and test cases.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-slate-800 flex items-center gap-4 bg-slate-950/40 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'basic' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Problem Statement & Specs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coding')}
            className={`py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'coding' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Starter Code Templates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('testcases')}
            className={`py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'testcases' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Test Cases ({testCases.length})
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[65vh] space-y-4 text-xs custom-scrollbar">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Challenge Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trapping Rain Water"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Difficulty *</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Topic Category</label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select Topic...</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Points Awarded</label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Problem Description / Markdown *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Given an array of integers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Input Format</label>
                  <textarea
                    rows={2}
                    placeholder="First line: integer N..."
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Output Format</label>
                  <textarea
                    rows={2}
                    placeholder="Print indices separated by space..."
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Constraints</label>
                <textarea
                  rows={2}
                  placeholder="1 <= nums.length <= 10^4&#10;-10^9 <= target <= 10^9"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Hints (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Use a hash map to look up complements in O(1)..."
                  value={hints}
                  onChange={(e) => setHints(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'coding' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">JavaScript (Node.js) Starter Template</label>
                <textarea
                  rows={6}
                  value={jsStarter}
                  onChange={(e) => setJsStarter(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Python 3 Starter Template</label>
                <textarea
                  rows={6}
                  value={pyStarter}
                  onChange={(e) => setPyStarter(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'testcases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Define public sample test cases (visible to students) and hidden test cases (used for evaluation).
                </div>
                <button
                  type="button"
                  onClick={handleAddTestCase}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Test Case
                </button>
              </div>

              <div className="space-y-3">
                {testCases.map((tc, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Test Case #{idx + 1}</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={Boolean(tc.is_hidden)}
                            onChange={(e) => handleTestCaseChange(idx, 'is_hidden', e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0"
                          />
                          <span className="text-[11px] font-semibold text-amber-400">Hidden Test Case</span>
                        </label>
                        {testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(idx)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Input (stdin)</label>
                        <textarea
                          rows={3}
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                          placeholder="e.g. 9\n2 7 11 15"
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-200 font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Expected Output (stdout)</label>
                        <textarea
                          rows={3}
                          value={tc.expected_output}
                          onChange={(e) => handleTestCaseChange(idx, 'expected_output', e.target.value)}
                          placeholder="e.g. 0 1"
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Save Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-950 disabled:opacity-50"
            >
              {saving ? 'Saving Challenge...' : questionToEdit ? 'Update Challenge' : 'Publish Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
