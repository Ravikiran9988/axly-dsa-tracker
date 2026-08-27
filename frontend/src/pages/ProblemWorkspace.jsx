import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, CheckCircle2, AlertCircle, Copy, RotateCcw, Sparkles, Github, Code, Check, Clock, Terminal, FileCode, HelpCircle, Layers, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, Send } from 'lucide-react';
import { api } from '../services/api';

const STARTER_CODE_TEMPLATES = {
  javascript: `const fs = require('fs');\n\nfunction solve(input) {\n  // Write your code here\n  return input;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(solve(input));`,
  python: `import sys\n\ndef solve(input_data):\n    # Write your code here\n    return input_data\n\nif __name__ == '__main__':\n    raw = sys.stdin.read().strip()\n    print(solve(raw))`,
  typescript: `import * as fs from 'fs';\n\nfunction solve(input: string): string {\n  // Write your TypeScript code here\n  return input;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(solve(input));`,
  java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your Java solution here\n        if (sc.hasNext()) {\n            System.out.println(sc.next());\n        }\n    }\n}`,
  cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    // Write your C++ solution here\n    string s;\n    if (cin >> s) cout << s << endl;\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your C solution here\n    char buffer[1024];\n    if (scanf("%1023s", buffer) == 1) printf("%s\\n", buffer);\n    return 0;\n}`
};

export default function ProblemWorkspace({ questionId, onBack, onStatusUpdated }) {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionMethod, setSubmissionMethod] = useState('code');
  const [leftTab, setLeftTab] = useState('description');
  const [bottomTab, setBottomTab] = useState('testcases');
  const [language, setLanguage] = useState('javascript');
  const [sourceCode, setSourceCode] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubSubmitting, setGithubSubmitting] = useState(false);
  const [githubSuccess, setGithubSuccess] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [execResult, setExecResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pastSubmissions, setPastSubmissions] = useState([]);

  useEffect(() => { loadQuestion(); }, [questionId]);
  async function loadQuestion() {
    setLoading(true); setError(null);
    try {
      const res = await api.getQuestionById(questionId); const q = res.data; setQuestion(q);
      let initialCode = '';
      if (q.starter_code && typeof q.starter_code === 'object') initialCode = q.starter_code[language] || '';
      else if (typeof q.starter_code === 'string') { try { initialCode = JSON.parse(q.starter_code)[language] || ''; } catch { initialCode = q.starter_code; } }
      setSourceCode(initialCode || STARTER_CODE_TEMPLATES[language]);
      const histRes = await api.getCodeSubmissionsHistory(questionId); setPastSubmissions(histRes.data || []);
    } catch (err) { setError(err.message || 'Failed to load challenge details.'); }
    finally { setLoading(false); }
  }
  function handleLanguageChange(newLang) { setLanguage(newLang); setSourceCode(question?.starter_code?.[newLang] || STARTER_CODE_TEMPLATES[newLang]); }
  function handleResetCode() { setSourceCode(question?.starter_code?.[language] || STARTER_CODE_TEMPLATES[language]); }
  function handleCopyCode() { navigator.clipboard.writeText(sourceCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  async function handleRunCode() {
    setIsRunning(true); setExecResult(null); setBottomTab('results');
    try { const res = await api.runCode({ question_id: questionId, language, source_code: sourceCode, custom_input: bottomTab === 'custom' ? customInput : undefined }); setExecResult(res.data); }
    catch (err) { setExecResult({ status: 'Runtime Error', passed_tests: 0, total_tests: 1, results: [{ test_index: 1, status: 'Runtime Error', actual_output: '', stderr: err.message || 'Execution error' }] }); }
    finally { setIsRunning(false); }
  }
  async function handleSubmitSolution() {
    setIsSubmitting(true); setExecResult(null); setBottomTab('results');
    try { const res = await api.submitCode({ question_id: questionId, language, source_code: sourceCode }); setExecResult(res.data); if (res.data.status === 'Accepted') onStatusUpdated?.(); const histRes = await api.getCodeSubmissionsHistory(questionId); setPastSubmissions(histRes.data || []); }
    catch (err) { setExecResult({ status: 'Runtime Error', passed_tests: 0, total_tests: 1, results: [{ test_index: 1, status: 'Runtime Error', actual_output: '', stderr: err.message || 'Submission error' }] }); }
    finally { setIsSubmitting(false); }
  }
  async function handleGithubSubmit() {
    const url = githubUrl.trim();
    if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(url)) { setGithubSuccess({ error: 'Enter a valid public GitHub repository URL.' }); return; }
    setGithubSubmitting(true); setGithubSuccess(null);
    try { const res = await api.submitViaGithub({ question_id: questionId, github_url: url }); setGithubSuccess({ data: res.data }); onStatusUpdated?.(); }
    catch (err) { setGithubSuccess({ error: err.message || 'GitHub submission failed.' }); }
    finally { setGithubSubmitting(false); }
  }

  if (loading) return <div className="min-h-screen bg-[#080C14] text-white flex items-center justify-center"><div className="animate-pulse">Loading challenge…</div></div>;
  if (error || !question) return <div className="min-h-screen bg-[#080C14] text-white flex items-center justify-center"><div className="text-center"><AlertCircle className="mx-auto mb-3"/><p>{error || 'Challenge not found'}</p><button onClick={onBack} className="mt-4 underline">Go back</button></div></div>;
  return <div className="min-h-screen bg-[#080C14] text-white flex flex-col">
    <header className="sticky top-0 z-30 h-14 border-b border-white/10 bg-[#0B0F19]/95 backdrop-blur flex items-center px-4 gap-3"><button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10" aria-label="Back"><ArrowLeft size={18}/></button><div className="font-semibold truncate">{question.title}</div><span className="ml-auto text-xs text-white/50 flex items-center gap-1"><ShieldCheck size={14}/> Sandbox execution</span></header>
    <main className="flex-1 grid lg:grid-cols-2 min-h-0">
      <section className="border-r border-white/10 p-5 overflow-auto"><div className="flex gap-2 mb-5">{['description','hints','submissions'].map(t => <button key={t} onClick={() => setLeftTab(t)} className={`px-3 py-2 rounded-lg text-sm capitalize ${leftTab===t?'bg-white/10 text-white':'text-white/50 hover:text-white'}`}>{t}</button>)}</div>
        {leftTab==='description' && <><div className="flex items-center gap-2 mb-3"><span className="text-xs uppercase tracking-wider text-white/40">{question.difficulty}</span>{question.points != null && <span className="text-xs text-white/40">{question.points} pts</span>}</div><h1 className="text-2xl font-bold mb-4">{question.title}</h1><div className="prose prose-invert max-w-none whitespace-pre-wrap text-white/75">{question.description || 'Solve this challenge and submit your solution.'}</div></>}
        {leftTab==='hints' && <div className="text-white/60">{question.hints || 'No hints available for this challenge.'}</div>}
        {leftTab==='submissions' && <div className="space-y-2">{pastSubmissions.length ? pastSubmissions.map((s,i)=><div key={s.id||i} className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm flex justify-between"><span>{s.language || s.submission_type}</span><span>{s.status}</span></div>) : <div className="text-white/40">No submissions yet.</div>}</div>}
      </section>
      <section className="min-h-0 flex flex-col"><div className="h-14 border-b border-white/10 flex items-center gap-2 px-4"><button onClick={()=>setSubmissionMethod('code')} className={`px-3 py-2 rounded-lg text-sm flex gap-2 items-center ${submissionMethod==='code'?'bg-white/10':''}`}><Code size={16}/> Code Editor</button><button onClick={()=>setSubmissionMethod('github')} className={`px-3 py-2 rounded-lg text-sm flex gap-2 items-center ${submissionMethod==='github'?'bg-white/10':''}`}><Github size={16}/> GitHub</button></div>
        {submissionMethod==='github' ? <div className="p-6 max-w-xl"><h2 className="text-xl font-semibold mb-2">Submit from GitHub</h2><p className="text-sm text-white/50 mb-5">Submit a public repository. Axly records the exact commit used for review.</p><input value={githubUrl} onChange={e=>setGithubUrl(e.target.value)} placeholder="https://github.com/username/repository" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-white/30"/><button disabled={githubSubmitting} onClick={handleGithubSubmit} className="mt-3 w-full rounded-xl bg-white text-black py-3 font-semibold disabled:opacity-50">{githubSubmitting?'Submitting…':'Submit GitHub Repository'}</button>{githubSuccess?.error && <p className="mt-3 text-sm text-red-300">{githubSuccess.error}</p>}{githubSuccess?.data && <div className="mt-4 rounded-xl bg-white/5 p-4 text-sm"><div className="text-green-300 flex gap-2 items-center"><Check size={16}/> Submitted for review</div><div className="mt-2 text-white/50">Commit: {githubSuccess.data.github_commit_sha || 'recorded'}</div></div>}</div> : <><div className="h-14 border-b border-white/10 flex items-center px-4 gap-2"><select value={language} onChange={e=>handleLanguageChange(e.target.value)} className="bg-[#141D30] rounded-lg px-3 py-2 text-sm outline-none"><option value="javascript">JavaScript</option><option value="python">Python</option><option value="typescript">TypeScript</option><option value="java">Java</option><option value="cpp">C++</option><option value="c">C</option></select><button onClick={handleCopyCode} className="ml-auto p-2 rounded-lg hover:bg-white/10" title="Copy code"><Copy size={16}/></button><button onClick={handleResetCode} className="p-2 rounded-lg hover:bg-white/10" title="Reset code"><RotateCcw size={16}/></button></div><textarea value={sourceCode} onChange={e=>setSourceCode(e.target.value)} spellCheck="false" aria-label="Code editor" className="flex-1 min-h-[420px] w-full resize-none bg-[#060910] p-5 font-mono text-sm leading-6 outline-none"/><div className="border-t border-white/10 p-3 flex items-center gap-2"><button onClick={handleRunCode} disabled={isRunning||isSubmitting} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-50 flex gap-2 items-center"><Play size={16}/>{isRunning?'Running…':'Run'}</button><button onClick={handleSubmitSolution} disabled={isRunning||isSubmitting} className="px-4 py-2 rounded-lg bg-white text-black font-semibold disabled:opacity-50 flex gap-2 items-center"><Send size={16}/>{isSubmitting?'Submitting…':'Submit'}</button></div><div className="border-t border-white/10 min-h-40 p-4"><div className="flex gap-4 mb-3 text-sm">{['testcases','results','custom'].map(t=><button key={t} onClick={()=>setBottomTab(t)} className={bottomTab===t?'text-white':'text-white/40'}>{t}</button>)}</div>{bottomTab==='custom' && <textarea value={customInput} onChange={e=>setCustomInput(e.target.value)} placeholder="Custom input" className="w-full h-20 bg-white/5 border border-white/10 rounded-lg p-2 font-mono text-sm"/>}{bottomTab==='results' && <div className="font-mono text-sm">{execResult ? <><div className="font-semibold">{execResult.status}</div>{execResult.stderr && <pre className="mt-2 whitespace-pre-wrap text-red-300">{execResult.stderr}</pre>}</> : <span className="text-white/40">Run or submit your solution to see results.</span>}</div>}{bottomTab==='testcases' && <div className="text-sm text-white/50">{Array.isArray(question.test_cases) ? `${question.test_cases.length} test cases` : 'Test cases are ready.'}</div>}</div></>}
      </section>
    </main>
  </div>;
}
