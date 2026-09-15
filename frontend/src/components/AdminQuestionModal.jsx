import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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

export default function AdminQuestionModal({
  isOpen,
  onClose,
  questionToEdit = null,

  topics = [],
  patterns = [],
  onSaved
}) {
    const [activeTab, setActiveTab] = useState('details'); // 'details' | 'content' | 'testcases' | 'hints_editorial'
    console.log("AdminQuestionModal loaded - HMR triggered");

  const [error, setError] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(null);

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
    description: 'Given the problem parameters, design an optimal algorithm to compute the solution.',
    problem_statement: 'Given the problem parameters, design an optimal algorithm to compute the solution.',
    constraints: '',
    input_format: '',
    output_format: '',
    examples: [
      { input: '', output: '', explanation: '' }
    ],
    starter_code: {
      javascript: `function solution(input) {\n  // Write your competitive solution here\n  return null;\n}`,
      python: `def solution(input):\n    # Write your competitive solution here\n    return None`,
      typescript: `function solution(input: any): any {\n  // Write your competitive solution here\n  return null;\n}`,
      java: `class Solution {\n    public Object solution(Object input) {\n        // Write your competitive solution here\n        return null;\n    }\n}`,
      cpp: `class Solution {\npublic:\n    void solution() {\n        // Write your competitive solution here\n    }\n};`
    },
    reference_solution: {
      javascript: '', python: '', typescript: '', java: '', cpp: ''
    },
    supported_languages: ['javascript', 'python', 'typescript', 'java', 'cpp'],
    hints: ['', '', ''],
    editorial: '',
    solution_approach: '',
    complexity: '',
    status: 'draft',
    assigned_date: '',
    created_via: 'manual',
    test_cases: [
      { id: 'tc-1', input: '[1, 2, 3]', expected_output: '6', is_hidden: false },
      { id: 'tc-2', input: '[4, 5, 6]', expected_output: '15', is_hidden: true }
    ]
  });

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


  const manualAvailablePatterns = useMemo(() => {
    if (!formData.topic_id && !formData.topic_name) return [];
    const matched = modalTopics.find(t =>
      t.id === formData.topic_id || t.name?.toLowerCase() === String(formData.topic_name).toLowerCase()
    );
    return matched?.patterns || [];
  }, [modalTopics, formData.topic_id, formData.topic_name]);

  useEffect(() => {
    if (isOpen) {
      if (questionToEdit) {
                const hintsArr = Array.isArray(questionToEdit.hints)
          ? questionToEdit.hints
          : typeof questionToEdit.hints === 'string'
          ? [questionToEdit.hints]
          : [];
        while (hintsArr.length < 3) hintsArr.push('');

        const exArr = Array.isArray(questionToEdit.examples) && questionToEdit.examples.length > 0
          ? questionToEdit.examples
          : (questionToEdit.example_input || questionToEdit.example_output)
          ? [{ input: questionToEdit.example_input || '', output: questionToEdit.example_output || '', explanation: '' }]
          : [{ input: '', output: '', explanation: '' }];

        setFormData({
          title: questionToEdit.title || '',
          slug: questionToEdit.slug || '',
          difficulty: questionToEdit.difficulty || 'medium',
          topic_id: questionToEdit.topic_id || '',
          pattern_id: questionToEdit.pattern_id || '',
          topic_name: questionToEdit.topic_name || 'Arrays',
          pattern_name: questionToEdit.pattern_name || '',
          points: questionToEdit.points || 100,
          estimated_time: questionToEdit.estimated_time || 30,
          description: questionToEdit.description || '',
          problem_statement: questionToEdit.problem_statement || questionToEdit.description || '',
          constraints: questionToEdit.constraints || '',
          input_format: questionToEdit.input_format || '',
          output_format: questionToEdit.output_format || '',
          examples: exArr,
          starter_code: typeof questionToEdit.starter_code === 'object'
            ? { ...questionToEdit.starter_code }
            : { javascript: questionToEdit.starter_code || `function solution(input) {\n  return null;\n}` },
          reference_solution: typeof questionToEdit.reference_solution === 'object'
            ? { ...questionToEdit.reference_solution }
            : { javascript: questionToEdit.reference_solution || '' },
          supported_languages: Array.isArray(questionToEdit.supported_languages)
            ? questionToEdit.supported_languages
            : ['javascript', 'python', 'typescript', 'java', 'cpp'],
          hints: hintsArr.slice(0, 5),
          editorial: questionToEdit.editorial || questionToEdit.solution_approach || '',
          solution_approach: questionToEdit.solution_approach || questionToEdit.editorial || '',
          complexity: questionToEdit.complexity || '',
          status: questionToEdit.status || 'draft',
          assigned_date: questionToEdit.assigned_date || '',
          created_via: questionToEdit.created_via || 'manual',
          test_cases: Array.isArray(questionToEdit.test_cases) && questionToEdit.test_cases.length > 0
            ? questionToEdit.test_cases.map((tc, idx) => ({
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
          topic_name: 'Arrays',
          pattern_name: '',
          points: 100,
          estimated_time: 30,
          description: 'Given the input parameters, write an optimal solution meeting all constraints.',
          problem_statement: 'Given the input parameters, write an optimal solution meeting all constraints.',
          constraints: '1 <= N <= 10^5\n-10^4 <= nums[i] <= 10^4',
          input_format: 'Standard array and parameter inputs.',
          output_format: 'Single calculated output.',
          examples: [{ input: 'nums = [1, 2, 3]', output: '6', explanation: 'Sum of all elements is 6.' }],
          starter_code: {
            javascript: `function solution(nums) {\n  // Write your competitive solution here\n  return 0;\n}`,
            python: `def solution(nums):\n    return 0`,
            typescript: `function solution(nums: any[]): number {\n  return 0;\n}`,
            java: `class Solution {\n    public int solution(int[] nums) {\n        return 0;\n    }\n}`,
            cpp: `class Solution {\npublic:\n    int solution(vector<int>& nums) {\n        return 0;\n    }\n};`,
          },
          reference_solution: { javascript: '', python: '', typescript: '', java: '', cpp: '' },
          supported_languages: ['javascript', 'python', 'typescript', 'java', 'cpp'],
          hints: ['', '', ''],
          editorial: '',
          solution_approach: '',
          complexity: 'Time: O(N) | Space: O(1)',
          status: 'draft',
          assigned_date: '',
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
  }, [isOpen, questionToEdit, topics]);

  const handleSectionRecommend = async (section) => {
    if (!formData.title.trim() || !formData.difficulty) {
      setError('Enter at least a Challenge Title and Difficulty before generating recommendations.');
      return;
    }
    
    setSectionLoading(section);
    setError(null);
    try {
      const payload = {
        title: formData.title,
        difficulty: formData.difficulty,
        topic: formData.topic_name || '',
        pattern: formData.pattern_name || '',
        description: formData.description || formData.problem_statement || '',
        constraints: formData.constraints || ''
      };
      const res = await api.generateQuestionBankManualAI(payload);
      if (!res.data) throw new Error('Failed to fetch recommendation.');
      
      if (section === 'statement') {
        setFormData(prev => ({
          ...prev,
          description: res.data.description || prev.description,
          problem_statement: res.data.problem_statement || res.data.description || prev.problem_statement,
          constraints: res.data.constraints || prev.constraints,
          input_format: res.data.input_format || prev.input_format,
          output_format: res.data.output_format || prev.output_format,
          examples: res.data.examples || prev.examples,
        }));
      } else if (section === 'startercode') {
        setFormData(prev => ({
          ...prev,
          starter_code: res.data.starter_code || prev.starter_code
        }));
      } else if (section === 'referencesolution') {
        setFormData(prev => ({
          ...prev,
          reference_solution: res.data.reference_solution || prev.reference_solution
        }));
      } else if (section === 'testcases') {
        setFormData(prev => ({
          ...prev,
          test_cases: (res.data.test_cases && res.data.test_cases.length > 0) ? res.data.test_cases.map((tc, i) => ({
            id: `tc-ai-${Date.now()}-${i}`,
            input: tc.input || tc.input_data || '',
            expected_output: tc.expected_output || tc.output || '',
            is_hidden: tc.is_hidden || false
          })) : prev.test_cases
        }));
      } else if (section === 'hintseditorial') {
        setFormData(prev => ({
          ...prev,
          hints: res.data.hints || prev.hints,
          editorial: res.data.editorial || res.data.solution_approach || prev.editorial,
          solution_approach: res.data.solution_approach || res.data.editorial || prev.solution_approach,
          complexity: res.data.complexity || prev.complexity
        }));
      }
    } catch (err) {
      setError(err.message || `Failed to generate recommendation.`);
    } finally {
      setSectionLoading(null);
    }
  };

  // Manual Form Handlers
  const handleStarterCodeChange = (lang, value) => {
    setFormData(prev => ({
      ...prev,
      starter_code: { ...prev.starter_code, [lang]: value }
    }));
  };

  const handleReferenceSolutionChange = (lang, value) => {
    setFormData(prev => ({
      ...prev,
      reference_solution: { ...prev.reference_solution, [lang]: value }
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'difficulty' && !questionToEdit ? {
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
      const targetStatus = overrideStatus || formData.status || 'draft';
      const cleanHints = formData.hints.filter(h => h && h.trim());
      const cleanTestCases = formData.test_cases.filter(tc => tc.input !== '' && tc.expected_output !== '');

      if (targetStatus !== 'draft') {
        if (!String(formData.title || '').trim()) { setActiveTab('details'); throw new Error('Challenge Title is required'); }
        if (!formData.difficulty) { setActiveTab('details'); throw new Error('Difficulty is required'); }
        if (!formData.topic_id) { setActiveTab('details'); throw new Error('Primary Topic is required'); }
        if (!formData.points) { setActiveTab('details'); throw new Error('Competitive Points is required'); }
        if (!String(formData.description || '').trim()) { setActiveTab('content'); throw new Error('Problem Description is required'); }
        if (!String(formData.constraints || '').trim()) { setActiveTab('content'); throw new Error('Constraints are required'); }
        if (!String(formData.input_format || '').trim()) { setActiveTab('content'); throw new Error('Input Format is required'); }
        if (!String(formData.output_format || '').trim()) { setActiveTab('content'); throw new Error('Output Format is required'); }
        
        const completeExamples = formData.examples.filter(ex => String(ex.input || '').trim() && String(ex.output || '').trim());
        if (completeExamples.length === 0) {
          setActiveTab('content');
          throw new Error('At least 1 complete Example (with Input and Output) is required');
        }

        const missingStarterCode = formData.supported_languages.find(lang => !formData.starter_code[lang] || !String(formData.starter_code[lang]).trim());
        if (missingStarterCode) {
          setActiveTab('startercode');
          throw new Error(`Starter Code for ${missingStarterCode} is missing`);
        }

        if (cleanTestCases.length < 1) {
          setActiveTab('testcases');
          throw new Error('At least 1 valid Test Case (with Input and Expected Output) is required');
        }
      }

      const payload = {
        ...formData,
        status: targetStatus,
        hints: cleanHints,
        test_cases: cleanTestCases,
        topic_id: formData.topic_id && String(formData.topic_id).trim() ? formData.topic_id : undefined,
        pattern_id: formData.pattern_id && String(formData.pattern_id).trim() ? formData.pattern_id : undefined,
        assigned_date: formData.assigned_date && String(formData.assigned_date).trim() ? formData.assigned_date.trim() : null,
        points: Number(formData.points) || 100,
        estimated_time: Number(formData.estimated_time) || 30,
        created_via: questionToEdit ? (formData.created_via || 'manual') : 'manual',
        starter_code: formData.starter_code,
        reference_solution: formData.reference_solution,
        editorial: formData.editorial || formData.solution_approach,
        solution_approach: formData.editorial || formData.solution_approach
      };

      if (questionToEdit) {
        await api.updateQuestion(questionToEdit.id, payload);
      } else {
        await api.createQuestion(payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save Question');
    } finally {
      setLoading(false);
    }
  };

  const modalCardRef = useRef(null);

  useEffect(() => {
    if (modalCardRef.current) {
      modalCardRef.current.scrollLeft = 0;
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/50 dark:bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto overflow-x-hidden">
      <div 
        ref={modalCardRef}
        onScroll={(e) => {
          if (e.currentTarget.scrollLeft !== 0) {
            e.currentTarget.scrollLeft = 0;
          }
        }}
        className="bg-theme-surface border-0 sm:border border-theme-border rounded-none sm:rounded-3xl w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden overflow-x-hidden animate-slide-up relative min-w-0 sm:m-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between bg-theme-surface shrink-0 min-w-0 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Flame className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-theme-text1">
                  {questionToEdit ? 'Edit Question' : 'Create New Question'}
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-semibold">
                  Competitive DSA
                </span>
              </div>
              <p className="text-xs text-theme-text2">
                Independent competitive challenge &middot; never mixed with Practice problems
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">


            <button
              onClick={onClose}
              className="p-2 rounded-xl text-theme-text2 hover:text-theme-text1 hover:bg-theme-surface2 transition-colors"
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

        
          <div className="flex-1 flex flex-col overflow-hidden overflow-x-hidden min-w-0 w-full">
            {/* Sub-tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-theme-border bg-theme-surface shrink-0 overflow-x-auto custom-scrollbar min-w-0 w-full">
              {[
                { id: 'details', label: 'Basic Details', icon: Sliders },
                { id: 'content', label: 'Statement & Examples', icon: BookOpen },
                { id: 'startercode', label: 'Starter Code', icon: FileCode2 },
                { id: 'referencesolution', label: 'Reference Solution', icon: Code2 },
                { id: 'testcases', label: `Test Cases (${formData.test_cases.length})`, icon: CheckCircle2 },
                { id: 'hints_editorial', label: 'Hints & Editorial', icon: Lightbulb }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'border-amber-400 text-amber-500 dark:text-amber-400'
                      : 'border-transparent text-theme-text2 hover:text-theme-text1'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-6 space-y-5 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 min-w-0 w-full">
              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-4 min-w-0 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 w-full">
                    <div className="sm:col-span-2 min-w-0">
                      <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Challenge Title *</label>
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

                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Problem Slug (Optional)</label>
                      <input
                        type="text"
                        name="slug"
                        placeholder="e.g. longest-substring-k-distinct"
                        value={formData.slug}
                        onChange={handleFormChange}
                        className="input-field w-full text-xs font-mono"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Difficulty *</label>
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

                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Primary Topic *</label>
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
                      <div className="col-span-full min-w-0">
                        <label className="block text-xs font-semibold text-amber-600 dark:text-amber-300 mb-1.5">Custom Topic Name *</label>
                        <input
                          type="text"
                          name="custom_topic"
                          placeholder="e.g. Quantum Algorithms, Trie Hashing"
                          value={formData.custom_topic || ''}
                          onChange={handleFormChange}
                          className="input-field w-full text-xs border-amber-500/40 text-theme-text1"
                        />
                      </div>
                    )}

                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Algorithm Pattern (Optional)</label>
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

                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Competitive Points</label>
                      <input
                        type="number"
                        name="points"
                        min="10"
                        max="500"
                        value={formData.points}
                        onChange={handleFormChange}
                        className="input-field w-full text-xs font-mono font-bold text-amber-500"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Assigned Date (Optional)</label>
                      <input
                        type="date"
                        name="assigned_date"
                        value={formData.assigned_date}
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-theme-text2">Problem Description *</label>
                      <button type="button" onClick={() => handleSectionRecommend('statement')} disabled={sectionLoading === 'statement'} className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-semibold transition-all">
                        {sectionLoading === 'statement' ? <RefreshCw className="w-3 h-3 animate-spin text-cyan-500" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                        {sectionLoading === 'statement' ? 'Analyzing...' : 'AI Recommend'}
                      </button>
                    </div>
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
                      <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Constraints *</label>
                      <textarea
                        rows={3}
                        name="constraints"
                        placeholder="e.g. 1 <= nums.length <= 10^5&#10;-10^4 <= nums[i] <= 10^4"
                        value={formData.constraints}
                        onChange={handleFormChange}
                        className="input-field w-full text-xs font-mono resize-none"
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Input Format *</label>
                        <textarea
                          rows={2}
                          name="input_format"
                          placeholder="Describe the standard input format..."
                          value={formData.input_format}
                          onChange={handleFormChange}
                          className="input-field w-full text-xs font-mono resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Output Format *</label>
                        <textarea
                          rows={2}
                          name="output_format"
                          placeholder="Describe the expected output format..."
                          value={formData.output_format}
                          onChange={handleFormChange}
                          className="input-field w-full text-xs font-mono resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Examples Builder */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-theme-text2 font-mono">
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
                      <div key={idx} className="p-3.5 rounded-2xl bg-theme-surface border border-theme-border space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono text-theme-text2">
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

              {/* TAB 3: STARTER CODE */}
              {activeTab === 'startercode' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-theme-text2 font-mono">Starter Code</h4>
                      <p className="text-[11px] text-theme-text2">Required starting code snippet for each supported language. Must be syntactically valid.</p>
                    </div>
                    <button type="button" onClick={() => handleSectionRecommend('startercode')} disabled={sectionLoading === 'startercode'} className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-semibold transition-all">
                      {sectionLoading === 'startercode' ? <RefreshCw className="w-3 h-3 animate-spin text-cyan-500" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                      {sectionLoading === 'startercode' ? 'Analyzing...' : 'AI Recommend'}
                    </button>
                  </div>
                  {formData.supported_languages.map(lang => (
                    <div key={lang} className="p-4 rounded-2xl bg-theme-surface border border-theme-border">
                      <div className="flex items-center gap-2 mb-2 text-xs font-bold capitalize text-amber-500">
                        <FileCode2 className="w-4 h-4" /> {lang} *
                      </div>
                      <textarea
                        rows={6}
                        value={formData.starter_code[lang] || ''}
                        onChange={(e) => handleStarterCodeChange(lang, e.target.value)}
                        placeholder={`// Starter code for ${lang}`}
                        className="input-field w-full text-xs font-mono bg-theme-surface2 border-0 focus:ring-1 focus:ring-amber-500/50 resize-y"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: REFERENCE SOLUTION */}
              {activeTab === 'referencesolution' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-theme-text2 font-mono">Reference Solution (Optional)</h4>
                      <p className="text-[11px] text-theme-text2">Working solution. Securely stored, never exposed to students.</p>
                    </div>
                    <button type="button" onClick={() => handleSectionRecommend('referencesolution')} disabled={sectionLoading === 'referencesolution'} className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-semibold transition-all">
                      {sectionLoading === 'referencesolution' ? <RefreshCw className="w-3 h-3 animate-spin text-cyan-500" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                      {sectionLoading === 'referencesolution' ? 'Analyzing...' : 'AI Recommend'}
                    </button>
                  </div>
                  {formData.supported_languages.map(lang => (
                    <div key={lang} className="p-4 rounded-2xl bg-theme-surface border border-theme-border">
                      <div className="flex items-center gap-2 mb-2 text-xs font-bold capitalize text-emerald-500">
                        <Code2 className="w-4 h-4" /> {lang} (Optional)
                      </div>
                      <textarea
                        rows={6}
                        value={formData.reference_solution?.[lang] || ''}
                        onChange={(e) => handleReferenceSolutionChange(lang, e.target.value)}
                        placeholder={`// Complete working solution for ${lang} (optional)`}
                        className="input-field w-full text-xs font-mono bg-emerald-500/5 border-emerald-500/20 focus:ring-1 focus:ring-emerald-500/50 resize-y"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 5: TEST CASES */}
              {activeTab === 'testcases' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-theme-text2 font-mono">Test Cases & Verification</h4>
                      <p className="text-[11px] text-theme-text2">Provide sample public tests and edge-case hidden evaluation tests.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSectionRecommend('testcases')}
                        disabled={sectionLoading === 'testcases'}
                        className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                      >
                        {sectionLoading === 'testcases' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Generate Test Cases
                      </button>
                      <button
                        type="button"
                        onClick={addTestCase}
                        className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Test Case
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {formData.test_cases.map((tc, idx) => (
                      <div key={tc.id || idx} className="p-4 rounded-2xl bg-theme-surface border border-theme-border space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-theme-text2">Test Case #{idx + 1}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              tc.is_hidden
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {tc.is_hidden ? '🔒 Hidden' : '👁️ Public Example'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-theme-text2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tc.is_hidden}
                                onChange={(e) => handleTestCaseChange(idx, 'is_hidden', e.target.checked)}
                                className="rounded bg-theme-surface border-theme-border text-amber-500 focus:ring-0"
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
                            <label className="block text-[11px] font-semibold text-theme-text2 mb-1">Standard Input</label>
                            <textarea
                              rows={2}
                              value={tc.input}
                              placeholder="Raw input string or JSON array"
                              onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                              className="input-field w-full text-xs font-mono resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-theme-text2 mb-1">Expected Output</label>
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
                      <label className="text-xs font-bold uppercase text-theme-text2 font-mono">
                        Progressive Hints ({formData.hints.length})
                      </label>
                      <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSectionRecommend('hintseditorial')}
                        disabled={sectionLoading === 'hintseditorial'}
                        className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                      >
                        {sectionLoading === 'hintseditorial' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Generate Hints
                      </button>
                      <button
                        type="button"
                        onClick={addHint}
                        className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Hint
                      </button>
                    </div>
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
                            className="p-1.5 text-theme-text3 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Solution Approach / Editorial */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-theme-text2 mb-1.5">
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
                    <label className="block text-xs font-semibold text-theme-text2 mb-1.5">Complexity Analysis</label>
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
            <div className="px-6 py-4 border-t border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-theme-surface shrink-0 min-w-0 w-full">
              <div className="text-[11px] text-theme-text2 flex items-center gap-2 min-w-0">
                <span>Status: <strong className="text-amber-500 capitalize">{formData.status}</strong></span>
                {formData.assigned_date && <span>&middot; Scheduled: <strong className="text-cyan-500 font-mono">{formData.assigned_date}</strong></span>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
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
                  onClick={() => handleSubmit(formData.assigned_date ? 'scheduled' : 'published')}
                  className="btn-primary text-xs inline-flex items-center gap-1.5 px-5 py-2 font-bold shadow-md shadow-cyan-500/20 text-white"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{formData.assigned_date ? 'Save & Schedule' : 'Save & Publish'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
  );
}
