import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileCode,
  Sparkles,
  Loader2,
  Code2,
  FlaskConical,
  ChevronDown,
  Check,
  HelpCircle,
  Clock,
  Award
} from 'lucide-react';
import { api } from '../services/api';

const DIFF_CONFIG = {
  easy: {
    label: 'Easy',
    pts: 10,
    color: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30'
  },
  medium: {
    label: 'Medium',
    pts: 20,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30'
  },
  hard: {
    label: 'Hard',
    pts: 30,
    color: 'text-rose-500 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30'
  }
};

const DEFAULT_JS_STARTER = `const fs = require('fs');

function solve(input) {
  // your solution here
  return input;
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(solve(input));`;

const DEFAULT_PY_STARTER = `import sys

def solve(raw):
    # your solution here
    return raw

if __name__ == '__main__':
    print(solve(sys.stdin.read().strip()))`;

export default function AdminQuestionModal({
  isOpen,
  onClose,
  questionToEdit,
  question,
  onSaved,
  onSave,
  onSuccess,
  topics: topicsProp
}) {
  const currentQuestion = questionToEdit || question || null;
  const notifySaved = onSaved || onSave || onSuccess || (() => {});

  const [activeTab, setActiveTab] = useState('basic');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [topicId, setTopicId] = useState('');
  const [points, setPoints] = useState(10);
  const [estimatedTime, setEstimatedTime] = useState('30 mins');
  const [status, setStatus] = useState('published');
  const [description, setDescription] = useState('');
  const [constraints, setConstraints] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [hints, setHints] = useState('');
  const [jsStarter, setJsStarter] = useState('');
  const [pyStarter, setPyStarter] = useState('');
  const [testCases, setTestCases] = useState([{ input: '', expected_output: '', is_hidden: false }]);
  const [topics, setTopics] = useState(topicsProp || []);
  const [saving, setSaving] = useState(false);

  // AI Generator state
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiCount, setAiCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState(false);

  useEffect(() => {
    if (topicsProp && topicsProp.length > 0) {
      setTopics(topicsProp);
    }
  }, [topicsProp]);

  useEffect(() => {
    if (!isOpen) return;

    api.getTopics()
      .then((r) => {
        if (r.data?.length) setTopics(r.data);
      })
      .catch(() => {});

    if (currentQuestion) {
      setTitle(currentQuestion.title || '');
      setDifficulty(currentQuestion.difficulty || 'easy');
      setTopicId(currentQuestion.topic_id || '');
      setPoints(currentQuestion.points || DIFF_CONFIG[currentQuestion.difficulty]?.pts || 20);
      setEstimatedTime(currentQuestion.estimated_time || '30 mins');
      setStatus(currentQuestion.status || 'published');
      setDescription(currentQuestion.description || '');
      setConstraints(currentQuestion.constraints || '');
      setInputFormat(currentQuestion.input_format || '');
      setOutputFormat(currentQuestion.output_format || '');
      setHints(Array.isArray(currentQuestion.hints) ? currentQuestion.hints.join('\n') : (currentQuestion.hints || ''));

      const sc = currentQuestion.starter_code && typeof currentQuestion.starter_code === 'object'
        ? currentQuestion.starter_code
        : {};
      setJsStarter(sc.javascript || DEFAULT_JS_STARTER);
      setPyStarter(sc.python || DEFAULT_PY_STARTER);

      api.getQuestionById(currentQuestion.id)
        .then((r) => {
          if (r.data?.test_cases?.length) {
            setTestCases(r.data.test_cases);
          }
        })
        .catch(() => {});
    } else {
      setTitle('');
      setDifficulty('easy');
      setTopicId('');
      setPoints(10);
      setEstimatedTime('30 mins');
      setStatus('published');
      setDescription('');
      setConstraints('');
      setInputFormat('');
      setOutputFormat('');
      setHints('');
      setJsStarter(DEFAULT_JS_STARTER);
      setPyStarter(DEFAULT_PY_STARTER);
      setTestCases([{ input: '', expected_output: '', is_hidden: false }]);
    }

    setActiveTab('basic');
    setAiError('');
    setAiSuccess(false);
  }, [isOpen, currentQuestion?.id]);

  async function generateWithAI() {
    if (!aiTopic.trim()) {
      setAiError('Please enter a topic or concept name first.');
      return;
    }
    setGenerating(true);
    setAiError('');
    setAiSuccess(false);

    try {
      const r = await api.generateAIQuestion({
        topic: aiTopic.trim(),
        difficulty: aiDifficulty,
        count: Number(aiCount) || 5
      });
      const d = r.data || {};

      setTitle(d.title || '');
      setDifficulty(aiDifficulty);
      setPoints(DIFF_CONFIG[aiDifficulty]?.pts || 20);
      setDescription(d.description || '');
      setConstraints(d.constraints || '');
      setInputFormat(d.input_format || '');
      setOutputFormat(d.output_format || '');
      setHints(Array.isArray(d.hints) ? d.hints.join('\n') : (d.hints || ''));
      setStatus('draft');

      if (d.starter_code && typeof d.starter_code === 'object') {
        setJsStarter(d.starter_code.javascript || DEFAULT_JS_STARTER);
        setPyStarter(d.starter_code.python || DEFAULT_PY_STARTER);
      }

      if (Array.isArray(d.test_cases) && d.test_cases.length > 0) {
        setTestCases(
          d.test_cases.map((tc) => ({
            input: String(tc.input ?? ''),
            expected_output: String(tc.expected_output ?? ''),
            is_hidden: Boolean(tc.is_hidden)
          }))
        );
      }

      if (d.time_limit_ms) {
        setEstimatedTime(`${Math.max(1, Math.round(Number(d.time_limit_ms) / 60000))} mins`);
      }

      const matching = topics.find(
        (t) => t.name?.toLowerCase() === aiTopic.trim().toLowerCase()
      );
      if (matching) setTopicId(matching.id);

      setAiSuccess(true);
      setActiveTab('basic');
      setTimeout(() => setAiSuccess(false), 4000);
    } catch (e) {
      setAiError(e.message || 'AI generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a question title.');
      return;
    }
    if (!description.trim()) {
      alert('Please enter a question description.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        difficulty,
        topic_id: topicId || null,
        points: Number(points) || 10,
        estimated_time: estimatedTime.trim() || '30 mins',
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
        test_cases: testCases.filter(
          (tc) => String(tc.input).trim() || String(tc.expected_output).trim()
        )
      };

      if (currentQuestion?.id) {
        await api.updateQuestion(currentQuestion.id, payload);
      } else {
        await api.createQuestion(payload);
      }

      await notifySaved(payload);
      onClose();
    } catch (e) {
      alert(e.message || 'Failed to save challenge.');
    } finally {
      setSaving(false);
    }
  }

  const addTest = () => {
    setTestCases((prev) => [...prev, { input: '', expected_output: '', is_hidden: false }]);
  };

  const removeTest = (i) => {
    setTestCases((prev) => prev.filter((_, idx) => idx !== i));
  };

  const changeTest = (i, k, v) => {
    setTestCases((prev) =>
      prev.map((tc, idx) => (idx === i ? { ...tc, [k]: v } : tc))
    );
  };

  const diffCfg = DIFF_CONFIG[difficulty] || DIFF_CONFIG.easy;

  if (!isOpen) return null;

  const inputClasses =
    'w-full px-3.5 py-2.5 rounded-xl border border-theme-border bg-theme-surface text-theme-text1 placeholder:text-theme-text3 text-xs focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 transition-colors';
  const textareaClasses =
    'w-full p-3 rounded-xl border border-theme-border bg-theme-surface text-theme-text1 placeholder:text-theme-text3 text-xs focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 resize-none transition-colors leading-relaxed';
  const codeTextareaClasses =
    'w-full p-3 rounded-xl border border-theme-border bg-theme-surface font-mono text-xs text-cyan-500 dark:text-cyan-300 placeholder:text-theme-text3 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 resize-none leading-relaxed';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl md:rounded-3xl border border-theme-border bg-theme-bg shadow-2xl overflow-hidden flex flex-col my-4 sm:my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 flex items-center justify-between border-b border-theme-border bg-theme-surface/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-theme-text1 flex items-center gap-2">
                {currentQuestion ? 'Edit Coding Challenge' : 'Create New Challenge'}
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${diffCfg.color} ${diffCfg.bg} ${diffCfg.border}`}>
                  {diffCfg.label}
                </span>
              </h2>
              <p className="text-[11px] text-theme-text2">
                Configure problem details, test cases, and starter templates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-theme-text2 hover:text-theme-text1 hover:bg-theme-surface2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Quick Generator Box (for new challenges) */}
        {!currentQuestion && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-950/20">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-500" />
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  AI Question Generator
                </span>
                <span className="text-[10px] text-theme-text3">
                  (Prompt topic and difficulty to auto-fill specs)
                </span>
              </div>
              {aiSuccess && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <Check className="w-3.5 h-3.5" /> Generated & Loaded!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    generateWithAI();
                  }
                }}
                placeholder="Topic — e.g. Binary Search, Dynamic Programming, Two Pointers, Graph BFS..."
                className={inputClasses}
              />
              <div className="relative">
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  className={`${inputClasses} pr-8 cursor-pointer`}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-text3 pointer-events-none" />
              </div>
              <button
                type="button"
                disabled={generating}
                onClick={generateWithAI}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap shadow-sm shadow-cyan-500/25"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generating ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <label className="flex items-center gap-2 text-theme-text2">
                <span>Test cases to generate:</span>
                <input
                  type="number"
                  min="2"
                  max="15"
                  value={aiCount}
                  onChange={(e) => setAiCount(e.target.value)}
                  className="w-16 px-2 py-0.5 rounded-lg border border-theme-border bg-theme-surface text-center font-mono text-theme-text1 text-xs"
                />
              </label>
              {aiError && <span className="text-rose-500 font-medium">{aiError}</span>}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 flex items-center gap-2 border-b border-theme-border bg-theme-surface/50 mt-2">
          {[
            { id: 'basic', label: 'Problem & Specs', icon: <FileCode className="w-3.5 h-3.5" /> },
            { id: 'starter', label: 'Starter Code', icon: <Code2 className="w-3.5 h-3.5" /> },
            { id: 'testcases', label: `Test Cases (${testCases.length})`, icon: <FlaskConical className="w-3.5 h-3.5" /> }
          ].map((tab, idx) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-500'
                  : 'border-transparent text-theme-text2 hover:text-theme-text1'
              }`}
            >
              {tab.icon}
              <span>
                {idx + 1}. {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Main Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 max-h-[60vh]">
            
            {/* Tab 1: Basic & Problem Specs */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-theme-text2 mb-1.5">
                    Challenge Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Invert Binary Tree, Two Sum II, Trapping Rain Water..."
                    className={inputClasses}
                  />
                </div>

                {/* Meta Row: Difficulty, Topic, Points, Status, Est Time */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Difficulty</label>
                    <div className="relative">
                      <select
                        value={difficulty}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDifficulty(val);
                          setPoints(DIFF_CONFIG[val]?.pts || 20);
                        }}
                        className={`${inputClasses} pr-8 cursor-pointer`}
                      >
                        {Object.entries(DIFF_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label} ({v.pts} pts)
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-text3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Topic</label>
                    <div className="relative">
                      <select
                        value={topicId}
                        onChange={(e) => setTopicId(e.target.value)}
                        className={`${inputClasses} pr-8 cursor-pointer`}
                      >
                        <option value="">— Select Topic —</option>
                        {topics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-text3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Points</label>
                    <input
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      className={`${inputClasses} font-mono text-center`}
                      placeholder="20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Est. Time</label>
                    <input
                      type="text"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      className={inputClasses}
                      placeholder="30 mins"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-theme-text2">Status:</label>
                    <div className="relative inline-block">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="px-3 py-1 rounded-lg border border-theme-border bg-theme-surface text-theme-text1 text-xs appearance-none pr-7 cursor-pointer focus:outline-none focus:border-cyan-500"
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-theme-text3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-theme-text2 mb-1.5">
                    Problem Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe problem context, clear task requirements, and sample input/output examples..."
                    className={textareaClasses}
                  />
                </div>

                {/* Input & Output format */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-theme-text2 mb-1.5">
                      Input Format
                    </label>
                    <textarea
                      rows={3}
                      value={inputFormat}
                      onChange={(e) => setInputFormat(e.target.value)}
                      placeholder="e.g. First line contains integer N. Second line contains N space-separated integers."
                      className={textareaClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-theme-text2 mb-1.5">
                      Output Format
                    </label>
                    <textarea
                      rows={3}
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      placeholder="e.g. Print single integer representing the maximum subarray sum."
                      className={textareaClasses}
                    />
                  </div>
                </div>

                {/* Constraints */}
                <div>
                  <label className="block text-xs font-semibold text-theme-text2 mb-1.5">
                    Constraints
                  </label>
                  <textarea
                    rows={3}
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="e.g. 1 <= N <= 10^5&#10;-10^9 <= nums[i] <= 10^9&#10;Time Limit: 2.0s, Memory Limit: 256MB"
                    className={`${textareaClasses} font-mono`}
                  />
                </div>

                {/* Hints */}
                <div>
                  <label className="block text-xs font-semibold text-theme-text2 mb-1.5">
                    Hints <span className="font-normal opacity-60 text-theme-text3">(one per line)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={hints}
                    onChange={(e) => setHints(e.target.value)}
                    placeholder="Hint 1: Can you use a hash map to look up complements in O(1)?"
                    className={textareaClasses}
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Starter Code */}
            {activeTab === 'starter' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs text-indigo-500 dark:text-indigo-300">
                  <span className="font-bold">Starter Code Templates:</span> When students open this problem in the code workspace, this code is loaded as the default template. Standard stdin/stdout reading is recommended.
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-text1">
                      <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-mono text-[10px] font-bold">
                        JS
                      </span>
                      JavaScript Starter Template
                    </label>
                    <button
                      type="button"
                      onClick={() => setJsStarter(DEFAULT_JS_STARTER)}
                      className="text-[11px] text-cyan-500 hover:underline"
                    >
                      Reset to Default
                    </button>
                  </div>
                  <textarea
                    rows={9}
                    value={jsStarter}
                    onChange={(e) => setJsStarter(e.target.value)}
                    spellCheck={false}
                    className={codeTextareaClasses}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-theme-text1">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono text-[10px] font-bold">
                        PY
                      </span>
                      Python 3 Starter Template
                    </label>
                    <button
                      type="button"
                      onClick={() => setPyStarter(DEFAULT_PY_STARTER)}
                      className="text-[11px] text-cyan-500 hover:underline"
                    >
                      Reset to Default
                    </button>
                  </div>
                  <textarea
                    rows={9}
                    value={pyStarter}
                    onChange={(e) => setPyStarter(e.target.value)}
                    spellCheck={false}
                    className={codeTextareaClasses}
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Test Cases */}
            {activeTab === 'testcases' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-theme-text2">
                    Public test cases are displayed to students. Hidden test cases evaluate submissions.
                  </p>
                  <button
                    type="button"
                    onClick={addTest}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-cyan-500 hover:bg-cyan-400 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Case
                  </button>
                </div>

                {testCases.map((tc, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-theme-border bg-theme-surface/70 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center text-xs font-bold font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-theme-text1">
                          Test Case #{idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-amber-500">
                          <input
                            type="checkbox"
                            checked={Boolean(tc.is_hidden)}
                            onChange={(e) => changeTest(idx, 'is_hidden', e.target.checked)}
                            className="rounded accent-amber-500"
                          />
                          Hidden Case
                        </label>
                        {testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTest(idx)}
                            className="p-1 rounded-lg text-theme-text3 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-theme-text2 mb-1">
                          Input (stdin)
                        </label>
                        <textarea
                          rows={4}
                          value={tc.input}
                          onChange={(e) => changeTest(idx, 'input', e.target.value)}
                          placeholder="stdin input..."
                          spellCheck={false}
                          className={`${inputClasses} font-mono`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-500 dark:text-emerald-400 mb-1">
                          Expected Output (stdout)
                        </label>
                        <textarea
                          rows={4}
                          value={tc.expected_output}
                          onChange={(e) => changeTest(idx, 'expected_output', e.target.value)}
                          placeholder="expected stdout output..."
                          spellCheck={false}
                          className={`${inputClasses} font-mono`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-5 py-4 sm:px-6 border-t border-theme-border bg-theme-surface/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${diffCfg.color} ${diffCfg.bg} ${diffCfg.border}`}>
                {diffCfg.label}
              </span>
              <span className="text-xs text-theme-text3">
                {points} pts • {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-theme-text2 hover:text-theme-text1 hover:bg-theme-surface2 border border-theme-border transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-cyan-500/20"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {saving
                  ? 'Saving...'
                  : currentQuestion
                  ? 'Update Challenge'
                  : 'Create Challenge'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}