import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, HelpCircle, BookOpen, Compass, Code2, Clock, CheckCircle2,
  Bug, Play, Copy, Check, AlertCircle, RefreshCw, ChevronRight, Layers,
  Terminal, ShieldCheck, XCircle, Send, User, RotateCcw
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
  const [messages, setMessages] = useState([]);
  const [selectedAction, setSelectedAction] = useState('HINT');
  const [hintLevel, setHintLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [userCode, setUserCode] = useState(currentCode || '');
  const [codeLang, setCodeLang] = useState(language || 'javascript');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Execute coach request
  const executeCoachAction = async (actionId, options = {}) => {
    if (loading) return;

    const level = options.hintIndex !== undefined ? options.hintIndex : (actionId === 'HINT' ? hintLevel : 0);
    const customQuery = options.customQuery ? options.customQuery.trim() : null;

    let questionText = customQuery;
    let userPromptLabel = customQuery;

    if (!questionText) {
      if (actionId === 'HINT') {
        questionText = `Give me hint ${level + 1} for ${problem?.title || 'this problem'}`;
        userPromptLabel = `Hint #${level + 1}`;
      } else if (actionId === 'EXPLAIN') {
        questionText = `Explain the core concept and mechanism of ${problem?.title || 'this problem'}`;
        userPromptLabel = 'Explain concept';
      } else if (actionId === 'APPROACH') {
        questionText = `What is the step-by-step optimal approach for ${problem?.title || 'this problem'}?`;
        userPromptLabel = 'Optimal approach';
      } else if (actionId === 'SOLUTION') {
        questionText = `Show the optimal ${codeLang} solution for ${problem?.title || 'this problem'}`;
        userPromptLabel = 'Optimal solution';
      } else if (actionId === 'COMPLEXITY') {
        questionText = `What are the time and space complexities for ${problem?.title || 'this problem'}?`;
        userPromptLabel = 'Complexity analysis';
      } else if (actionId === 'CODE_REVIEW') {
        questionText = `Review this ${codeLang} solution for correctness and efficiency`;
        userPromptLabel = 'Review my code';
      } else if (actionId === 'DEBUG') {
        questionText = `Debug this ${codeLang} code and identify logic errors`;
        userPromptLabel = 'Debug my code';
      } else {
        questionText = `Help me understand ${problem?.title || 'this DSA challenge'}`;
        userPromptLabel = 'General DSA Help';
      }
    }

    if (!questionText) return;

    // 1. Add User Message to stream (if not a direct retry)
    if (!options.isRetry) {
      const userMessageObj = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        text: userPromptLabel,
        isCustom: Boolean(customQuery),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessageObj]);
    }

    setLoading(true);
    setSelectedAction(actionId);

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

      const aiResponseData = res.data || {};

      if (actionId === 'HINT') {
        setHintLevel(level + 1);
      }

      // Append AI response message to conversation stream
      const aiMessageObj = {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        text: aiResponseData.answer || 'Here is the requested DSA guidance.',
        data: aiResponseData,
        topic: aiResponseData.topic,
        pattern: aiResponseData.pattern,
        complexity: aiResponseData.complexity,
        code: aiResponseData.code,
        verification: aiResponseData.verification,
        source: aiResponseData.source,
        intent: aiResponseData.intent || actionId,
        hintLevel: actionId === 'HINT' ? (level + 1) : null,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessageObj]);
    } catch (err) {
      let errMsg = 'AI coach service is temporarily unavailable. Please try again.';
      if (err.status === 429 || err.code === 'RATE_LIMITED') {
        errMsg = 'You have reached the AI request rate limit. Please wait a moment before trying again.';
      } else if (err.message) {
        errMsg = err.message;
      }

      // Add error message to conversation stream with retry capability
      const errorMsgObj = {
        id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        isError: true,
        errorText: errMsg,
        retryAction: actionId,
        retryOptions: { ...options, isRetry: true, hintIndex: level, customQuery },
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMsgObj]);
    } finally {
      setLoading(false);
      // Keep input focused and empty
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Submit custom query handler
  const handleCustomSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const submittedMessage = query.trim();
    if (!submittedMessage || loading) return;

    // Immediately clear input field before async request
    setQuery('');

    // Execute with captured message
    executeCoachAction(selectedAction, { customQuery: submittedMessage });
  };

  // Handle Enter vs Shift+Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCustomSubmit(e);
    }
  };

  // Copy code helper
  const handleCopyCode = (code, msgId) => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const resetHints = () => {
    setHintLevel(0);
    executeCoachAction('HINT', { hintIndex: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between shrink-0">
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
          id="btn-dsa-ai-attach-code"
          type="button"
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
      <div className="p-3 bg-slate-900/30 border-b border-slate-800/60 flex flex-wrap gap-1.5 shrink-0">
        {QUICK_ACTIONS.map((act) => {
          const Icon = act.icon;
          const isActive = selectedAction === act.id && !loading;
          return (
            <button
              id={`btn-action-${act.id.toLowerCase()}`}
              key={act.id}
              type="button"
              onClick={() => {
                if (act.id === 'HINT') {
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

      {/* Optional Attached Code Editor */}
      {showCodeEditor && (
        <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 space-y-2 shrink-0">
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
            rows={3}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-y"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => executeCoachAction('CODE_REVIEW')}
              disabled={loading || !userCode.trim()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
            >
              Run Code Review
            </button>
            <button
              type="button"
              onClick={() => executeCoachAction('DEBUG')}
              disabled={loading || !userCode.trim()}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
            >
              Debug Code
            </button>
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
        {messages.length === 0 && !loading && (
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

        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end animate-in fade-in duration-200">
                <div className="max-w-[85%] bg-cyan-500/10 border border-cyan-500/30 text-cyan-100 rounded-2xl rounded-tr-sm p-3 shadow-sm space-y-1">
                  <div className="flex items-center justify-end gap-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    <span>You</span>
                    <User className="w-3 h-3 text-cyan-400" />
                  </div>
                  <div className="text-xs text-white font-medium break-words">
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          }

          if (msg.isError) {
            return (
              <div key={msg.id} className="flex justify-start animate-in fade-in duration-200">
                <div className="max-w-[90%] p-4 rounded-2xl rounded-tl-sm bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <div className="font-semibold">Unable to generate a response</div>
                  </div>
                  <p className="text-slate-300 text-xs">{msg.errorText}</p>
                  {msg.retryOptions && (
                    <button
                      type="button"
                      onClick={() => executeCoachAction(msg.retryAction, msg.retryOptions)}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Assistant Response Message
          return (
            <div key={msg.id} className="flex justify-start animate-in fade-in duration-200">
              <div className="max-w-[95%] w-full bg-slate-900/80 border border-slate-800 rounded-2xl rounded-tl-sm p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">DSA AI Coach</span>
                    {msg.hintLevel && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Hint #{msg.hintLevel}
                      </span>
                    )}
                  </div>
                  {msg.source && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      via {msg.source}
                    </span>
                  )}
                </div>

                {/* Metadata Pills */}
                {(msg.topic || msg.pattern || msg.complexity?.time) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {msg.topic && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        <Layers className="w-3 h-3" /> {msg.topic}
                      </span>
                    )}
                    {msg.pattern && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        <Compass className="w-3 h-3" /> {msg.pattern}
                      </span>
                    )}
                    {msg.complexity?.time && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <Clock className="w-3 h-3" /> {msg.complexity.time}
                      </span>
                    )}
                  </div>
                )}

                {/* Text Content */}
                {msg.text && (
                  <div className="text-slate-200 text-xs leading-relaxed whitespace-pre-line space-y-2">
                    {msg.text}
                  </div>
                )}

                {/* Code Snippet Box */}
                {msg.code && (
                  <div className="rounded-xl border border-slate-800 bg-[#050811] overflow-hidden">
                    <div className="px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                        Optimal Solution ({codeLang})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(msg.code, msg.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? 'Copied' : 'Copy Code'}
                      </button>
                    </div>
                    <pre className="p-3 text-[11px] font-mono text-emerald-300/90 overflow-x-auto">
                      <code>{msg.code}</code>
                    </pre>
                  </div>
                )}

                {/* Verification Result Banner */}
                {msg.verification && (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    msg.verification.verified
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {msg.verification.verified ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <div>
                        <span className="font-bold">Sandbox Verification: {msg.verification.status}</span>
                        <span className="ml-2 text-slate-400 font-mono">
                          ({msg.verification.passed_tests}/{msg.verification.total_tests} tests passed)
                        </span>
                      </div>
                    </div>
                    {msg.verification.execution_time_ms !== undefined && (
                      <span className="font-mono text-[11px] text-slate-400">
                        {msg.verification.execution_time_ms} ms
                      </span>
                    )}
                  </div>
                )}

                {/* Progressive Next Hint Buttons for Hint responses */}
                {msg.intent === 'HINT' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => executeCoachAction('HINT')}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
                    >
                      Next Hint <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={resetHints}
                      disabled={loading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset Hints
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl rounded-tl-sm bg-slate-900/80 border border-slate-800 space-y-2.5 max-w-[80%]">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-cyan-500/40 animate-ping" />
                <span className="text-xs text-cyan-300 font-mono font-medium">
                  DSA AI Coach is thinking...
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded w-48 animate-pulse" />
              <div className="h-3 bg-slate-800/60 rounded w-32 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleCustomSubmit} className="p-3 bg-slate-900/70 border-t border-slate-800/80 flex gap-2 shrink-0">
        <input
          id="input-dsa-ai-query"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this problem, approach, code, or complexity..."
          disabled={loading}
          autoComplete="off"
          className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
        />
        <button
          id="btn-dsa-ai-ask"
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
