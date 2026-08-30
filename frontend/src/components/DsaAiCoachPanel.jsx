import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  Sparkles, HelpCircle, BookOpen, Compass, Code2, Clock, CheckCircle2,
  Bug, Copy, Check, AlertCircle, Layers,
  Terminal, ShieldCheck, XCircle, Send, User, RotateCcw, Trash2,
  BookMarked, ChevronDown, MessageSquare
} from 'lucide-react';
import { api } from '../services/api';

const HELP_ACTIONS = [
  { id: 'HINT',        label: 'Hint',        icon: HelpCircle,  emoji: '💡', group: 'primary',   color: 'text-amber-400  border-amber-500/30  bg-amber-500/10  hover:bg-amber-500/20'  },
  { id: 'APPROACH',    label: 'Approach',    icon: Compass,     emoji: '🧠', group: 'primary',   color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20' },
  { id: 'EXPLAIN',     label: 'Explain',     icon: BookOpen,    emoji: '📖', group: 'primary',   color: 'text-cyan-400   border-cyan-500/30   bg-cyan-500/10   hover:bg-cyan-500/20'   },
  { id: 'SOLUTION',    label: 'Solution',    icon: Code2,       emoji: '💻', group: 'secondary', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' },
  { id: 'COMPLEXITY',  label: 'Complexity',  icon: Clock,       emoji: '⏱', group: 'secondary', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20' },
  { id: 'DEBUG',       label: 'Debug',       icon: Bug,         emoji: '🐛', group: 'code',      color: 'text-rose-400   border-rose-500/30   bg-rose-500/10   hover:bg-rose-500/20'   },
  { id: 'CODE_REVIEW', label: 'Review Code', icon: ShieldCheck, emoji: '🔍', group: 'code',      color: 'text-blue-400   border-blue-500/30   bg-blue-500/10   hover:bg-blue-500/20'   }
];

const NEXT_ACTIONS_MAP = {
  EXPLAIN:     ['HINT', 'APPROACH', 'SOLUTION', 'COMPLEXITY'],
  HINT:        ['HINT', 'APPROACH', 'EXPLAIN', 'SOLUTION'],
  APPROACH:    ['HINT', 'EXPLAIN', 'SOLUTION', 'COMPLEXITY'],
  SOLUTION:    ['COMPLEXITY', 'CODE_REVIEW', 'DEBUG', 'EXPLAIN'],
  COMPLEXITY:  ['APPROACH', 'SOLUTION', 'EXPLAIN'],
  DEBUG:       ['CODE_REVIEW', 'APPROACH', 'SOLUTION', 'COMPLEXITY'],
  CODE_REVIEW: ['DEBUG', 'APPROACH', 'COMPLEXITY', 'SOLUTION']
};

const CODE_ATTACHED_NEXT_ACTIONS = ['DEBUG', 'CODE_REVIEW', 'APPROACH', 'SOLUTION'];

const STARTER_SUGGESTIONS = [
  {
    title: 'Explain a concept',
    subtitle: 'Understand underlying mechanics',
    icon: BookOpen,
    action: 'EXPLAIN',
    getQuery: (p) => p ? `Explain the core concept and mechanism of ${p.title}` : 'Explain the Breadth-First Search (BFS) graph traversal algorithm'
  },
  {
    title: 'Find an approach',
    subtitle: 'Optimal algorithm & pattern',
    icon: Compass,
    action: 'APPROACH',
    getQuery: (p) => p ? `What is the optimal step-by-step approach for ${p.title}?` : 'How do I identify when to use a Two-Pointer technique vs Sliding Window?'
  },
  {
    title: 'Debug my code',
    subtitle: 'Locate bugs & logic issues',
    icon: Bug,
    action: 'DEBUG',
    attachCode: true,
    getQuery: (p) => p ? `Debug my solution for ${p.title} and identify logic errors` : 'Why is my recursive function causing a maximum call stack exceeded error?'
  },
  {
    title: 'Analyze complexity',
    subtitle: 'Time & space Big-O analysis',
    icon: Clock,
    action: 'COMPLEXITY',
    getQuery: (p) => p ? `What are the time and space complexities of ${p.title}?` : 'What is the time complexity of QuickSort in average and worst cases?'
  }
];

const SOURCE_CONFIG = {
  'Knowledge Base':     { cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  'Knowledge Graph':    { cls: 'text-cyan-400    bg-cyan-500/10    border-cyan-500/20'    },
  'AI Generated':       { cls: 'text-indigo-400  bg-indigo-500/10  border-indigo-500/20'  },
  'Cached Response':    { cls: 'text-slate-400   bg-slate-800      border-slate-700'      },
  'AI Unavailable':     { cls: 'text-rose-400    bg-rose-500/10    border-rose-500/20'    },
  'Verified by Sandbox':{ cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
};

const DIFFICULTY_COLORS = {
  easy:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-amber-400   bg-amber-500/10   border-amber-500/20',
  hard:   'text-rose-400    bg-rose-500/10    border-rose-500/20'
};

function MarkdownMessage({ content }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none dsa-ai-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => <h1 className="text-sm font-bold text-white mt-3 mb-1.5 border-b border-slate-700/80 pb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[13px] font-bold text-cyan-300 mt-3 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-bold text-slate-200 mt-2 mb-1">{children}</h3>,
          p:  ({ children }) => <p className="text-xs text-slate-200 leading-relaxed mb-2">{children}</p>,
          ul: ({ children }) => <ul className="text-xs text-slate-200 list-disc list-inside space-y-1 mb-2 pl-1">{children}</ul>,
          ol: ({ children }) => <ol className="text-xs text-slate-200 list-decimal list-inside space-y-1 mb-2 pl-1">{children}</ol>,
          li: ({ children }) => <li className="text-xs text-slate-200 leading-relaxed">{children}</li>,
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={`${className || ''} text-[11px] leading-relaxed`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <div className="relative my-2 rounded-xl border border-slate-800 bg-[#050811] overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-cyan-500" />
                <span className="text-[10px] font-mono text-slate-400">code</span>
              </div>
              <pre className="p-3 overflow-x-auto text-[11px] font-mono text-emerald-300/90">{children}</pre>
            </div>
          ),
          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
          em:     ({ children }) => <em className="italic text-slate-300">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan-500/40 pl-3 my-2 text-slate-400 italic text-xs">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-[11px] border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="px-2 py-1 bg-slate-800 text-slate-300 font-bold text-left border border-slate-700">{children}</th>,
          td: ({ children }) => <td className="px-2 py-1 text-slate-300 border border-slate-800">{children}</td>,
          hr: () => <hr className="border-slate-700 my-3" />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function DsaAiCoachPanel({ problem, currentCode = '', language = 'javascript' }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [userCode, setUserCode] = useState(currentCode || '');
  const [codeLang, setCodeLang] = useState(language || 'javascript');
  const [prevProblemId, setPrevProblemId] = useState(problem?.id || null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback((force = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (force || distanceFromBottom < 250) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (currentCode && !userCode) {
      setUserCode(currentCode);
    }
  }, [currentCode]);

  useEffect(() => {
    const newId = problem?.id || null;
    if (newId !== prevProblemId) {
      setPrevProblemId(newId);
      if (messages.length > 0) {
        const systemNote = {
          id: `sys-${Date.now()}`,
          role: 'system',
          text: problem
            ? `Context switched to: **${problem.title}**`
            : 'No problem selected — now in General DSA mode.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemNote]);
      }
      setHintLevel(0);
    }
  }, [problem?.id]);

  const buildConversationHistory = useCallback(() => {
    return messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map(m => ({
        role: m.role,
        content: m.role === 'user' ? (m.text || '') : (m.text || m.errorText || '')
      }))
      .filter(m => m.content && m.content.trim().length > 0);
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    setHintLevel(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Submit custom query handler (Ask First Flow)
  const handleCustomSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const submittedMessage = query.trim();
    if (!submittedMessage || loading) return;

    // Immediately clear input field
    setQuery('');

    const attachedCode = (showCodeEditor && userCode.trim()) ? userCode.trim() : (currentCode || '');

    const userMsgId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const userMessageObj = {
      id: userMsgId,
      role: 'user',
      text: submittedMessage,
      code: attachedCode || undefined,
      codeLang,
      pendingAction: true,
      selectedAction: null,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessageObj]);
    setTimeout(() => scrollToBottom(true), 50);
  };

  // Execute coach request for a turn
  const executeActionRequest = async (turnId, actionId, questionText, codeOverride) => {
    setLoading(true);

    try {
      const conversationHistory = buildConversationHistory();
      const attachedCode = codeOverride || (showCodeEditor ? userCode : currentCode);

      const res = await api.getDsaAiCoach({
        question: questionText || (problem ? `Help with ${problem.title}` : 'Help with this problem'),
        problemId: problem?.id,
        action: actionId,
        language: codeLang,
        code: (actionId === 'CODE_REVIEW' || actionId === 'DEBUG' || attachedCode) ? (attachedCode || undefined) : undefined,
        hintIndex: actionId === 'HINT' ? hintLevel : 0,
        verify: actionId === 'SOLUTION',
        conversationHistory
      });

      const aiResponseData = res.data || {};

      if (actionId === 'HINT') {
        setHintLevel(prev => prev + 1);
      }

      const sourceLabel = aiResponseData.displaySource || aiResponseData.source || '';

      const aiMessageObj = {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        turnId,
        role: 'assistant',
        text: aiResponseData.answer || 'Here is the requested DSA guidance.',
        data: aiResponseData,
        topic: aiResponseData.topic,
        pattern: aiResponseData.pattern,
        complexity: aiResponseData.complexity,
        code: aiResponseData.code,
        verification: aiResponseData.verification,
        source: aiResponseData.source,
        displaySource: sourceLabel,
        intent: aiResponseData.intent || actionId,
        hintLevel: actionId === 'HINT' ? (hintLevel + 1) : null,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessageObj]);
    } catch (err) {
      let errMsg = 'Unable to generate a response right now. Please try again.';
      if (err.status === 429 || err.code === 'RATE_LIMITED') {
        errMsg = 'You have reached the AI request limit. Please wait a moment before trying again.';
      } else if (err.status === 401) {
        errMsg = 'Session expired. Please refresh the page and log in again.';
      } else if (err.message && !err.message.includes('stack') && !err.message.includes('SQL')) {
        errMsg = err.message;
      }

      const errorMsgObj = {
        id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        turnId,
        role: 'assistant',
        isError: true,
        errorText: errMsg,
        retryAction: actionId,
        retryTurnId: turnId,
        retryQuestionText: questionText,
        retryCode: codeOverride,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMsgObj]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // User selects an action from the initial "What do you need help with?" selector
  const handleSelectActionForTurn = async (turnId, actionId) => {
    if (loading) return;

    const targetTurn = messages.find(m => m.id === turnId);
    if (!targetTurn) return;

    const questionText = targetTurn.text;
    const attachedCode = targetTurn.code || (showCodeEditor ? userCode : currentCode);

    setMessages(prev => prev.map(m => {
      if (m.id === turnId) {
        return { ...m, pendingAction: false, selectedAction: actionId };
      }
      return m;
    }));

    await executeActionRequest(turnId, actionId, questionText, attachedCode);
  };

  // User clicks a contextual "What would you like to do next?" action after AI response
  const handleWhatNextAction = async (fromAiMsg, nextActionId) => {
    if (loading) return;

    const actCfg = HELP_ACTIONS.find(a => a.id === nextActionId);
    const parentUserTurn = messages.find(m => m.id === fromAiMsg.turnId);
    const originalQuestion = parentUserTurn?.text || (problem ? problem.title : 'this concept');
    const attachedCode = parentUserTurn?.code || (showCodeEditor ? userCode : currentCode);

    const isNextHint = nextActionId === 'HINT' && (fromAiMsg.intent === 'HINT' || fromAiMsg.hintLevel);
    const actionDisplayLabel = isNextHint ? 'Next Hint' : (actCfg?.label || nextActionId);

    // Create a new user turn in the chat for this follow-up action
    const newUserMsgId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newUserTurn = {
      id: newUserMsgId,
      role: 'user',
      text: originalQuestion,
      isFollowUpAction: true,
      actionLabel: actionDisplayLabel,
      selectedAction: nextActionId,
      pendingAction: false,
      code: attachedCode || undefined,
      codeLang,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserTurn]);
    setTimeout(() => scrollToBottom(true), 50);

    await executeActionRequest(newUserMsgId, nextActionId, originalQuestion, attachedCode);
  };

  // Starter suggestion click handler
  const handleStarterClick = (sugg) => {
    const q = sugg.getQuery(problem);
    if (sugg.attachCode) {
      setShowCodeEditor(true);
    }
    setQuery(q);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCustomSubmit(e);
    }
  };

  const handleCopyCode = (code, msgId) => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Compute what next actions for an AI response
  const getNextActionsForAiMsg = (aiMsg) => {
    if (aiMsg.isError) return [];
    const hasCode = Boolean(showCodeEditor || userCode || currentCode || aiMsg.code);
    if (hasCode && (aiMsg.intent === 'DEBUG' || aiMsg.intent === 'CODE_REVIEW')) {
      return CODE_ATTACHED_NEXT_ACTIONS;
    }
    const intentKey = (aiMsg.intent || 'EXPLAIN').toUpperCase();
    return NEXT_ACTIONS_MAP[intentKey] || ['HINT', 'APPROACH', 'SOLUTION', 'COMPLEXITY'];
  };

  const inputPlaceholder = problem
    ? 'Ask about this problem, approach, code, or complexity...'
    : 'Ask a DSA question or describe your problem...';

  const difficultyKey = (problem?.difficulty || '').toLowerCase();
  const difficultyColor = DIFFICULTY_COLORS[difficultyKey] || DIFFICULTY_COLORS.medium;

  return (
    <div className="flex flex-col h-full bg-[#080d1a] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* ─── Top Header Bar ─── */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">DSA AI Coach</h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shrink-0">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {problem?.title
                ? <span className="text-cyan-300/80">{problem.title}</span>
                : 'General DSA Question'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {messages.length > 0 && (
            <button
              id="btn-dsa-ai-clear"
              type="button"
              onClick={handleClearChat}
              title="Clear conversation"
              className="text-xs px-2.5 py-1.5 rounded-lg border bg-slate-800/60 border-slate-700 text-slate-400 hover:text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            id="btn-dsa-ai-attach-code"
            type="button"
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
              showCodeEditor
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3 h-3" />
            {showCodeEditor ? 'Hide Code' : 'Attach Code'}
          </button>
        </div>
      </div>

      {/* ─── Problem Context Card ─── */}
      {problem ? (
        <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/60 flex items-center gap-2 flex-wrap shrink-0 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-200">
            <BookMarked className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Problem:</span>
            <span className="font-semibold text-white truncate max-w-[180px]">{problem.title}</span>
          </div>
          {problem.difficulty && (
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${difficultyColor}`}>
              {problem.difficulty}
            </span>
          )}
          {problem.topic_name && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Layers className="w-2.5 h-2.5" />
              {problem.topic_name}
            </span>
          )}
          {problem.pattern_name && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Compass className="w-2.5 h-2.5" />
              {problem.pattern_name}
            </span>
          )}
        </div>
      ) : (
        <div className="px-4 py-1.5 bg-slate-900/30 border-b border-slate-800/40 flex items-center gap-2 text-xs text-slate-400 shrink-0">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span className="font-medium text-slate-300">General DSA Question</span>
        </div>
      )}

      {/* ─── Optional Attached Code Editor ─── */}
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
            rows={4}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-y"
          />
        </div>
      )}

      {/* ─── Main Conversation Stream ─── */}
      <div
        ref={messagesContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar"
      >
        {/* ─── Clean Empty State ─── */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-base font-bold text-white tracking-wide">
                DSA AI Coach
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Ask a question, paste code, or describe your DSA problem.
              </p>
            </div>

            <div className="w-full max-w-md space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left pl-1">
                Starter Suggestions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STARTER_SUGGESTIONS.map((sugg, i) => {
                  const Icon = sugg.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleStarterClick(sugg)}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group shadow-sm"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-cyan-500/10 text-cyan-400 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                          {sugg.title}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {sugg.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Messages List ─── */}
        {messages.map((msg) => {
          // ─ System Note ─
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="flex justify-center animate-in fade-in duration-200">
                <div className="text-[10px] text-slate-500 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800">
                  <MarkdownMessage content={msg.text} />
                </div>
              </div>
            );
          }

          // ─ User Message & Contextual Help Selection ─
          if (msg.role === 'user') {
            const selectedActCfg = HELP_ACTIONS.find(a => a.id === msg.selectedAction);

            return (
              <div key={msg.id} className="space-y-2 animate-in fade-in duration-200">
                {!msg.isFollowUpAction ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-cyan-500/10 border border-cyan-500/30 text-cyan-100 rounded-2xl rounded-tr-sm p-3.5 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-end gap-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                        <span>You</span>
                        <User className="w-3 h-3 text-cyan-400" />
                      </div>
                      <div className="text-xs text-white font-medium break-words leading-relaxed">
                        {msg.text}
                      </div>
                      {msg.code && (
                        <div className="mt-1 pt-1 border-t border-cyan-500/20 text-[10px] font-mono text-cyan-300/80 flex items-center gap-1">
                          <Terminal className="w-2.5 h-2.5" />
                          <span>Code attached ({msg.codeLang || 'javascript'})</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* ─── Initial Contextual Help Selector (Appears After Question) ─── */}
                {msg.pendingAction && !loading && (
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md animate-in fade-in duration-200">
                    <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>What do you need help with?</span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {HELP_ACTIONS.filter(a => a.group === 'primary').map((act) => (
                          <button
                            id={`btn-action-${act.id.toLowerCase()}`}
                            key={act.id}
                            type="button"
                            onClick={() => handleSelectActionForTurn(msg.id, act.id)}
                            disabled={loading}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${act.color} disabled:opacity-50 shadow-sm`}
                          >
                            <span>{act.emoji}</span>
                            <span>{act.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-0.5 border-t border-slate-800/60">
                        {HELP_ACTIONS.filter(a => a.group !== 'primary').map((act) => (
                          <button
                            id={`btn-action-${act.id.toLowerCase()}`}
                            key={act.id}
                            type="button"
                            onClick={() => handleSelectActionForTurn(msg.id, act.id)}
                            disabled={loading}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${act.color} disabled:opacity-50`}
                          >
                            <span>{act.emoji}</span>
                            <span>{act.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── Selected Action Indicator ─── */}
                {msg.selectedAction && selectedActCfg && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 pl-1">
                      <span>Selected:</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${selectedActCfg.color}`}>
                        <span>{selectedActCfg.emoji}</span>
                        <span>{msg.actionLabel || selectedActCfg.label}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // ─ Error Message ─
          if (msg.isError) {
            return (
              <div key={msg.id} className="flex justify-start animate-in fade-in duration-200">
                <div className="max-w-[90%] p-4 rounded-2xl rounded-tl-sm bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <div className="font-semibold">Unable to generate a response right now.</div>
                  </div>
                  <p className="text-slate-300 text-xs">{msg.errorText}</p>
                  {msg.retryAction && (
                    <button
                      type="button"
                      onClick={() => executeActionRequest(msg.retryTurnId, msg.retryAction, msg.retryQuestionText, msg.retryCode)}
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

          // ─ Assistant Response ─
          const sourceLabel = msg.displaySource || msg.source || '';
          const sourceCls = SOURCE_CONFIG[sourceLabel]?.cls || 'text-slate-400 bg-slate-800 border-slate-700';
          const nextActions = getNextActionsForAiMsg(msg);

          return (
            <div key={msg.id} className="flex justify-start animate-in fade-in duration-200">
              <div className="max-w-[95%] w-full bg-slate-900/80 border border-slate-800 rounded-2xl rounded-tl-sm p-4 space-y-3 shadow-lg">
                {/* Response header */}
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
                  {sourceLabel && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sourceCls}`}>
                      {sourceLabel}
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
                    {msg.complexity?.space && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20">
                        <ChevronDown className="w-3 h-3" /> {msg.complexity.space}
                      </span>
                    )}
                  </div>
                )}

                {/* Markdown-rendered AI text */}
                {msg.text && (
                  <div className="text-xs">
                    <MarkdownMessage content={msg.text} />
                  </div>
                )}

                {/* Standalone Code Snippet Box */}
                {msg.code && (
                  <div className="rounded-xl border border-slate-800 bg-[#050811] overflow-hidden">
                    <div className="px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                        Extracted Code ({codeLang})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(msg.code, msg.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
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
                      {msg.verification.verified
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <XCircle     className="w-4 h-4 text-rose-400"    />}
                      <div>
                        <span className="font-bold">Sandbox: {msg.verification.status}</span>
                        <span className="ml-2 text-slate-400 font-mono">
                          ({msg.verification.passed_tests}/{msg.verification.total_tests} tests)
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

                {/* ─── Contextual "What would you like to do next?" Section ─── */}
                {nextActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>What would you like to do next?</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {nextActions.map((actionId) => {
                        const actCfg = HELP_ACTIONS.find(a => a.id === actionId);
                        if (!actCfg) return null;
                        const isNextHint = actionId === 'HINT' && (msg.intent === 'HINT' || msg.hintLevel);
                        const labelText = isNextHint ? 'Next Hint' : actCfg.label;

                        return (
                          <button
                            id={`btn-next-action-${actionId.toLowerCase()}`}
                            key={actionId}
                            type="button"
                            onClick={() => handleWhatNextAction(msg, actionId)}
                            disabled={loading}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${actCfg.color} disabled:opacity-50 shadow-sm`}
                          >
                            <span>{actCfg.emoji}</span>
                            <span>{labelText}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ─── Loading Indicator ─── */}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl rounded-tl-sm bg-slate-900/80 border border-slate-800 space-y-2.5 max-w-[80%] shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-cyan-500/40 animate-ping" />
                <span className="text-xs text-cyan-300 font-mono font-medium">
                  AI COACH: Thinking...
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded w-48 animate-pulse" />
              <div className="h-3 bg-slate-800/60 rounded w-32 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Bottom Input Form ─── */}
      <form onSubmit={handleCustomSubmit} className="p-3 bg-slate-900/70 border-t border-slate-800/80 flex gap-2 shrink-0">
        <input
          id="input-dsa-ai-query"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          disabled={loading}
          autoComplete="off"
          className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50 shadow-inner"
        />
        <button
          id="btn-dsa-ai-ask"
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-600/20 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          Ask
        </button>
      </form>
    </div>
  );
}
