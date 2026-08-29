import React, { useState } from 'react';
import {
  Sparkles, HelpCircle, BookOpen, Compass, Code2, Clock, CheckCircle2,
  Bug, Play, Copy, Check, AlertCircle, RefreshCw, ChevronRight, Layers,
  Terminal, ShieldCheck, XCircle, Send
} from 'lucide-react';
import { api } from '../services/api';

const QUICK_ACTIONS = [
  { id: 'HINT', label: 'Hint', icon: HelpCircle, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20' },
  { id: 'EXPLAIN', label: 'Explain', icon: BookOpen, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20' },
  { id: 'APPROACH', label: 'Approach', icon: Compass, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20' },
  { id: 'SOLUTION', label: 'Solution', icon: Code2, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' },
  { id: 'COMPLEXITY', label: 'Complexity', icon: Clock, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20' },
  { id: 'CODE_REVIEW', label: 'Review Code', icon: ShieldCheck, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20' },
  { id: 'DEBUG', label: 'Debug', icon: Bug, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20' }
];

export default function DsaAiCoachPanel({ problem, currentCode = '', language = 'javascript' }) {
  const [query, setQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('HINT');
  const [hintLevel, setHintLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [userCode, setUserCode] = useState(currentCode || '');
  const [codeLang, setCodeLang] = useState(language || 'javascript');

  const executeCoachAction = async (actionId, options = {}) => {
    setLoading(true);
    setError(null);
    setSelectedAction(actionId);

    const level = options.hintIndex !== undefined ? options.hintIndex : (actionId === 'HINT' ? hintLevel : 0);
    const questionText = options.customQuery || query || (
      actionId === 'HINT' ? `Give me hint ${level + 1} for ${problem?.title || 'this problem'}` :
      actionId === 'EXPLAIN' ? `Explain the core concept and mechanism of ${problem?.title || 'this problem'}` :
      actionId === 'APPROACH' ? `What is the step-by-step optimal approach for ${problem?.title || 'this problem'}?` :
      actionId === 'SOLUTION' ? `Show the optimal ${codeLang} solution for ${problem?.title || 'this problem'}` :
      actionId === 'COMPLEXITY' ? `What are the time and space complexities for ${problem?.title || 'this problem'}?` :
      actionId === 'CODE_REVIEW' ? `Review this ${codeLang} solution for correctness and efficiency` :
      actionId === 'DEBUG' ? `Debug this ${codeLang} code and identify logic errors` :
      `Help me understand ${problem?.title || 'this DSA challenge'}`
    );

    try {
      const res = await api.getDsaAiCoach({
        question: questionText,
        problemId: problem?.id,
        action: actionId,
        language: codeLang,
        code: (actionId === 'CODE_REVIEW' || actionId === 'DEBUG' || showCodeEditor) ? (userCode || currentCode) : undefined,
        hintIndex: level,
        verify: actionId === 'SOLUTION'
      });

      setResponse(res.data);
      if (actionId === 'HINT') {
        setHintLevel(level + 1);
      }
    } catch (err) {
      if (err.status === 429 || err.code === 'RATE_LIMITED') {
        setError('You have reached the AI request rate limit. Please wait a moment before trying again.');
      } else {
        setError(err.message || 'AI coach service is temporarily unavailable. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    executeCoachAction(selectedAction, { customQuery: query.trim() });
  };

  const handleCopyCode = () => {
    if (response?.code) {
      navigator.clipboard.writeText(response.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetHints = () => {
    setHintLevel(0);
    executeCoachAction('HINT', { hintIndex: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] rounded-xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">DSA AI Coach</h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {problem?.title ? `Grounding on: ${problem.title}` : 'No problem selected — ask any DSA question.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCodeEditor(!showCodeEditor)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
            showCodeEditor
              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
              : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          {showCodeEditor ? 'Hide Code Input' : 'Attach Code'}
        </button>
      </div>

      {/* Quick Action Pills */}
      <div className="p-3 bg-slate-900/30 border-b border-slate-800/60 flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((act) => {
          const Icon = act.icon;
          const isActive = selectedAction === act.id && !loading;
          return (
            <button
              key={act.id}
              onClick={() => {
                if (act.id === 'HINT' && response?.intent === 'HINT') {
                  executeCoachAction('HINT');
                } else {
                  executeCoachAction(act.id);
                }
              }}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
                isActive
                  ? 'bg-white/10 text-white border-white/30 shadow-sm'
                  : act.color
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {act.label}
              {act.id === 'HINT' && hintLevel > 0 && (
                <span className="ml-1 px-1 rounded bg-amber-400/20 text-amber-300 text-[10px]">
                  #{hintLevel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Optional Attached Code Editor for Review/Debug */}
      {showCodeEditor && (
        <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Code Snippet for Analysis:
            </span>
            <select
              value={codeLang}
              onChange={(e) => setCodeLang(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-300 text-[11px]"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="typescript">TypeScript</option>
            </select>
          </div>
          <textarea
            value={userCode}
            onChange={(e) => setUserCode(e.target.value)}
            placeholder="Paste or write your solution code here for review or debugging..."
            rows={4}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-y"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => executeCoachAction('CODE_REVIEW')}
              disabled={loading || !userCode.trim()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
            >
              Run Code Review
            </button>
            <button
              onClick={() => executeCoachAction('DEBUG')}
              disabled={loading || !userCode.trim()}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
            >
              Debug Code
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {loading && (
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-cyan-500/40 animate-ping" />
              <span className="text-xs text-cyan-300 font-mono">Analyzing DSA taxonomy & verifying solution...</span>
            </div>
            <div className="h-4 bg-slate-800 rounded w-3/4" />
            <div className="h-4 bg-slate-800 rounded w-1/2" />
            <div className="h-16 bg-slate-800/60 rounded w-full" />
          </div>
        )}

        {error && !loading && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">AI Assistant Notice</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && response && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Meta Tags Banner */}
            <div className="flex flex-wrap items-center gap-2">
              {response.topic && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  <Layers className="w-3 h-3" /> {response.topic}
                </span>
              )}
              {response.pattern && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  <Compass className="w-3 h-3" /> {response.pattern}
                </span>
              )}
              {response.complexity?.time && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  <Clock className="w-3 h-3" /> {response.complexity.time}
                </span>
              )}
              {response.source && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-slate-400">
                  via {response.source}
                </span>
              )}
            </div>

            {/* Answer / Guidance Text */}
            {response.answer && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 text-xs leading-relaxed space-y-2 whitespace-pre-line">
                {response.answer}
              </div>
            )}

            {/* Code Block Display */}
            {response.code && (
              <div className="rounded-xl border border-slate-800 bg-[#050811] overflow-hidden">
                <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                    Optimal Solution ({codeLang})
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-emerald-300/90 overflow-x-auto">
                  <code>{response.code}</code>
                </pre>
              </div>
            )}

            {/* Verification Result Banner */}
            {response.verification && (
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                response.verification.verified
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center gap-2">
                  {response.verification.verified ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <div>
                    <span className="font-bold">Sandbox Verification: {response.verification.status}</span>
                    <span className="ml-2 text-slate-400 font-mono">
                      ({response.verification.passed_tests}/{response.verification.total_tests} tests passed)
                    </span>
                  </div>
                </div>
                {response.verification.execution_time_ms !== undefined && (
                  <span className="font-mono text-[11px] text-slate-400">
                    {response.verification.execution_time_ms} ms
                  </span>
                )}
              </div>
            )}

            {/* Progressive Hint Next Buttons */}
            {response.intent === 'HINT' && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => executeCoachAction('HINT')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Next Hint <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={resetHints}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Hints
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !response && (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-900/80 border border-slate-800 mx-auto flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-xs font-semibold text-slate-400">Ask DSA AI for Guidance</div>
            <p className="text-[11px] text-slate-600 max-w-xs mx-auto">
              Click any quick action above or type a specific question about data structures, patterns, or edge cases.
            </p>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleCustomSubmit} className="p-3 bg-slate-900/70 border-t border-slate-800/80 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about DSA or this problem..."
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-600/20"
        >
          <Send className="w-3.5 h-3.5" />
          Ask
        </button>
      </form>
    </div>
  );
}
