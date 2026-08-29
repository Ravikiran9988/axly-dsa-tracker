import React, { useState, useEffect, useMemo } from 'react';
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
  Code2,
  Sparkles,
  RefreshCw,
  Edit3,
  BookOpen,
  Layers,
  Check,
  Eye,
  Send,
  Sliders,
  FileCode2,
  ListOrdered,
  Lightbulb,
  Clock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export default function AdminDailyChallengeModal({
  isOpen,
  onClose,
  challengeToEdit = null,
  initialMode = 'manual', // 'manual' | 'ai'
  topics = [],
  patterns = [],
  onSaved
}) {
  const [creationMode, setCreationMode] = useState('manual'); // 'manual' | 'ai'
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'content' | 'testcases' | 'hints_editorial'

  // Manual Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    difficulty: 'medium',
    topic_id: '',
    pattern_id: '',
    topic_name: 'Arrays',
    pattern_name: '',
    points: 100,
    estimated_time: 30,
    description: '',
    problem_statement: '',
    constraints: '',
    input_format: '',
    output_format: '',
    examples: [
      { input: '', output: '', explanation: '' }
    ],
    starter_code: `function solution(input) {\n  // Write your competitive solution here\n  return null;\n}`,
    supported_languages: ['javascript', 'python', 'typescript', 'java', 'cpp'],
    hints: ['', '', ''],
    editorial: '',
    solution_approach: '',
    complexity: '',
    status: 'draft',
    scheduled_date: '',
    created_via: 'manual',
    test_cases: [
      { id: 'tc-1', input: '', expected_output: '', is_hidden: false },
      { id: 'tc-2', input: '', expected_output: '', is_hidden: true }
    ]
  });

  // AI Generation Form State
  const [aiConfig, setAiConfig] = useState({
    topic: 'Arrays',
    difficulty: 'medium',
    pattern: '',
    points: 100,
    instructions: '',
    scheduled_date: ''
  });

  // AI State
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState(null);
  const [aiValidationErrors, setAiValidationErrors] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dynamic Topics & Pattern Taxonomy State
  const [modalTopics, setModalTopics] = useState(topics || []);
  const [recLoading, setRecLoading] = useState(false);
  const [recReason, setRecReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDailyTopics();
    }
  }, [isOpen]);

  async function fetchDailyTopics() {
    try {
      const res = await api.getDailyChallengeTopics();
      if (res && res.data && Array.isArray(res.data.topics)) {
        setModalTopics(res.data.topics);
      } else if (topics && topics.length > 0) {
        setModalTopics(topics);
      }
    } catch {
      if (topics && topics.length > 0) setModalTopics(topics);
    }
  }

  const handleRecommendTopic = async (targetDifficulty) => {
    setRecLoading(true);
    setRecReason('');
    try {
      const res = await api.recommendDailyChallengeTopic({ difficulty: targetDifficulty });
      if (res && res.data) {
        const rec = res.data;
        setAiConfig(prev => ({
          ...prev,
          topic: rec.topic_name || rec.topic_id,
          pattern: rec.pattern_name || prev.pattern
        }));
        setFormData(prev => ({
          ...prev,
          topic_id: rec.topic_id,
          topic_name: rec.topic_name,
          pattern_name: rec.pattern_name || prev.pattern_name
        }));
        if (rec.reason) {
          setRecReason(rec.reason);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch topic recommendation.');
    } finally {
      setRecLoading(false);
    }
  };

  const groupedTopics = useMemo(() => {
    const map = {
      'Core': [],
      'Trees': [],
      'Graphs': [],
      'Advanced': [],
      'Other': []
    };

    if (!modalTopics || modalTopics.length === 0) return map;

    modalTopics.forEach(t => {
      const cat = map[t.category] ? t.category : 'Other';
      map[cat].push(t);
    });

    return map;
  }, [modalTopics]);

  const aiAvailablePatterns = useMemo(() => {
    if (!aiConfig.topic) return [];
    const matched = modalTopics.find(t =>
      t.id === aiConfig.topic || t.name?.toLowerCase() === String(aiConfig.topic).toLowerCase()
    );
    return matched?.patterns || [];
  }, [modalTopics, aiConfig.topic]);

  const manualAvailablePatterns = useMemo(() => {
    if (!formData.topic_id && !formData.topic_name) return [];
    const matched = modalTopics.find(t =>
      t.id === formData.topic_id || t.name?.toLowerCase() === String(formData.topic_name).toLowerCase()
    );
    return matched?.patterns || [];
  }, [modalTopics, formData.topic_id, formData.topic_name]);

  useEffect(() => {
    if (isOpen) {
      if (challengeToEdit) {
        setCreationMode('manual');
        const hintsArr = Array.isArray(challengeToEdit.hints)
          ? challengeToEdit.hints
          : typeof challengeToEdit.hints === 'string'
          ? [challengeToEdit.hints]
          : [];
        while (hintsArr.length < 3) hintsArr.push('');

        const exArr = Array.isArray(challengeToEdit.examples) && challengeToEdit.examples.length > 0
          ? challengeToEdit.examples
          : (challengeToEdit.example_input || challengeToEdit.example_output)
          ? [{ input: challengeToEdit.example_input || '', output: challengeToEdit.example_output || '', explanation: '' }]
          : [{ input: '', output: '', explanation: '' }];

        setFormData({
          title: challengeToEdit.title || '',
          slug: challengeToEdit.slug || '',
          difficulty: challengeToEdit.difficulty || 'medium',
          topic_id: challengeToEdit.topic_id || '',
          pattern_id: challengeToEdit.pattern_id || '',
          topic_name: challengeToEdit.topic_name || 'Arrays',
          pattern_name: challengeToEdit.pattern_name || '',
          points: challengeToEdit.points || 100,
          estimated_time: challengeToEdit.estimated_time || 30,
          description: challengeToEdit.description || '',
          problem_statement: challengeToEdit.problem_statement || challengeToEdit.description || '',
          constraints: challengeToEdit.constraints || '',
          input_format: challengeToEdit.input_format || '',
          output_format: challengeToEdit.output_format || '',
          examples: exArr,
          starter_code: typeof challengeToEdit.starter_code === 'object'
            ? JSON.stringify(challengeToEdit.starter_code, null, 2)
            : (challengeToEdit.starter_code || `function solution(input) {\n  return null;\n}`),
          supported_languages: Array.isArray(challengeToEdit.supported_languages)
            ? challengeToEdit.supported_languages
            : ['javascript', 'python', 'typescript', 'java', 'cpp'],
          hints: hintsArr.slice(0, 5),
          editorial: challengeToEdit.editorial || challengeToEdit.solution_approach || '',
          solution_approach: challengeToEdit.solution_approach || challengeToEdit.editorial || '',
          complexity: challengeToEdit.complexity || '',
          status: challengeToEdit.status || 'draft',
          scheduled_date: challengeToEdit.scheduled_date || '',
          created_via: challengeToEdit.created_via || 'manual',
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
        setCreationMode(initialMode || 'manual');
        setAiGeneratedData(null);
        setFormData({
          title: '',
          slug: '',
          difficulty: 'medium',
          topic_id: topics[0]?.id || '',
          pattern_id: '',
          topic_name: 'Arrays',
          pattern_name: '',
          points: 100,
          estimated_time: 30,
          description: '',
          problem_statement: '',
          constraints: '1 <= N <= 10^5\n-10^4 <= nums[i] <= 10^4',
          input_format: 'Standard array and parameter inputs.',
          output_format: 'Single calculated output.',
          examples: [{ input: 'nums = [1, 2, 3]', output: '6', explanation: 'Sum of all elements is 6.' }],
          starter_code: `function solution(nums) {\n  // Write your competitive solution here\n  return 0;\n}`,
          supported_languages: ['javascript', 'python', 'typescript', 'java', 'cpp'],
          hints: ['', '', ''],
          editorial: '',
          solution_approach: '',
          complexity: 'Time: O(N) | Space: O(1)',
          status: 'draft',
          scheduled_date: '',
          created_via: 'manual',
          test_cases: [
            { id: 'tc-1', input: '[1, 2, 3]', expected_output: '6', is_hidden: false },
            { id: 'tc-2', input: '[0, 0, 0]', expected_output: '0', is_hidden: true }
          ]
        });
      }
      setError(null);
      setDuplicateWarning(null);
    }
  }, [isOpen, challengeToEdit, initialMode, topics]);

  if (!isOpen) return null;

  // Handle AI Challenge Generation
  const handleGenerateAI = async () => {
    setAiGenerating(true);
    setError(null);
    setDuplicateWarning(null);
    setAiValidationErrors([]);

    try {
      const payload = {
        ...aiConfig,
        topic: aiConfig.topic === 'Other' ? (aiConfig.custom_topic || 'Other') : aiConfig.topic
      };
      const res = await api.generateDailyChallengeAI(payload);
      if (res.data) {
        setAiGeneratedData(res.data);
        if (res.data.recommendation_reason) {
          setRecReason(res.data.recommendation_reason);
        }
      }
    } catch (err) {
      setError(err.message || 'AI generation failed. Please try again or refine instructions.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Convert AI generated data into active manual editor
  const handleEditAiInManual = () => {
    if (!aiGeneratedData) return;
    setFormData({
      ...formData,
      ...aiGeneratedData,
      created_via: 'ai',
      status: 'draft',
      hints: Array.isArray(aiGeneratedData.hints) ? aiGeneratedData.hints : ['', '', ''],
      examples: Array.isArray(aiGeneratedData.examples) ? aiGeneratedData.examples : [{ input: '', output: '', explanation: '' }],
      test_cases: Array.isArray(aiGeneratedData.test_cases) ? aiGeneratedData.test_cases : formData.test_cases
    });
    setAiGeneratedData(null);
    setCreationMode('manual');
    setActiveTab('details');
  };

  // Save AI Generated challenge directly as Draft
  const handleSaveAiAsDraft = async () => {
    if (!aiGeneratedData) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...aiGeneratedData,
        created_via: 'ai',
        status: 'draft'
      };
      await api.createDailyChallenge(payload);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save AI challenge');
    } finally {
      setLoading(false);
    }
  };

  // Manual Form Handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'difficulty' && !challengeToEdit ? {
        points: value === 'hard' ? 150 : value === 'medium' ? 100 : 50
      } : {})
    }));
  };

  const handleExampleChange = (index, field, value) => {
    const updated = [...formData.examples];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, examples: updated }));
  };

  const addExample = () => {
    setFormData(prev => ({
      ...prev,
      examples: [...prev.examples, { input: '', output: '', explanation: '' }]
    }));
  };

  const removeExample = (index) => {
    if (formData.examples.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }));
  };

  const handleTestCaseChange = (index, field, value) => {
    const updated = [...formData.test_cases];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, test_cases: updated }));
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      test_cases: [
        ...prev.test_cases,
        { id: `tc-${Date.now()}`, input: '', expected_output: '', is_hidden: false }
      ]
    }));
  };

  const removeTestCase = (index) => {
    if (formData.test_cases.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, i) => i !== index)
    }));
  };

  const handleHintChange = (index, value) => {
    const updated = [...formData.hints];
    updated[index] = value;
    setFormData(prev => ({ ...prev, hints: updated }));
  };

  const addHint = () => {
    setFormData(prev => ({ ...prev, hints: [...prev.hints, ''] }));
  };

  const removeHint = (index) => {
    setFormData(prev => ({ ...prev, hints: prev.hints.filter((_, i) => i !== index) }));
  };

  // Submit Manual Form
  const handleSubmit = async (overrideStatus = null) => {
    setError(null);
    setLoading(true);

    try {
      if (!formData.title.trim()) throw new Error('Challenge Title is required');
      if (!formData.description.trim()) throw new Error('Problem Description is required');

      const targetStatus = overrideStatus || formData.status || 'draft';
      const cleanHints = formData.hints.filter(h => h && h.trim());
      const cleanTestCases = formData.test_cases.filter(tc => tc.input !== '' && tc.expected_output !== '');

      if (cleanTestCases.length < 2) {
        throw new Error('At least 2 test cases (public and hidden) are required.');
      }

      const payload = {
        ...formData,
        status: targetStatus,
        hints: cleanHints,
        test_cases: cleanTestCases,
        points: Number(formData.points) || 100,
        estimated_time: Number(formData.estimated_time) || 30,
        created_via: challengeToEdit ? (formData.created_via || 'manual') : (creationMode === 'ai' ? 'ai' : 'manual'),
        editorial: formData.editorial || formData.solution_approach,
        solution_approach: formData.editorial || formData.solution_approach
      };

      if (challengeToEdit) {
        await api.updateDailyChallenge(challengeToEdit.id, payload);
      } else {
        await api.createDailyChallenge(payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save Daily Challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/90 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              {creationMode === 'ai' ? <Sparkles className="w-5 h-5" /> : <Flame className="w-5 h-5 fill-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {challengeToEdit ? 'Edit Daily Challenge' : 'Create Daily Challenge'}
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Competitive DSA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Independent competitive challenge &middot; never mixed with Practice problems
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher (Only when creating new) */}
            {!challengeToEdit && !aiGeneratedData && (
              <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setCreationMode('manual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    creationMode === 'manual'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" /> ✍ Manual
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('ai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    creationMode === 'ai'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> ✨ Generate with AI
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE 1: AI GENERATION VIEW */}
        {/* ============================================================ */}
        {creationMode === 'ai' && !aiGeneratedData && (
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/20 via-slate-900 to-slate-950 border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Daily Challenge Generator</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Autonomous Quality Validation &middot; Saves as Draft
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure topic, difficulty, and requirements. The AI will synthesize an original interview-caliber problem with verified test cases, progressive hints, complexity analysis, and starter code.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="col-span-full sm:col-span-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">Primary Topic *</label>
                    <button
                      type="button"
                      onClick={() => handleRecommendTopic(aiConfig.difficulty)}
                      disabled={recLoading}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-[11px] font-semibold transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      {recLoading ? 'Analyzing...' : '✨ AI Recommend Topic'}
                    </button>
                  </div>
                  <select
                    value={aiConfig.topic}
                    onChange={(e) => {
                      setAiConfig(prev => ({ ...prev, topic: e.target.value }));
                      setRecReason('');
                    }}
                    className="input-field w-full text-xs"
                  >
                    <option value="Surprise Me">✨ Surprise Me (AI Select Optimal Topic)</option>
                    {Object.entries(groupedTopics).map(([category, items]) => items.length > 0 && (
                      <optgroup key={category} label={category}>
                        {items.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="Other">Other (Custom Topic)</option>
                  </select>
                </div>

                <div className="col-span-full sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Difficulty *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['easy', 'medium', 'hard'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setAiConfig(prev => ({
                          ...prev,
                          difficulty: d,
                          points: d === 'hard' ? 150 : d === 'medium' ? 100 : 50
                        }))}
                        className={`py-2 rounded-xl text-xs font-bold uppercase transition-all border ${
                          aiConfig.difficulty === d
                            ? d === 'easy'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : d === 'medium'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d} ({d === 'hard' ? 150 : d === 'medium' ? 100 : 50}p)
                      </button>
                    ))}
                  </div>
                </div>

                {aiConfig.topic === 'Other' && (
                  <div className="col-span-full">
                    <label className="block text-xs font-semibold text-amber-300 mb-1.5">Custom Topic Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Quantum Sorting, Trie Hashing"
                      value={aiConfig.custom_topic || ''}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, custom_topic: e.target.value }))}
                      className="input-field w-full text-xs border-amber-500/40 text-amber-200"
                    />
                  </div>
                )}

                {recReason && (
                  <div className="col-span-full p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-200 flex items-start gap-2 animate-fadeIn">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">Topic Diversity Recommendation: </span>
                      {recReason}
                    </div>
                  </div>
                )}

                <div className="col-span-full sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Algorithm Pattern (Optional)</label>
                  {aiAvailablePatterns.length > 0 ? (
                    <select
                      value={aiConfig.pattern}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, pattern: e.target.value }))}
                      className="input-field w-full text-xs"
                    >
                      <option value="">Auto / Any Pattern for Topic</option>
                      {aiAvailablePatterns.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Sliding Window, Two Pointers, Monotonic Stack, BFS"
                      value={aiConfig.pattern}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, pattern: e.target.value }))}
                      className="input-field w-full text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reward Points</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={aiConfig.points}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, points: Number(e.target.value) }))}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Additional Instructions & Special Requirements (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., 'Create a realistic FAANG-style problem focusing on memory constraints. Ensure no duplicate elements in test cases.'"
                  value={aiConfig.instructions}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, instructions: e.target.value }))}
                  className="input-field w-full text-xs resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI content is strictly created in Draft status and never auto-published.</span>
                </div>
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={handleGenerateAI}
                  className="btn-primary inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-600/30"
                >
                  {aiGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Challenge...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>✨ Generate Challenge</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE 1.5: AI PREVIEW & REVIEW SCREEN */}
        {/* ============================================================ */}
        {creationMode === 'ai' && aiGeneratedData && (
          <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">AI Challenge Synthesized Successfully</h4>
                  <p className="text-[11px] text-purple-300">
                    Review the generated problem statement, test cases, and editorial below before saving.
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                {aiGeneratedData.difficulty?.toUpperCase()} &middot; {aiGeneratedData.points} pts
              </span>
            </div>

            {/* Problem Overview Card */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">{aiGeneratedData.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                    <span>Topic: <strong className="text-cyan-400">{aiGeneratedData.topic}</strong></span>
                    {aiGeneratedData.pattern && <span>&middot; Pattern: <strong className="text-amber-400">{aiGeneratedData.pattern}</strong></span>}
                  </div>
                </div>
                <div className="badge bg-slate-800 text-slate-300 border-slate-700 text-xs">
                  {aiGeneratedData.complexity || 'Time: O(N) | Space: O(1)'}
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase text-slate-400 mb-1 font-mono">Problem Statement</h5>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                  {aiGeneratedData.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-slate-400 font-mono">Constraints:</span>
                  <p className="text-slate-300 mt-1 whitespace-pre-line font-mono text-[11px]">{aiGeneratedData.constraints}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-slate-400 font-mono">Input / Output Format:</span>
                  <p className="text-slate-300 mt-1 text-[11px]">{aiGeneratedData.input_format} &rarr; {aiGeneratedData.output_format}</p>
                </div>
              </div>

              {/* Examples */}
              {aiGeneratedData.examples && aiGeneratedData.examples.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase text-slate-400 font-mono">Examples ({aiGeneratedData.examples.length})</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {aiGeneratedData.examples.map((ex, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                        <div className="text-slate-400">Example {idx + 1}:</div>
                        <div><strong className="text-cyan-400">Input:</strong> {ex.input}</div>
                        <div><strong className="text-emerald-400">Output:</strong> {ex.output}</div>
                        {ex.explanation && <div className="text-slate-400 text-[11px] mt-1 font-sans"><em>{ex.explanation}</em></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test cases count & Hints */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>{aiGeneratedData.test_cases?.length || 0} Test Cases generated</span>
                <span>{aiGeneratedData.hints?.length || 0} Progressive Hints included</span>
              </div>
            </div>

            {/* AI Preview Action Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={aiGenerating}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEditAiInManual}
                  className="btn-secondary text-xs inline-flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit in Manual Form</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveAiAsDraft}
                  className="btn-primary text-xs inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save as Draft</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE 2: MANUAL AUTHORING FORM */}
        {/* ============================================================ */}
        {creationMode === 'manual' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Sub-tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/30 shrink-0">
              {[
                { id: 'details', label: '1. Basic Details', icon: Sliders },
                { id: 'content', label: '2. Statement & Examples', icon: BookOpen },
                { id: 'testcases', label: `3. Test Cases (${formData.test_cases.length})`, icon: CheckCircle2 },
                { id: 'hints_editorial', label: '4. Hints & Editorial', icon: Lightbulb }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-amber-400 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Challenge Title *</label>
                      <input
                        type="text"
                        name="title"
                        required
                        placeholder="e.g. Longest Substring with At Most K Distinct Characters"
                        value={formData.title}
                        onChange={handleFormChange}
                        className="input-field w-full text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Problem Slug (Optional)</label>
                      <input
                        type="text"
                        name="slug"
                        placeholder="e.g. longest-substring-k-distinct"
                        value={formData.slug}
                        onChange={handleFormChange}
                        className="input-field w-full text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Difficulty *</label>
                      <select
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={handleFormChange}
                        className="input-field w-full text-xs font-bold capitalize"
                      >
                        <option value="easy">Easy (50 pts)</option>
                        <option value="medium">Medium (100 pts)</option>
                        <option value="hard">Hard (150 pts)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-300">Primary Topic *</label>
                        <button
                          type="button"
                          onClick={() => handleRecommendTopic(formData.difficulty)}
                          disabled={recLoading}
                          className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-[10px] font-semibold transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          {recLoading ? 'Analyzing...' : '✨ AI Recommend'}
                        </button>
                      </div>
                      <select
                        name="topic_id"
                        value={formData.topic_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = modalTopics.find(t => t.id === val);
                          setFormData(prev => ({
                            ...prev,
                            topic_id: val,
                            topic_name: matched ? matched.name : (val === 'other' ? 'Other' : val),
                            custom_topic: val === 'other' ? prev.custom_topic : ''
                          }));
                          setRecReason('');
                        }}
                        className="input-field w-full text-xs"
                      >
                        <option value="">Select Topic</option>
                        {Object.entries(groupedTopics).map(([category, items]) => items.length > 0 && (
                          <optgroup key={category} label={category}>
                            {items.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </optgroup>
                        ))}
                        <option value="other">Other (Custom Topic)</option>
                      </select>
                    </div>

                    {formData.topic_id === 'other' && (
                      <div className="col-span-full">
                        <label className="block text-xs font-semibold text-amber-300 mb-1.5">Custom Topic Name *</label>
                        <input
                          type="text"
                          name="custom_topic"
                          placeholder="e.g. Quantum Algorithms, Trie Hashing"
                          value={formData.custom_topic || ''}
                          onChange={handleFormChange}
                          className="input-field w-full text-xs border-amber-500/40 text-amber-200"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Algorithm Pattern (Optional)</label>
                      {manualAvailablePatterns.length > 0 ? (
                        <select
                          name="pattern_name"
                          value={formData.pattern_name}
                          onChange={handleFormChange}
                          className="input-field w-full text-xs"
                        >
                          <option value="">Select Pattern / Technique</option>
                          {manualAvailablePatterns.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="pattern_name"
                          placeholder="e.g. Sliding Window, Monotonic Stack, Two Pointers"
                          value={formData.pattern_name}
                          onChange={handleFormChange}
                          className="input-field w-full text-xs"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Competitive Points</label>
                      <input
                        type="number"
                        name="points"
                        min="10"
                        max="500"
                        value={formData.points}
                        onChange={handleFormChange}
                        className="input-field w-full text-xs font-mono font-bold text-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Schedule Calendar Date (Optional)</label>
                      <input
                        type="date"
                        name="scheduled_date"
                        value={formData.scheduled_date}
                        onChange={handleFormChange}
                        className="input-field w-full text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTENT & EXAMPLES */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Problem Description *</label>
                    <textarea
                      rows={5}
                      name="description"
                      required
                      placeholder="Write comprehensive problem specifications, rules, definitions, and requirements..."
                      value={formData.description}
                      onChange={handleFormChange}
                      className="input-field w-full text-xs font-mono resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Constraints *</label>
                      <textarea
                        rows={3}
                        name="constraints"
                        placeholder="e.g. 1 <= nums.length <= 10^5&#10;-10^4 <= nums[i] <= 10^4"
                        value={formData.constraints}
                        onChange={handleFormChange}
                        className="input-field w-full text-xs font-mono resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Input & Output Specifications</label>
                      <textarea
                        rows={3}
                        name="input_format"
                        placeholder="Input format & expected return value..."
                        value={formData.input_format}
                        onChange={handleFormChange}
                        className="input-field w-full text-xs font-mono resize-none"
                      />
                    </div>
                  </div>

                  {/* Dynamic Examples Builder */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-slate-300 font-mono">
                        Problem Examples ({formData.examples.length})
                      </label>
                      <button
                        type="button"
                        onClick={addExample}
                        className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Example
                      </button>
                    </div>

                    {formData.examples.map((ex, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                          <span>Example #{idx + 1}</span>
                          {formData.examples.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeExample(idx)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            placeholder="Input: e.g. nums = [1, 2, 3], k = 2"
                            value={ex.input}
                            onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                            className="input-field w-full text-xs font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Output: e.g. 5"
                            value={ex.output}
                            onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                            className="input-field w-full text-xs font-mono"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Explanation: why this is the expected result..."
                          value={ex.explanation}
                          onChange={(e) => handleExampleChange(idx, 'explanation', e.target.value)}
                          className="input-field w-full text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: TEST CASES */}
              {activeTab === 'testcases' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-300 font-mono">Test Cases & Verification</h4>
                      <p className="text-[11px] text-slate-400">Provide sample public tests and edge-case hidden evaluation tests.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addTestCase}
                      className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Test Case
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.test_cases.map((tc, idx) => (
                      <div key={tc.id || idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-300">Test Case #{idx + 1}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              tc.is_hidden
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {tc.is_hidden ? '🔒 Hidden' : '👁️ Public Example'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tc.is_hidden}
                                onChange={(e) => handleTestCaseChange(idx, 'is_hidden', e.target.checked)}
                                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                              />
                              <span>Hidden Test</span>
                            </label>
                            {formData.test_cases.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTestCase(idx)}
                                className="text-rose-400 hover:text-rose-300"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Standard Input</label>
                            <textarea
                              rows={2}
                              value={tc.input}
                              placeholder="Raw input string or JSON array"
                              onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                              className="input-field w-full text-xs font-mono resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Expected Output</label>
                            <textarea
                              rows={2}
                              value={tc.expected_output}
                              placeholder="Expected stdout or serialized return value"
                              onChange={(e) => handleTestCaseChange(idx, 'expected_output', e.target.value)}
                              className="input-field w-full text-xs font-mono resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: HINTS & EDITORIAL */}
              {activeTab === 'hints_editorial' && (
                <div className="space-y-4">
                  {/* Progressive Hints */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-slate-300 font-mono">
                        Progressive Hints ({formData.hints.length})
                      </label>
                      <button
                        type="button"
                        onClick={addHint}
                        className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Hint
                      </button>
                    </div>

                    {formData.hints.map((hint, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 text-center text-xs font-mono font-bold text-amber-400">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder={`Hint ${idx + 1}: Suggest an observation or pattern without giving away the full answer...`}
                          value={hint}
                          onChange={(e) => handleHintChange(idx, e.target.value)}
                          className="input-field flex-1 text-xs"
                        />
                        {formData.hints.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeHint(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Solution Approach / Editorial */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Editorial / Solution Approach (Visible after completion or to Admins)
                    </label>
                    <textarea
                      rows={4}
                      name="editorial"
                      placeholder="Explain optimal algorithm logic, invariant proof, and time/space complexity analysis..."
                      value={formData.editorial}
                      onChange={handleFormChange}
                      className="input-field w-full text-xs font-mono resize-y"
                    />
                  </div>

                  {/* Complexity */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Complexity Analysis</label>
                    <input
                      type="text"
                      name="complexity"
                      placeholder="e.g. Time: O(N log N) | Space: O(N)"
                      value={formData.complexity}
                      onChange={handleFormChange}
                      className="input-field w-full text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 shrink-0">
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Status: <strong className="text-amber-400 capitalize">{formData.status}</strong></span>
                {formData.scheduled_date && <span>&middot; Scheduled: <strong className="text-cyan-400 font-mono">{formData.scheduled_date}</strong></span>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSubmit('draft')}
                  className="btn-secondary text-xs inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSubmit(formData.scheduled_date ? 'scheduled' : 'published')}
                  className="btn-primary text-xs inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{formData.scheduled_date ? 'Save & Schedule' : 'Save & Publish'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
