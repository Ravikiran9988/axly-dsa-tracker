import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  RotateCcw,
  Sparkles,
  Github,
  Code,
  Check,
  Clock,
  Terminal,
  FileCode,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Send
} from 'lucide-react';
import { api } from '../services/api';

const STARTER_CODE_TEMPLATES = {
  javascript: `const fs = require('fs');

function solve(input) {
  // Write your code here
  return input;
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(solve(input));`,

  python: `import sys

def solve(input_data):
    # Write your code here
    return input_data

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    print(solve(raw))`,

  typescript: `import * as fs from 'fs';

function solve(input: string): string {
  // Write your TypeScript code here
  return input;
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(solve(input));`,

  java: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Write your Java solution here
        if (sc.hasNext()) {
            System.out.println(sc.next());
        }
    }
}`,

  cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // Write your C++ solution here
    string s;
    if (cin >> s) {
        cout << s << endl;
    }
    return 0;
}`,

  c: `#include <stdio.h>

int main() {
    // Write your C solution here
    char buffer[1024];
    if (scanf("%1023s", buffer) == 1) {
        printf("%s\\n", buffer);
    }
    return 0;
}`
};

export default function ProblemWorkspace({ questionId, onBack, onStatusUpdated }) {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tabs & Submission Method
  const [submissionMethod, setSubmissionMethod] = useState('code'); // 'code' | 'github'
  const [leftTab, setLeftTab] = useState('description'); // 'description' | 'hints' | 'submissions'
  const [bottomTab, setBottomTab] = useState('testcases'); // 'testcases' | 'results' | 'custom'

  // Code Editor State
  const [language, setLanguage] = useState('javascript');
  const [sourceCode, setSourceCode] = useState('');
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [customInput, setCustomInput] = useState('');

  // GitHub Submission State
  const [githubUrl, setGithubUrl] = useState('');
  const [githubSubmitting, setGithubSubmitting] = useState(false);
  const [githubSuccess, setGithubSuccess] = useState(null);

  // Execution & Running State
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [execResult, setExecResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pastSubmissions, setPastSubmissions] = useState([]);

  useEffect(() => {
    loadQuestion();
  }, [questionId]);

  async function loadQuestion() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getQuestionById(questionId);
      const q = res.data;
      setQuestion(q);

      // Determine initial starter code
      let initialCode = '';
      if (q.starter_code) {
        if (typeof q.starter_code === 'object' && q.starter_code[language]) {
          initialCode = q.starter_code[language];
        } else if (typeof q.starter_code === 'string') {
          try {
            const parsed = JSON.parse(q.starter_code);
            initialCode = parsed[language] || STARTER_CODE_TEMPLATES[language];
          } catch {
            initialCode = q.starter_code;
          }
        }
      }

      if (!initialCode) {
        initialCode = STARTER_CODE_TEMPLATES[language] || STARTER_CODE_TEMPLATES.javascript;
      }
      setSourceCode(initialCode);

      // Fetch past submissions history
      try {
        const histRes = await api.getCodeSubmissionsHistory(questionId);
        setPastSubmissions(histRes.data || []);
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err.message || 'Failed to load challenge details.');
    } finally {
      setLoading(false);
    }
  }

  function handleLanguageChange(newLang) {
    setLanguage(newLang);
    if (question?.starter_code && typeof question.starter_code === 'object' && question.starter_code[newLang]) {
      setSourceCode(question.starter_code[newLang]);
    } else {
      setSourceCode(STARTER_CODE_TEMPLATES[newLang] || STARTER_CODE_TEMPLATES.javascript);
    }
  }

  function handleResetCode() {
    if (window.confirm('Reset code editor to initial starter code?')) {
      if (question?.starter_code && typeof question.starter_code === 'object' && question.starter_code[language]) {
        setSourceCode(question.starter_code[language]);
      } else {
        setSourceCode(STARTER_CODE_TEMPLATES[language] || STARTER_CODE_TEMPLATES.javascript);
      }
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
      const payload = {
        question_id: questionId,
        language,
        source_code: sourceCode,
        custom_input: bottomTab === 'custom' && customInput.trim() ? customInput : undefined
      };
      const res = await api.runCode(payload);
      setExecResult(res.data);
    } catch (err) {
      setExecResult({
        status: 'Runtime Error',
        passed_tests: 0,
        total_tests: 1,
        execution_time_ms: 0,
        results: [
          {
            test_index: 1,
            status: 'Runtime Error',
            actual_output: '',
            stderr: err.message || 'Execution error'
          }
        ]
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
      const payload = {
        question_id: questionId,
        language,
        source_code: sourceCode
      };
      const res = await api.submitCode(payload);
      setExecResult(res.data);

      if (res.data.status === 'Accepted') {
        if (onStatusUpdated) onStatusUpdated();
      }

      // Reload past submissions
      const histRes = await api.getCodeSubmissionsHistory(questionId);
      setPastSubmissions(histRes.data || []);
    } catch (err) {
      setExecResult({
        status: 'Runtime Error',
        passed_tests: 0,
        total_tests: 1,
        execution_time_ms: 0,
        results: [
          {
            test_index: 1,
            status: 'Runtime Error',
            actual_output: '',
            stderr: err.message || 'Submission error'
          }
        ]
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGithubSubmit(e) {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    setGithubSubmitting(true);
    setGithubSuccess(null);
    try {
      await api.submitViaGithub({
        question_id: questionId,
        github_url: githubUrl.trim()
      });
      setGithubSuccess('GitHub submission received! Under mentor review.');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      alert(err.message || 'Failed to submit GitHub link.');
    } finally {
      setGithubSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-slate-400">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <div className="text-sm">Loading challenge workspace & compiler...</div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Challenge Unavailable</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'Could not load problem statement.'}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
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

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#070B14]">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-[#0A0F1D] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Challenges</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <h1 className="text-sm font-bold text-white truncate max-w-xs md:max-w-md">
            {question.title}
          </h1>
          <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md border ${difficultyColors[question.difficulty] || difficultyColors.easy}`}>
            {question.difficulty}
          </span>
          <span className="hidden sm:inline-flex text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-md">
            +{question.points || 20} pts
          </span>
        </div>

        {/* Action Controls & Submission Switch */}
        <div className="flex items-center gap-2.5">
          {/* Submission Mode Switch */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setSubmissionMethod('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${submissionMethod === 'code' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Code className="w-3.5 h-3.5" /> Code Editor
            </button>
            <button
              onClick={() => setSubmissionMethod('github')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${submissionMethod === 'github' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Github className="w-3.5 h-3.5" /> GitHub Link
            </button>
          </div>

          {submissionMethod === 'code' && (
            <>
              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="python">Python 3</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
              </select>

              {/* Run Code Button */}
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>{isRunning ? 'Running...' : 'Run Code'}</span>
              </button>

              {/* Submit Button */}
              <button
                onClick={handleSubmitSolution}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-950/40 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Evaluating...' : 'Submit'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Body (2-Panel Split) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT PANEL: Problem Details, Hints, Past Submissions */}
        <div className="lg:col-span-5 border-r border-slate-800/80 bg-[#0A0F1D]/70 flex flex-col overflow-hidden">
          {/* Left Panel Tabs */}
          <div className="h-10 border-b border-slate-800 px-3 flex items-center gap-4 bg-slate-950/40 shrink-0">
            <button
              onClick={() => setLeftTab('description')}
              className={`text-xs font-medium h-full border-b-2 flex items-center gap-1.5 transition-colors ${leftTab === 'description' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              <FileCode className="w-3.5 h-3.5" /> Description
            </button>
            {question.hints && (
              <button
                onClick={() => setLeftTab('hints')}
                className={`text-xs font-medium h-full border-b-2 flex items-center gap-1.5 transition-colors ${leftTab === 'hints' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
              >
                <HelpCircle className="w-3.5 h-3.5" /> Hints
              </button>
            )}
            <button
              onClick={() => setLeftTab('submissions')}
              className={`text-xs font-medium h-full border-b-2 flex items-center gap-1.5 transition-colors ${leftTab === 'submissions' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              <History className="w-3.5 h-3.5" /> History ({pastSubmissions.length})
            </button>
          </div>

          {/* Left Panel Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6 text-slate-300 text-sm">
            {leftTab === 'description' && (
              <>
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {question.topic_name && (
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                      {question.topic_name}
                    </span>
                  )}
                  {question.estimated_time && (
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {question.estimated_time}
                    </span>
                  )}
                </div>

                {/* Problem Statement */}
                <div className="space-y-3 leading-relaxed">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Problem Statement</h3>
                  <div className="whitespace-pre-line text-slate-200 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 font-sans">
                    {question.description || question.problem_statement || 'No description provided.'}
                  </div>
                </div>

                {/* Input / Output Format */}
                {(question.input_format || question.output_format) && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">I/O Specification</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {question.input_format && (
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-[11px] font-semibold text-slate-400 mb-1">Input Format</div>
                          <div className="text-xs text-slate-300 whitespace-pre-line">{question.input_format}</div>
                        </div>
                      )}
                      {question.output_format && (
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-[11px] font-semibold text-slate-400 mb-1">Output Format</div>
                          <div className="text-xs text-slate-300 whitespace-pre-line">{question.output_format}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {question.constraints && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Constraints</h3>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs text-amber-300/90 whitespace-pre-line">
                      {question.constraints}
                    </div>
                  </div>
                )}

                {/* Examples */}
                {(question.example_input || (sampleTestCases && sampleTestCases.length > 0)) && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sample Cases</h3>
                    {sampleTestCases.slice(0, 2).map((tc, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                        <div className="text-xs font-semibold text-slate-300">Example {idx + 1}</div>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Input</span>
                            <pre className="mt-0.5 p-2 rounded bg-slate-950 text-cyan-300 font-mono text-xs overflow-x-auto">
                              {tc.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Expected Output</span>
                            <pre className="mt-0.5 p-2 rounded bg-slate-950 text-emerald-300 font-mono text-xs overflow-x-auto">
                              {tc.expected_output}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {leftTab === 'hints' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Algorithm Hints</h3>
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 text-indigo-200 text-xs leading-relaxed whitespace-pre-line">
                  {question.hints || 'No hints available for this problem.'}
                </div>
              </div>
            )}

            {leftTab === 'submissions' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Past Attempts</h3>
                {pastSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">No code submissions recorded yet.</div>
                ) : (
                  pastSubmissions.map((sub, idx) => (
                    <div key={sub.id || idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${sub.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {sub.status}
                          </span>
                          <span className="text-slate-400 uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800">
                            {sub.language}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {sub.passed_tests}/{sub.total_tests} passed • {sub.execution_time_ms} ms
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {sub.created_at ? new Date(sub.created_at).toLocaleTimeString() : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Code Editor OR GitHub Submission */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[#070B14]">
          {submissionMethod === 'code' ? (
            <>
              {/* Editor Header */}
              <div className="h-10 border-b border-slate-800 px-3 bg-slate-950/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleResetCode}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Reset starter template"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Code Textarea Area with Line Numbers */}
              <div className="flex-1 flex overflow-hidden relative font-mono text-xs bg-[#080C16]">
                <textarea
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  placeholder="// Write your code solution here..."
                  spellCheck={false}
                  className="w-full h-full p-4 bg-transparent text-cyan-100 resize-none focus:outline-none custom-scrollbar leading-relaxed font-mono selection:bg-cyan-800/50"
                  style={{ tabSize: 2 }}
                />
              </div>

              {/* Bottom Testcase & Results Drawer */}
              <div className="h-56 border-t border-slate-800 bg-[#090E1B] flex flex-col shrink-0">
                {/* Console Tabs */}
                <div className="h-9 border-b border-slate-800 px-3 flex items-center justify-between bg-slate-950/50 shrink-0">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setBottomTab('testcases')}
                      className={`text-xs font-medium h-full border-b-2 flex items-center gap-1.5 transition-colors ${bottomTab === 'testcases' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <Layers className="w-3.5 h-3.5" /> Sample Test Cases
                    </button>
                    <button
                      onClick={() => setBottomTab('results')}
                      className={`text-xs font-medium h-full border-b-2 flex items-center gap-1.5 transition-colors ${bottomTab === 'results' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <Terminal className="w-3.5 h-3.5" /> Execution Results
                    </button>
                    <button
                      onClick={() => setBottomTab('custom')}
                      className={`text-xs font-medium h-full border-b-2 flex items-center gap-1.5 transition-colors ${bottomTab === 'custom' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Custom Input
                    </button>
                  </div>

                  {execResult && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-bold px-2 py-0.5 rounded-full ${execResult.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                        {execResult.status}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {execResult.passed_tests}/{execResult.total_tests} Passed
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({execResult.execution_time_ms} ms)
                      </span>
                    </div>
                  )}
                </div>

                {/* Console Body */}
                <div className="flex-1 p-3 overflow-y-auto custom-scrollbar font-mono text-xs">
                  {bottomTab === 'testcases' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {sampleTestCases.map((tc, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedTestCaseIndex(idx)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${selectedTestCaseIndex === idx ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                          >
                            Case {idx + 1}
                          </button>
                        ))}
                      </div>

                      {sampleTestCases[selectedTestCaseIndex] && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">stdin Input</div>
                            <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 overflow-x-auto">
                              {sampleTestCases[selectedTestCaseIndex].input}
                            </pre>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Expected Output</div>
                            <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 overflow-x-auto">
                              {sampleTestCases[selectedTestCaseIndex].expected_output}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {bottomTab === 'results' && (
                    <div>
                      {!execResult ? (
                        <div className="text-center py-6 text-slate-400">
                          Click <strong>"Run Code"</strong> or <strong>"Submit"</strong> to execute your code against test cases.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {execResult.results?.map((res, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-300">
                                  Test Case #{res.test_index} {res.is_hidden ? '(Hidden Evaluation)' : ''}
                                </span>
                                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${res.status === 'Passed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                                  }`}>
                                  {res.status}
                                </span>
                              </div>

                              {!res.is_hidden && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-1">
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase">Your Output:</span>
                                    <pre className="p-1.5 rounded bg-slate-900 text-slate-200 overflow-x-auto mt-0.5">
                                      {res.actual_output || '(no output)'}
                                    </pre>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase">Expected Output:</span>
                                    <pre className="p-1.5 rounded bg-slate-900 text-slate-200 overflow-x-auto mt-0.5">
                                      {res.expected_output}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {res.stderr && (
                                <div className="mt-2 text-rose-400 text-xs bg-rose-950/40 p-2 rounded border border-rose-900/60 overflow-x-auto whitespace-pre-wrap">
                                  {res.stderr}
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
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Custom stdin Input:</div>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter custom input to pipe to stdin..."
                        className="w-full h-24 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* METHOD 2: GITHUB URL SUBMISSION */
            <div className="flex-1 p-8 flex flex-col justify-center max-w-xl mx-auto space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white">
                    <Github className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Submit Solution via GitHub</h2>
                    <p className="text-xs text-slate-400">Submit your GitHub repository or single file solution link for mentor code review.</p>
                  </div>
                </div>

                <form onSubmit={handleGithubSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      GitHub Repository / File URL <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://github.com/username/project/blob/main/solution.py"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Must be a valid public GitHub link (repository or specific code file).
                    </span>
                  </div>

                  {githubSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{githubSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={githubSubmitting || !githubUrl.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{githubSubmitting ? 'Submitting Link...' : 'Submit Repository Link'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
