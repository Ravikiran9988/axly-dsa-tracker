import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Code,
  Github,
  Zap,
  HelpCircle,
  FileCode,
  Check,
  Copy,
  ArrowLeft,
  Terminal as TerminalIcon,
  History,
  Edit3
} from 'lucide-react';
import { api } from '../services/api';
import { practiceApi } from '../services/practiceApi';

const FILE_EXTENSIONS = {
  javascript: 'solution.js',
  python: 'solution.py',
  typescript: 'solution.ts',
  java: 'Main.java',
  cpp: 'solution.cpp',
  c: 'solution.c'
};

export function getStarterCodeForQuestion(question, language) {
  const lang = String(language || 'javascript').toLowerCase();
  if (question?.starter_code) {
    try {
      const sc = typeof question.starter_code === 'string' ? JSON.parse(question.starter_code) : question.starter_code;
      if (sc && sc[lang] && typeof sc[lang] === 'string' && sc[lang].trim()) {
        return sc[lang];
      }
    } catch {}
  }

  const title = question?.title || 'Coding Challenge';

  const templates = {
    javascript: `// Problem: ${title}\n// Write your solution below. Input is provided via standard input (stdin).\nconst fs = require('fs');\n\nfunction solve(input) {\n  // TODO: Implement your solution here\n  return input;\n}\n\nconst raw = fs.readFileSync(0, 'utf-8').trim();\nif (raw) {\n  const result = solve(raw);\n  console.log(typeof result === 'object' ? JSON.stringify(result) : result);\n}\n`,
    python: `# Problem: ${title}\n# Write your solution below. Input is provided via standard input (stdin).\nimport sys\nimport json\n\ndef solve(raw_input: str):\n    # TODO: Implement your solution here\n    return raw_input\n\nif __name__ == '__main__':\n    data = sys.stdin.read().strip()\n    if data:\n        res = solve(data)\n        if isinstance(res, (list, dict)):\n            print(json.dumps(res, separators=(',', ':')))\n        elif res is not None:\n            print(res)\n`,
    typescript: `// Problem: ${title}\n// Write your solution below. Input is provided via standard input (stdin).\nimport * as fs from 'fs';\n\nfunction solve(input: string): any {\n  // TODO: Implement your solution here\n  return input;\n}\n\nconst raw = fs.readFileSync(0, 'utf-8').trim();\nif (raw) {\n  const result = solve(raw);\n  console.log(typeof result === 'object' ? JSON.stringify(result) : result);\n}\n`,
    java: `// Problem: ${title}\n// Write your solution below. Input is provided via standard input (stdin).\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLine()) return;\n        String line = sc.nextLine().trim();\n        \n        // TODO: Implement your solution here\n        System.out.println(line);\n    }\n}\n`,
    cpp: `// Problem: ${title}\n// Write your solution below. Input is provided via standard input (stdin).\n#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    \n    string input;\n    if (getline(cin, input)) {\n        // TODO: Implement your solution here\n        cout << input << "\\n";\n    }\n    return 0;\n}\n`,
    c: `// Problem: ${title}\n// Write your solution below. Input is provided via standard input (stdin).\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    char input[4096];\n    if (fgets(input, sizeof(input), stdin)) {\n        // TODO: Implement your solution here\n        printf("%s\\n", input);\n    }\n    return 0;\n}\n`
  };

  return templates[lang] || templates.javascript;
}

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
  const editorRef = useRef(null);

  useEffect(() => {
    loadProblemData();
  }, [questionId]);

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
        try {
          await practiceApi.start(questionId);
        } catch (e) {
          console.warn('Practice start could not be recorded:', e);
        }
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
    if (window.confirm('Reset code to default template for this problem?')) {
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
    try {
      const res = await api.submitCode({
        question_id: questionId,
        language,
        source_code: sourceCode
      });
      setExecResult(res.data);
      if (res.data.status === 'Accepted' && onStatusUpdated) {
        onStatusUpdated();
      }
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
      await api.submitChallenge({
        question_id: questionId,
        submission_type: 'github',
        github_url: githubUrl.trim()
      });
      setGithubSuccessMessage('GitHub submission received! Your code is queued for mentor code review.');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      alert(err.message || 'Failed to submit GitHub link.');
    } finally {
      setIsSubmittingGithub(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-slate-400">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <div className="text-xs font-mono">Initializing Sandboxed Problem Environment...</div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Failed to load challenge</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'Could not load problem statement.'}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Practice
        </button>
      </div>
    );
  }

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const sampleTestCases = question.test_cases || [];
  const isPractice = Boolean(question.is_practice);
  const currentFileName = FILE_EXTENSIONS[language] || `solution.${language}`;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#070B14]">
      {/* Top Header Bar */}
      <div className="min-h-[3.5rem] border-b border-slate-800/80 bg-[#0A0F1D] px-4 flex items-center justify-between gap-3 shrink-0 z-20 relative">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 text-xs font-medium shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Practice</span>
          </button>
          <div className="h-4 w-px bg-slate-800 shrink-0" />
          <h1 className="text-sm font-bold text-white truncate max-w-xs md:max-w-md">
            {question.title}
          </h1>
          <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md border shrink-0 ${difficultyColors[question.difficulty] || difficultyColors.easy}`}>
            {question.difficulty}
          </span>
          {isPractice ? (
            <span className="hidden sm:inline-flex text-xs text-slate-300 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-md shrink-0">
              Practice · 0 points
            </span>
          ) : (
            <span className="hidden sm:inline-flex text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-md shrink-0">
              +{question.points || 20} pts
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setSubmissionMethod('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                submissionMethod === 'code' ? 'bg-cyan-600 text-white' : 'text-slate-400'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Code Editor
            </button>
            <button
              onClick={() => setSubmissionMethod('github')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                submissionMethod === 'github' ? 'bg-cyan-600 text-white' : 'text-slate-400'
              }`}
            >
              <Github className="w-3.5 h-3.5" /> GitHub Link
            </button>
          </div>

          {submissionMethod === 'code' && (
            <>
              <select
                id="select-language"
                value={language}
                onChange={e => handleLanguageChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="python">Python 3</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
              </select>

              <button
                id="btn-run-code"
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 text-xs font-semibold disabled:opacity-50 transition-all shadow-sm"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>

              <button
                id="btn-submit-code"
                onClick={handleSubmitSolution}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-900/20 disabled:opacity-50 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSubmitting ? 'Evaluating...' : 'Submit Solution'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace: Left Problem Info / Right Code Editor */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative z-10">
        {/* Left Column: Problem Details / Constraints / Examples / Hints */}
        <div className="lg:col-span-5 border-r border-slate-800/80 bg-[#0A0F1D]/70 flex flex-col overflow-hidden">
          <div className="h-10 border-b border-slate-800 px-3 flex items-center gap-4 bg-slate-950/40 shrink-0">
            <button
              onClick={() => setLeftTab('description')}
              className={`text-xs font-medium h-full border-b-2 flex items-center gap-1.5 ${
                leftTab === 'description' ? 'border-cyan-500 text-cyan-400 font-semibold' : 'border-transparent text-slate-400'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" /> Description
            </button>
            {question.hints && (
              <button
                onClick={() => setLeftTab('hints')}
                className={`text-xs font-medium h-full border-b-2 ${
                  leftTab === 'hints' ? 'border-cyan-500 text-cyan-400 font-semibold' : 'border-transparent text-slate-400'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 inline mr-1" />
                Hints
              </button>
            )}
            <button
              onClick={() => setLeftTab('submissions')}
              className={`text-xs font-medium h-full border-b-2 ${
                leftTab === 'submissions' ? 'border-cyan-500 text-cyan-400 font-semibold' : 'border-transparent text-slate-400'
              }`}
            >
              <History className="w-3.5 h-3.5 inline mr-1" />
              Submissions ({pastSubmissions.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5 text-xs text-slate-300">
            {leftTab === 'description' && (
              <>
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Problem Statement
                  </h3>
                  <div className="text-slate-200 leading-relaxed whitespace-pre-line text-[13px]">
                    {question.description || question.problem_statement || 'No description provided.'}
                  </div>
                </div>

                {question.constraints && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <h4 className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Constraints:
                    </h4>
                    <pre className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-amber-200/90 font-mono text-[11px] whitespace-pre-line">
                      {question.constraints}
                    </pre>
                  </div>
                )}

                {sampleTestCases.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <h4 className="font-semibold text-white">Examples:</h4>
                    {sampleTestCases.slice(0, 2).map((tc, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                        <div className="text-slate-400 font-semibold">Example #{idx + 1}</div>
                        <div>
                          <span className="text-slate-500">Input: </span>
                          <span className="text-cyan-300">{tc.input?.replace(/\n/g, ' ')}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Output: </span>
                          <span className="text-emerald-400">{tc.expected_output}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {leftTab === 'hints' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <HelpCircle className="w-4 h-4" />
                  Algorithmic Hints & Intuition
                </div>
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 leading-relaxed whitespace-pre-line text-xs">
                  {question.hints || 'No hints available for this problem.'}
                </div>
              </div>
            )}

            {leftTab === 'submissions' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Your Submission History
                </div>
                {pastSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No submissions recorded yet.</div>
                ) : (
                  pastSubmissions.map((sub, idx) => (
                    <div key={sub.id || idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          sub.status === 'Accepted' || sub.status === 'solved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {sub.status}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{sub.created_at || 'Just now'}</span>
                      </div>
                      <div className="text-slate-400 flex items-center justify-between text-[11px]">
                        <span>Passed: {sub.passed_tests}/{sub.total_tests} test cases</span>
                        <span>{sub.execution_time_ms || 0} ms</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Editor & Test Cases Area */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[#080C14]">
          {submissionMethod === 'code' ? (
            <>
              {/* Code Editor Header */}
              <div className="h-10 border-b border-slate-800 px-3 bg-slate-950/70 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-white">Code Editor</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-cyan-300 font-semibold">{currentFileName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                    Editable
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                    title="Copy code to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleResetCode}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Reset to problem template"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Code Editor Body */}
              <div
                className="flex-1 min-h-[260px] p-3 overflow-hidden bg-[#070B14] cursor-text"
                onClick={() => editorRef.current?.focus()}
              >
                <div className="w-full h-full rounded-2xl border border-slate-800 bg-[#0A0F1D] focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/20 overflow-hidden flex flex-col shadow-inner transition-all">
                  <textarea
                    ref={editorRef}
                    id="code-editor-textarea"
                    aria-label="Code Editor"
                    value={sourceCode}
                    onChange={e => setSourceCode(e.target.value)}
                    spellCheck={false}
                    placeholder="// Write your solution here..."
                    className="w-full h-full p-4 bg-transparent text-cyan-100 font-mono text-xs leading-relaxed focus:outline-none resize-none custom-scrollbar"
                  />
                </div>
              </div>

              {/* Test Cases & Evaluation Section */}
              <div className="h-60 border-t border-slate-800 bg-[#0A0F1D] flex flex-col shrink-0">
                <div className="h-10 border-b border-slate-800 px-3 flex items-center gap-4 bg-slate-950/70 text-xs shrink-0">
                  <button
                    onClick={() => setBottomTab('testcases')}
                    className={`h-full border-b-2 flex items-center gap-1.5 font-medium transition-colors ${
                      bottomTab === 'testcases' ? 'border-cyan-500 text-cyan-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Test Cases ({sampleTestCases.length})</span>
                  </button>

                  <button
                    onClick={() => setBottomTab('results')}
                    className={`h-full border-b-2 flex items-center gap-1.5 font-medium transition-colors ${
                      bottomTab === 'results' ? 'border-cyan-500 text-cyan-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <TerminalIcon className="w-3.5 h-3.5" />
                    <span>Execution Results</span>
                    {execResult && (
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        execResult.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {execResult.status}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setBottomTab('custom')}
                    className={`h-full border-b-2 flex items-center gap-1.5 font-medium transition-colors ${
                      bottomTab === 'custom' ? 'border-cyan-500 text-cyan-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Custom Stdin</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar text-xs">
                  {bottomTab === 'testcases' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {sampleTestCases.map((tc, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedTestCaseTab(idx)}
                            className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                              selectedTestCaseTab === idx ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Case #{idx + 1}
                          </button>
                        ))}
                      </div>
                      {sampleTestCases[selectedTestCaseTab] && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block mb-1">Input:</span>
                            <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-200 font-mono text-[11px] whitespace-pre-wrap">
                              {sampleTestCases[selectedTestCaseTab].input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block mb-1">Expected Output:</span>
                            <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] whitespace-pre-wrap">
                              {sampleTestCases[selectedTestCaseTab].expected_output}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {bottomTab === 'results' && (
                    <div>
                      {!execResult ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          Click <strong>"Run Code"</strong> or <strong>"Submit Solution"</strong> to view execution results.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                            <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              execResult.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {execResult.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              Passed: <strong className="text-white">{execResult.passed_tests}/{execResult.total_tests}</strong> test cases
                              {execResult.execution_time_ms !== undefined && (
                                <span className="ml-2 text-slate-500">({execResult.execution_time_ms} ms)</span>
                              )}
                            </span>
                          </div>

                          {execResult.results?.map((r, i) => (
                            <div key={i} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1">
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-slate-300">Test Case #{r.test_index}</span>
                                <span className={r.status === 'Passed' || r.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}>
                                  {r.status}
                                </span>
                              </div>
                              {r.input && r.input !== '[Hidden Test Case]' && (
                                <div className="text-slate-400 text-[11px] pt-1">
                                  <span className="text-slate-500">Input: </span>
                                  <span className="text-cyan-300">{r.input}</span>
                                </div>
                              )}
                              {r.expected_output && r.expected_output !== '[Hidden Output]' && (
                                <div className="text-slate-400 text-[11px]">
                                  <span className="text-slate-500">Expected: </span>
                                  <span className="text-emerald-400">{r.expected_output}</span>
                                </div>
                              )}
                              {r.actual_output && (
                                <div className="text-slate-300 text-[11px]">
                                  <span className="text-slate-500">Output: </span>
                                  <span className="text-white">{r.actual_output}</span>
                                </div>
                              )}
                              {r.stderr && (
                                <div className="text-rose-300 text-[11px] whitespace-pre-wrap mt-1 p-2 rounded bg-rose-950/30 border border-rose-900/30">
                                  {r.stderr}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {bottomTab === 'custom' && (
                    <div className="space-y-2">
                      <label className="block text-[11px] text-slate-400 font-semibold">
                        Custom Standard Input (stdin):
                      </label>
                      <textarea
                        rows={3}
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        placeholder="Enter custom input here..."
                        className="w-full p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-cyan-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 max-w-xl mx-auto my-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center text-white shadow-xl">
                <Github className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Submit via GitHub Repository Link</h3>
                <p className="text-xs text-slate-400">
                  Provide a link to your public repository or specific solution file for mentor review.
                </p>
              </div>
              <form onSubmit={handleSubmitGithub} className="w-full space-y-3">
                <input
                  type="url"
                  required
                  placeholder="https://github.com/username/repo/blob/main/solution.py"
                  value={githubUrl}
                  onChange={e => setGithubUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmittingGithub}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs disabled:opacity-50 transition-all"
                >
                  {isSubmittingGithub ? 'Submitting...' : 'Submit Repository Link'}
                </button>
              </form>
              {githubSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
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
