import React, { useState, useEffect } from 'react';
import { X, Code2, AlertCircle, Play, CheckCircle2, FlaskConical, Beaker, FileCode } from 'lucide-react';
import { api } from '../services/api';

export default function AdminQuestionPreview({ itemId, type, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeLang, setActiveLang] = useState('');
  const [activeTab, setActiveTab] = useState('problem'); // 'problem', 'code', 'solution'

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        let res;
        if (type === 'daily') {
          res = await api.getDailyChallenge(itemId);
        } else {
          res = await api.getQuestionById(itemId);
        }
        const fetched = res.data;
        setData(fetched);
        
        // Ensure JSON fields are parsed (helpful for newly AI-generated questions)
        ['test_cases', 'examples', 'hints', 'starter_code', 'reference_solution'].forEach(key => {
          if (typeof fetched[key] === 'string') {
            try {
              fetched[key] = JSON.parse(fetched[key]);
            } catch(e) {
              // If it's a raw string and not JSON (e.g. just raw text for hints), leave it as is or wrap it.
              if (key === 'hints') {
                fetched[key] = [fetched[key]];
              }
            }
          }
        });

        // Setup initial language if starter code exists
        if (fetched.starter_code && typeof fetched.starter_code === 'object') {
          const langs = Object.keys(fetched.starter_code);
          if (langs.length > 0) {
            setActiveLang(langs[0]);
          }
        }
      } catch (err) {
        console.error('Preview error:', err);
        setError('Failed to load full question details.');
      } finally {
        setLoading(false);
      }
    };
    if (itemId) fetchDetails();
  }, [itemId, type]);

  if (!itemId) return null;

  const difficultyColors = {
    easy: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    medium: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    hard: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-theme-border">
          <div className="flex flex-col gap-1 min-w-0 flex-1 mr-4">
            {loading ? (
              <div className="h-6 w-48 bg-theme-surface2 rounded animate-pulse" />
            ) : data ? (
              <div className="flex items-center gap-3 min-w-0">
                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${difficultyColors[data.difficulty?.toLowerCase()] || ''}`}>
                  {data.difficulty}
                </span>
                <h3 className="text-lg font-bold text-theme-text1 truncate" title={data.title}>{data.title}</h3>
                <span className="shrink-0 text-xs text-theme-text3 font-mono">({type === 'daily' ? 'Daily' : 'Bank'})</span>
              </div>
            ) : (
              <h3 className="text-lg font-bold text-theme-text1">Loading Preview...</h3>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 p-2 rounded-xl text-theme-text2 hover:text-theme-text1 hover:bg-theme-surface2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-400 bg-rose-500/10 m-6 rounded-xl border border-rose-500/20 flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Navigation Tabs */}
              <div className="flex border-b border-theme-border px-6 pt-4 gap-6 shrink-0 overflow-x-auto custom-scrollbar">
                <button
                  onClick={() => setActiveTab('problem')}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'problem' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-theme-text2 hover:text-theme-text1'}`}
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4" /> Description & Specs
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'code' ? 'border-amber-400 text-amber-400' : 'border-transparent text-theme-text2 hover:text-theme-text1'}`}
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4" /> Starter Code
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('solution')}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'solution' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-emerald-600 hover:text-emerald-500'}`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Admin Solution
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-theme-base">
                
                {/* TAB: PROBLEM DESCRIPTION */}
                {activeTab === 'problem' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-theme-surface border border-theme-border">
                        <div className="text-[10px] uppercase text-theme-text3 font-bold mb-1">Topic</div>
                        <div className="text-sm font-semibold text-theme-text1">{data.topic_name || data.topic_id || '—'}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-theme-surface border border-theme-border">
                        <div className="text-[10px] uppercase text-theme-text3 font-bold mb-1">Pattern</div>
                        <div className="text-sm font-semibold text-theme-text1">{data.pattern_name || data.pattern_id || '—'}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-theme-surface border border-theme-border">
                        <div className="text-[10px] uppercase text-theme-text3 font-bold mb-1">Est. Time</div>
                        <div className="text-sm font-semibold text-theme-text1">{data.estimated_time || '15 mins'}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-theme-surface border border-theme-border">
                        <div className="text-[10px] uppercase text-theme-text3 font-bold mb-1">Status</div>
                        <div className="text-sm font-semibold text-theme-text1 capitalize">{data.status || 'published'}</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-mono font-bold text-theme-text2 uppercase tracking-wider">Problem Description</h4>
                      <div className="text-sm text-theme-text1 whitespace-pre-line leading-relaxed bg-theme-surface p-4 rounded-xl border border-theme-border">
                        {data.description || data.problem_statement || 'No description provided.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {data.input_format && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono font-bold text-theme-text2 uppercase tracking-wider">Input Format</h4>
                          <div className="text-xs font-mono text-theme-text2 bg-theme-surface p-3 rounded-xl border border-theme-border whitespace-pre-line">
                            {data.input_format}
                          </div>
                        </div>
                      )}
                      {data.output_format && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono font-bold text-theme-text2 uppercase tracking-wider">Output Format</h4>
                          <div className="text-xs font-mono text-theme-text2 bg-theme-surface p-3 rounded-xl border border-theme-border whitespace-pre-line">
                            {data.output_format}
                          </div>
                        </div>
                      )}
                    </div>

                    {data.constraints && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-mono font-bold text-theme-text2 uppercase tracking-wider">Constraints</h4>
                        <div className="text-xs font-mono text-theme-text2 bg-theme-surface p-3 rounded-xl border border-theme-border whitespace-pre-line">
                          {data.constraints}
                        </div>
                      </div>
                    )}

                    {/* Test Cases */}
                    {data.test_cases && data.test_cases.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-theme-border">
                        <h4 className="text-xs font-mono font-bold flex items-center gap-2 text-indigo-400 uppercase tracking-wider">
                          <Beaker className="w-4 h-4" /> Test Cases ({data.test_cases.length})
                        </h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {data.test_cases.map((tc, idx) => (
                            <div key={idx} className="bg-theme-surface border border-theme-border rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-theme-text2 uppercase">Case {idx + 1}</span>
                                {tc.is_hidden && <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">Hidden</span>}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-[10px] text-theme-text3 mb-1">Input</div>
                                  <pre className="text-xs font-mono bg-theme-base p-2 rounded border border-theme-border whitespace-pre-wrap overflow-x-auto">{tc.input}</pre>
                                </div>
                                <div>
                                  <div className="text-[10px] text-theme-text3 mb-1">Expected Output</div>
                                  <pre className="text-xs font-mono bg-theme-base p-2 rounded border border-theme-border whitespace-pre-wrap overflow-x-auto">{tc.expected_output}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Examples */}
                    {data.examples && data.examples.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-theme-border">
                        <h4 className="text-xs font-mono font-bold text-theme-text2 uppercase tracking-wider">Examples</h4>
                        <div className="space-y-4">
                          {data.examples.map((ex, idx) => (
                            <div key={idx} className="bg-theme-surface border border-theme-border rounded-xl p-4 space-y-2">
                              <span className="text-[11px] font-bold text-theme-text2 uppercase">Example {idx + 1}</span>
                              <div>
                                <span className="text-[10px] text-theme-text3">Input:</span>
                                <pre className="text-xs font-mono">{ex.input}</pre>
                              </div>
                              <div>
                                <span className="text-[10px] text-theme-text3">Output:</span>
                                <pre className="text-xs font-mono">{ex.output}</pre>
                              </div>
                              {ex.explanation && (
                                <div>
                                  <span className="text-[10px] text-theme-text3">Explanation:</span>
                                  <p className="text-xs text-theme-text2 mt-1">{ex.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hints */}
                    {data.hints && data.hints.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-theme-border">
                        <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Hints</h4>
                        <div className="space-y-2">
                          {data.hints.map((hint, idx) => (
                            <div key={idx} className="bg-theme-surface border border-theme-border rounded-xl p-3 text-sm text-theme-text2">
                              <span className="font-bold text-amber-400 mr-2">Hint {idx + 1}:</span>
                              {hint}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: STARTER CODE */}
                {activeTab === 'code' && (
                  <div className="space-y-4 h-full flex flex-col">
                    {!data.starter_code || Object.keys(data.starter_code).length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-theme-text3 bg-theme-surface rounded-xl border border-theme-border border-dashed p-8">
                        <Code2 className="w-8 h-8 mb-3 opacity-50" />
                        <p className="font-bold uppercase tracking-wider text-xs">Starter Code Unavailable</p>
                        <p className="text-xs mt-1">This question lacks language-specific starter templates.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0 custom-scrollbar">
                          {Object.keys(data.starter_code).map(lang => (
                            <button
                              key={lang}
                              onClick={() => setActiveLang(lang)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors border ${activeLang === lang ? 'bg-amber-400/10 text-amber-400 border-amber-400/30' : 'bg-theme-surface text-theme-text2 border-theme-border hover:bg-theme-surface2'}`}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                        <div className="flex-1 min-h-[300px]">
                          <pre className="h-full bg-[#0d1117] text-[#c9d1d9] p-4 rounded-xl overflow-auto text-sm font-mono border border-theme-border custom-scrollbar">
                            {data.starter_code[activeLang]}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB: SOLUTION */}
                {activeTab === 'solution' && (
                  <div className="space-y-6">
                    <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Admin Only Access</span>
                      </div>
                      <p className="text-xs text-emerald-500/80">Students do not have access to this reference solution or editorial context.</p>
                    </div>

                    {(data.editorial || data.solution_approach) ? (
                      <div className="space-y-3">
                        <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Editorial / Solution Approach</h4>
                        <div className="text-sm text-theme-text2 whitespace-pre-line leading-relaxed bg-theme-surface p-4 rounded-xl border border-theme-border">
                          {data.editorial || data.solution_approach}
                        </div>
                      </div>
                    ) : null}

                    {data.reference_solution && Object.keys(data.reference_solution).length > 0 ? (
                      <div className="space-y-3 pt-4 border-t border-theme-border">
                        <h4 className="text-xs font-mono font-bold flex items-center gap-2 text-emerald-400 uppercase tracking-wider">
                          <Play className="w-4 h-4" /> Reference Solution
                        </h4>
                        <div className="space-y-4">
                          {Object.entries(data.reference_solution).map(([lang, code]) => (
                            <div key={lang} className="space-y-2">
                              <span className="text-xs font-bold text-theme-text3 uppercase px-1">{lang}</span>
                              <pre className="bg-[#0d1117] text-emerald-400/90 p-4 rounded-xl overflow-auto text-sm font-mono border border-emerald-900/30 custom-scrollbar">
                                {code}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-theme-text3 italic">No executable reference solution provided for this question.</div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
