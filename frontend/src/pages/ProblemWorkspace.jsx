import React, { useState, useEffect, useRef } from 'react';
import {
  Play, CheckCircle2, AlertTriangle, RotateCcw, Code, Github, Zap,
  HelpCircle, FileCode, Check, Copy, ArrowLeft, Terminal as TerminalIcon,
  History, Edit3, XCircle, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../services/api';
import { practiceApi } from '../services/practiceApi';

const FILE_EXTENSIONS = {
  javascript: 'solution.js', python: 'solution.py', typescript: 'solution.ts',
  java: 'Main.java', cpp: 'solution.cpp', c: 'solution.c'
};

export function getStarterCodeForQuestion(question, language) {
  const lang = String(language || 'javascript').toLowerCase();
  if (question?.starter_code) {
    try {
      const sc = typeof question.starter_code === 'string'
        ? JSON.parse(question.starter_code)
        : question.starter_code;
      if (sc && sc[lang] && typeof sc[lang] === 'string' && sc[lang].trim()) return sc[lang];
    } catch {}
  }
  const title = question?.title || 'Coding Challenge';
  const templates = {
    javascript: `// Problem: ${title}\nconst fs = require('fs');\nfunction solve(input) {\n  // TODO: Implement your solution\n  return input;\n}\nconst raw = fs.readFileSync(0, 'utf-8').trim();\nif (raw) {\n  const result = solve(raw);\n  console.log(typeof result === 'object' ? JSON.stringify(result) : result);\n}\n`,
    python: `# Problem: ${title}\nimport sys\nimport json\n\ndef solve(raw_input: str):\n    # TODO: Implement your solution\n    return raw_input\n\nif __name__ == '__main__':\n    data = sys.stdin.read().strip()\n    if data:\n        res = solve(data)\n        if isinstance(res, (list, dict)):\n            print(json.dumps(res, separators=(',', ':')))\n        elif res is not None:\n            print(res)\n`,
    typescript: `// Problem: ${title}\nimport * as fs from 'fs';\nfunction solve(input: string): any {\n  // TODO: Implement your solution\n  return input;\n}\nconst raw = fs.readFileSync(0, 'utf-8').trim();\nif (raw) {\n  const result = solve(raw);\n  console.log(typeof result === 'object' ? JSON.stringify(result) : result);\n}\n`,
    java: `// Problem: ${title}\nimport java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String line = sc.nextLine().trim();\n        // TODO: Implement your solution\n        System.out.println(line);\n    }\n}\n`,
    cpp: `// Problem: ${title}\n#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\nusing namespace std;\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string input;\n    if (getline(cin, input)) {\n        // TODO: Implement your solution\n        cout << input << "\\n";\n    }\n    return 0;\n}\n`,
    c: `// Problem: ${title}\n#include <stdio.h>\n#include <string.h>\nint main() {\n    char input[4096];\n    if (fgets(input, sizeof(input), stdin)) {\n        // TODO: Implement your solution\n        printf("%s\\n", input);\n    }\n    return 0;\n}\n`
  };
  return templates[lang] || templates.javascript;
}

const STATUS_CONFIG = {
  'Accepted':            { icon: CheckCircle2,  cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  'Wrong Answer':        { icon: XCircle,        cls: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' },
  'Time Limit Exceeded': { icon: Clock,          cls: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  'Runtime Error':       { icon: AlertTriangle,  cls: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
  'Compilation Error':   { icon: AlertTriangle,  cls: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
};

export default function ProblemWorkspace({ questionId, onBack, onStatusUpdated }) {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [sourceCode, setSourceCode] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState('code');
  const [githubUrl, setGithubUrl] = useState('');
  const [isSubmittingGithub, setIsSubmittingGithub] = useState(false);
  const [githubSuccessMessage, setGithubSuccessMessage] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [execResult, setExecResult] = useState(null);
  const [selectedTestCaseTab, setSelectedTestCaseTab] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [leftTab, setLeftTab] = useState('description');
  const [bottomTab, setBottomTab] = useState('testcases');
  const [copied, setCopied] = useState(false);
  const [pastSubmissions, setPastSubmissions] = useState([]);
  const [bottomOpen, setBottomOpen] = useState(true);
  const editorRef = useRef(null);

  useEffect(() => { loadProblemData(); }, [questionId]);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning && !isSubmitting && submissionMethod === 'code') handleSubmitSolution();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning && !isSubmitting && submissionMethod === 'code') handleRunCode();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isSubmitting, submissionMethod, sourceCode, language, customInput, bottomTab]);

  async function loadProblemData() {
    setLoading(true);
    setError(null);
    try {
      const [qRes, subRes] = await Promise.all([
        api.getQuestionById(questionId),
        api.getCodeSubmissions(questionId).catch(() => ({ data: [] }))
      ]);
      const q = qRes.data;
      setQuestion(q);
      setPastSubmissions(subRes.data || []);
      if (q.is_practice) {
        practiceApi.start(questionId).catch(e => console.warn('Practice start:', e));
      }
      setSourceCode(getStarterCodeForQuestion(q, language));
    } catch (err) {
      setError(err.message || 'Failed to load question');
    } finally {
      setLoading(false);
    }
  }

  function handleLanguageChange(newLang) {
    setLanguage(newLang);
    setSourceCode(getStarterCodeForQuestion(question, newLang));
  }

  function handleResetCode() {
    if (window.confirm('Reset code to template?')) {
      setSourceCode(getStarterCodeForQuestion(question, language));
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRunCode() {
    setIsRunning(true);
    setExecResult(null);
    setBottomTab('results');
    setBottomOpen(true);
    try {
      const res = await api.runCode({
        question_id: questionId,
        language,
        source_code: sourceCode,
        custom_input: bottomTab === 'custom' && customInput.trim() ? customInput : undefined
      });
      setExecResult(res.data);
    } catch (err) {
      setExecResult({
        status: 'Runtime Error',
        passed_tests: 0,
        total_tests: 1,
        execution_time_ms: 0,
        results: [{ test_index: 1, status: 'Runtime Error', actual_output: '', stderr: err.message || 'Execution error' }]
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmitSolution() {
    setIsSubmitting(true);
    setExecResult(null);
    setBottomTab('results');
    setBottomOpen(true);
    try {
      const res = await api.submitCode({ question_id: questionId, language, source_code: sourceCode });
      setExecResult(res.data);
      if (res.data.status === 'Accepted' && onStatusUpdated) onStatusUpdated();
      const subRes = await api.getCodeSubmissions(questionId).catch(() => ({ data: [] }));
      setPastSubmissions(subRes.data || []);
    } catch (err) {
      setExecResult({
        status: 'Runtime Error',
        passed_tests: 0,
        total_tests: 1,
        execution_time_ms: 0,
        results: [{ test_index: 1, status: 'Runtime Error', actual_output: '', stderr: err.message || 'Execution error' }]
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitGithub(e) {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    setIsSubmittingGithub(true);
    setGithubSuccessMessage(null);
    try {
      await api.submitChallenge({ question_id: questionId, submission_type: 'github', github_url: githubUrl.trim() });
      setGithubSuccessMessage('GitHub submission received! Queued for mentor review.');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      alert(err.message || 'Failed to submit GitHub link.');
    } finally {
      setIsSubmittingGithub(false);
    }
  }

  const hintsList = React.useMemo(() => {
    if (!question?.hints) return [];
    if (Array.isArray(question.hints)) return question.hints.filter(Boolean).map(String);
    if (typeof question.hints === 'string') {
      const trimmed = question.hints.trim();
      if (!trimmed || trimmed === '[]') return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
        if (typeof parsed === 'string' && parsed.trim() && parsed !== '[]') return [parsed.trim()];
      } catch {
        return [trimmed];
      }
    }
    return [];
  }, [question?.hints]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-8 h-8 border-[3px] border-axly-500/20 border-t-axly-500 rounded-full animate-spin" />
        <div className="text-xs text-slate-500 font-mono">Loading workspace...</div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <div>
          <h2 className="text-base font-bold text-white mb-1">Failed to load problem</h2>
          <p className="text-sm text-slate-400">{error || 'Could not load problem statement.'}</p>
        </div>
        <button onClick={onBack} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Practice
        </button>
      </div>
    );
  }

  const diffBadge = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' };
  const sampleTestCases = question.test_cases || [];
  const isPractice = Boolean(question.is_practice);
  const currentFileName = FILE_EXTENSIONS[language] || `solution.${language}`;
  const statusCfg = execResult ? STATUS_CONFIG[execResult.status] : null;

  return (
    <div className="flex flex-col bg-[#070B14]" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Top header */}
      <div className="h-12 border-b border-[#1a2540] bg-[#0a1120] px-4 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="btn-ghost btn-sm inline-flex items-center gap-1.5 shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" /> Practice
        </button>
        <div className="h-4 w-px bg-[#1a2540] shrink-0" />
        <h1 className="text-sm font-semibold text-white truncate flex-1 min-w-0">{question.title}</h1>
        <span className={`${diffBadge[question.difficulty] || 'badge-neutral'} shrink-0`}>{question.difficulty}</span>
        {isPractice
          ? <span className="hidden sm:inline-flex badge badge-neutral shrink-0">Practice &middot; 0 pts</span>
          : <span className="hidden sm:inline-flex badge badge-prog shrink-0">+{question.points || 20} pts</span>
        }

        <div className="hidden sm:flex bg-[#0d1525] border border-[#1a2540] rounded p-0.5 gap-0.5 shrink-0">
          <button
            onClick={() => setSubmissionMethod('code')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${submissionMethod === 'code' ? 'bg-axly-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Code className="w-3.5 h-3.5" /> Code
          </button>
          <button
            onClick={() => setSubmissionMethod('github')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${submissionMethod === 'github' ? 'bg-axly-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Github className="w-3.5 h-3.5" /> GitHub
          </button>
        </div>

        {submissionMethod === 'code' && (
          <>
            <select
              value={language}
              onChange={e => handleLanguageChange(e.target.value)}
              className="bg-[#0d1525] border border-[#1a2540] text-slate-200 text-xs rounded px-2.5 py-1 focus:outline-none focus:border-axly-500 shrink-0 font-medium"
            >
              <option value="javascript">JavaScript (Node 20)</option>
              <option value="python">Python 3.11</option>
              <option value="typescript">TypeScript 5</option>
              <option value="java">Java 21</option>
              <option value="cpp">C++ 20</option>
              <option value="c">C (GCC 13)</option>
            </select>
            <button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting}
              title="Run (Ctrl+Enter)"
              className="btn-secondary btn-sm inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button
              onClick={handleSubmitSolution}
              disabled={isRunning || isSubmitting}
              title="Submit (Ctrl+Shift+Enter)"
              className="btn-primary btn-sm inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </>
        )}
      </div>

      {/* Main workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Problem */}
        <div className="lg:col-span-5 border-r border-[#1a2540] flex flex-col overflow-hidden">
          <div className="tab-bar px-3 shrink-0">
            <button onClick={() => setLeftTab('description')} className={`tab-btn ${leftTab === 'description' ? 'tab-btn-active' : ''}`}>
              <FileCode className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />Description
            </button>
            <button onClick={() => setLeftTab('hints')} className={`tab-btn ${leftTab === 'hints' ? 'tab-btn-active' : ''}`}>
              <HelpCircle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Hints{hintsList.length > 0 && ` (${hintsList.length})`}
            </button>
            <button onClick={() => setLeftTab('submissions')} className={`tab-btn ${leftTab === 'submissions' ? 'tab-btn-active' : ''}`}>
              <History className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Submissions{pastSubmissions.length > 0 && ` (${pastSubmissions.length})`}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
            {leftTab === 'description' && (
              <>
                <div className="problem-prose whitespace-pre-line">
                  {question.description || question.problem_statement || 'No description provided.'}
                </div>
                {question.constraints && (
                  <div className="space-y-2 pt-4 border-t border-[#1a2540]">
                    <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Constraints
                    </div>
                    <pre className="p-3 rounded-md bg-[#0a1120] border border-[#1a2540] text-amber-200/80 font-mono text-[11px] whitespace-pre-line overflow-x-auto">
                      {question.constraints}
                    </pre>
                  </div>
                )}
                {sampleTestCases.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-[#1a2540]">
                    <div className="text-xs font-semibold text-slate-300">Examples</div>
                    {sampleTestCases.slice(0, 3).map((tc, idx) => (
                      <div key={idx} className="p-3 rounded-md bg-[#0a1120] border border-[#1a2540] font-mono text-xs space-y-1.5">
                        <div className="text-slate-500 font-semibold">Example {idx + 1}</div>
                        <div><span className="text-slate-500">Input: </span><span className="text-axly-300">{tc.input?.replace(/\n/g, ' ')}</span></div>
                        <div><span className="text-slate-500">Output: </span><span className="text-emerald-400">{tc.expected_output}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {leftTab === 'hints' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-axly-400 text-xs font-semibold">
                    <HelpCircle className="w-4 h-4" /> Hints
                  </div>
                  {hintsList.length > 0 && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      {hintsList.length} {hintsList.length === 1 ? 'hint' : 'hints'} available
                    </span>
                  )}
                </div>
                {hintsList.length === 0 ? (
                  <div className="p-6 rounded-lg bg-[#0a1120] border border-[#1a2540] text-center text-slate-400 text-sm">
                    No hints available for this problem yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hintsList.map((hint, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-[#0a1120] border border-[#1a2540] space-y-2">
                        <div className="text-xs font-semibold text-axly-300 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-axly-500/20 text-axly-400 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          Hint {idx + 1}
                        </div>
                        <div className="problem-prose text-xs text-slate-300 whitespace-pre-line pl-7">
                          {hint}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {leftTab === 'submissions' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submission History</div>
                {pastSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 text-sm">No submissions yet.</div>
                ) : (
                  pastSubmissions.map((sub, idx) => {
                    const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG['Runtime Error'];
                    const StatusIcon = cfg.icon;
                    return (
                      <div key={sub.id || idx} className="p-3 rounded-md bg-[#0a1120] border border-[#1a2540] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold flex items-center gap-1.5 ${cfg.cls}`}>
                            <StatusIcon className="w-3.5 h-3.5" /> {sub.status}
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono">{sub.created_at || '—'}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex gap-3">
                          <span>{sub.passed_tests}/{sub.total_tests} passed</span>
                          <span>{sub.execution_time_ms || 0} ms</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Code editor */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[#070B14]">
          {submissionMethod === 'code' ? (
            <>
              <div className="h-9 border-b border-[#1a2540] px-3 bg-[#0a1120] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <Edit3 className="w-3.5 h-3.5 text-axly-400" />
                  <span className="text-slate-400 font-mono">{currentFileName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={handleCopyCode} className="btn-ghost btn-sm p-1.5" title="Copy code" aria-label="Copy code">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={handleResetCode} className="btn-ghost btn-sm p-1.5 hover:text-rose-400" title="Reset code" aria-label="Reset code">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden cursor-text" onClick={() => editorRef.current?.focus()}>
                <textarea
                  ref={editorRef}
                  id="code-editor-textarea"
                  aria-label="Code editor"
                  value={sourceCode}
                  onChange={e => setSourceCode(e.target.value)}
                  spellCheck={false}
                  placeholder="// Write your solution here..."
                  className="w-full h-full p-4 bg-[#070B14] text-axly-100 code-editor focus:outline-none resize-none custom-scrollbar"
                />
              </div>

              <div className="border-t border-[#1a2540] bg-[#0a1120] flex flex-col shrink-0" style={{ height: bottomOpen ? '260px' : '36px' }}>
                <div className="h-9 border-b border-[#1a2540] px-3 flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-0 flex-1">
                    <button onClick={() => setBottomTab('testcases')} className={`tab-btn py-1 ${bottomTab === 'testcases' ? 'tab-btn-active' : ''}`}>
                      Test Cases ({sampleTestCases.length})
                    </button>
                    <button onClick={() => setBottomTab('results')} className={`tab-btn py-1 ${bottomTab === 'results' ? 'tab-btn-active' : ''}`}>
                      Results
                      {execResult && <span className={`ml-1 text-[10px] font-bold ${statusCfg?.cls || ''}`}>{execResult.status}</span>}
                    </button>
                    <button onClick={() => setBottomTab('custom')} className={`tab-btn py-1 ${bottomTab === 'custom' ? 'tab-btn-active' : ''}`}>
                      Custom Input
                    </button>
                  </div>
                  <button onClick={() => setBottomOpen(!bottomOpen)} className="btn-ghost btn-sm p-1" aria-label="Toggle panel">
                    {bottomOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {bottomOpen && (
                  <div className="flex-1 overflow-y-auto p-3 custom-scrollbar text-xs">
                    {bottomTab === 'testcases' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {sampleTestCases.map((_, idx) => (
                            <button key={idx} onClick={() => setSelectedTestCaseTab(idx)}
                              className={`px-3 py-1 rounded font-mono text-xs transition-colors ${selectedTestCaseTab === idx ? 'bg-axly-600 text-white' : 'bg-[#0d1525] text-slate-400 hover:text-slate-200'}`}>
                              Case {idx + 1}
                            </button>
                          ))}
                        </div>
                        {sampleTestCases[selectedTestCaseTab] && (
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <div className="text-[10px] text-slate-500 font-semibold mb-1">Input</div>
                              <pre className="p-2.5 rounded bg-[#0a1120] border border-[#1a2540] text-axly-200 font-mono text-[11px] whitespace-pre-wrap">
                                {sampleTestCases[selectedTestCaseTab].input}
                              </pre>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500 font-semibold mb-1">Expected Output</div>
                              <pre className="p-2.5 rounded bg-[#0a1120] border border-[#1a2540] text-emerald-300 font-mono text-[11px] whitespace-pre-wrap">
                                {sampleTestCases[selectedTestCaseTab].expected_output}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {bottomTab === 'results' && (
                      <div>
                        {(isRunning || isSubmitting) ? (
                          <div className="flex items-center gap-2 text-slate-400 py-6 justify-center">
                            <div className="w-4 h-4 border-2 border-axly-500/20 border-t-axly-500 rounded-full animate-spin" />
                            <span>{isRunning ? 'Running tests...' : 'Evaluating submission...'}</span>
                          </div>
                        ) : !execResult ? (
                          <div className="text-center py-8 text-slate-600">
                            Click <strong className="text-slate-400">Run</strong> or <strong className="text-slate-400">Submit</strong> to see results.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className={`flex items-center justify-between p-3 rounded-md border ${statusCfg?.bg || 'bg-[#0d1525] border-[#1a2540]'}`}>
                              <div className={`flex items-center gap-2 font-semibold text-sm ${statusCfg?.cls || 'text-slate-300'}`}>
                                {statusCfg && <statusCfg.icon className="w-4 h-4" />}
                                {execResult.status}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-3">
                                <span>{execResult.passed_tests}/{execResult.total_tests} tests passed</span>
                                {execResult.execution_time_ms !== undefined && (
                                  <span className="font-mono">{execResult.execution_time_ms}ms</span>
                                )}
                              </div>
                            </div>
                            {execResult.results?.map((r, i) => (
                              <div key={i} className="p-2.5 rounded-md bg-[#0a1120] border border-[#1a2540] font-mono text-[11px] space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-semibold">Test {r.test_index}</span>
                                  <span className={`font-bold ${r.status === 'Passed' || r.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {r.status}
                                  </span>
                                </div>
                                {r.input && r.input !== '[Hidden Test Case]' && (
                                  <div><span className="text-slate-600">In: </span><span className="text-axly-300">{r.input}</span></div>
                                )}
                                {r.expected_output && r.expected_output !== '[Hidden Output]' && (
                                  <div><span className="text-slate-600">Expected: </span><span className="text-emerald-400">{r.expected_output}</span></div>
                                )}
                                {r.actual_output && (
                                  <div><span className="text-slate-600">Got: </span><span className="text-white">{r.actual_output}</span></div>
                                )}
                                {r.stderr && (
                                  <div className="text-rose-300 whitespace-pre-wrap mt-1 p-2 rounded bg-rose-950/30 border border-rose-900/20">{r.stderr}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {bottomTab === 'custom' && (
                      <div className="space-y-2">
                        <label htmlFor="custom-stdin" className="text-[11px] text-slate-400 font-semibold block">Custom stdin:</label>
                        <textarea
                          id="custom-stdin"
                          rows={4}
                          value={customInput}
                          onChange={e => setCustomInput(e.target.value)}
                          placeholder="Enter custom input..."
                          className="input-field font-mono text-xs text-axly-200"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center space-y-5 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-xl bg-[#0d1525] border border-[#1a2540] flex items-center justify-center">
                <Github className="w-7 h-7 text-slate-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Submit via GitHub</h3>
                <p className="text-sm text-slate-400">Link to your public repository or solution file for mentor review.</p>
              </div>
              <form onSubmit={handleSubmitGithub} className="w-full space-y-3">
                <input
                  type="url"
                  required
                  placeholder="https://github.com/username/repo/blob/main/solution.py"
                  value={githubUrl}
                  onChange={e => setGithubUrl(e.target.value)}
                  className="input-field"
                />
                <button type="submit" disabled={isSubmittingGithub} className="btn-primary btn-lg w-full justify-center disabled:opacity-50">
                  {isSubmittingGithub ? 'Submitting...' : 'Submit Repository Link'}
                </button>
              </form>
              {githubSuccessMessage && (
                <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  {githubSuccessMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
