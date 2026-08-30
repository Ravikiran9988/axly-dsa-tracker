import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileCode, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export default function AdminQuestionModal({ isOpen, onClose, questionToEdit, question, onSaved, onSave, topics: topicsProp }) {
  const currentQuestion = questionToEdit || question || null;
  const afterSave = onSaved || onSave || (() => {});
  const [activeTab, setActiveTab] = useState('basic');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [topicId, setTopicId] = useState('');
  const [points, setPoints] = useState(20);
  const [estimatedTime, setEstimatedTime] = useState('30 mins');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('published');
  const [description, setDescription] = useState('');
  const [constraints, setConstraints] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [hints, setHints] = useState('');
  const [jsStarter, setJsStarter] = useState('');
  const [pyStarter, setPyStarter] = useState('');
  const [testCases, setTestCases] = useState([{ input:'', expected_output:'', is_hidden:false }]);
  const [topics, setTopics] = useState(topicsProp || []);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiCount, setAiCount] = useState(8);
  const [aiError, setAiError] = useState('');

  useEffect(() => { if (topicsProp) setTopics(topicsProp); }, [topicsProp]);

  useEffect(() => {
    if (!isOpen) return;
    api.getTopics().then(r => setTopics(r.data || topicsProp || [])).catch(() => {});
    if (currentQuestion) {
      setTitle(currentQuestion.title || ''); setDifficulty(currentQuestion.difficulty || 'easy'); setTopicId(currentQuestion.topic_id || '');
      setPoints(currentQuestion.points || 20); setEstimatedTime(currentQuestion.estimated_time || '30 mins'); setDueDate(currentQuestion.due_date || '');
      setStatus(currentQuestion.status || 'published'); setDescription(currentQuestion.description || ''); setConstraints(currentQuestion.constraints || '');
      setInputFormat(currentQuestion.input_format || ''); setOutputFormat(currentQuestion.output_format || '');
      setHints(Array.isArray(currentQuestion.hints) ? currentQuestion.hints.join('\n') : (currentQuestion.hints || ''));
      const sc = currentQuestion.starter_code && typeof currentQuestion.starter_code === 'object' ? currentQuestion.starter_code : {};
      setJsStarter(sc.javascript || ''); setPyStarter(sc.python || '');
      api.getQuestionById(currentQuestion.id).then(r => { if (r.data?.test_cases?.length) setTestCases(r.data.test_cases); }).catch(() => {});
    } else {
      setTitle(''); setDifficulty('easy'); setTopicId(''); setPoints(20); setEstimatedTime('30 mins'); setDueDate(''); setStatus('published');
      setDescription(''); setConstraints(''); setInputFormat(''); setOutputFormat(''); setHints('');
      setJsStarter("const fs = require('fs');\n\nfunction solve(input) {\n  return input;\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(solve(input));");
      setPyStarter("import sys\n\ndef solve(raw):\n    return raw\n\nif __name__ == '__main__':\n    print(solve(sys.stdin.read().strip()))");
      setTestCases([{ input:'', expected_output:'', is_hidden:false }]);
    }
    setActiveTab('basic'); setAiError('');
  }, [isOpen, currentQuestion?.id]);

  async function generateWithAI() {
    if (!aiTopic.trim()) { setAiError('Select or enter a topic first.'); return; }
    setGenerating(true); setAiError('');
    try {
      const r = await api.generateAIQuestion({ topic: aiTopic.trim(), difficulty: aiDifficulty, count: Number(aiCount) });
      const d = r.data || {};
      setTitle(d.title || ''); setDifficulty(difficulty || aiDifficulty); setDescription(d.description || ''); setConstraints(d.constraints || '');
      setInputFormat(d.input_format || ''); setOutputFormat(d.output_format || '');
      setHints(Array.isArray(d.hints) ? d.hints.join('\n') : (d.hints || '')); setStatus('draft');
      if (d.starter_code && typeof d.starter_code === 'object') { setJsStarter(d.starter_code.javascript || ''); setPyStarter(d.starter_code.python || ''); }
      if (Array.isArray(d.test_cases)) setTestCases(d.test_cases.map(tc => ({ input:String(tc.input ?? ''), expected_output:String(tc.expected_output ?? ''), is_hidden:Boolean(tc.is_hidden) })));
      if (d.time_limit_ms) setEstimatedTime(`${Math.max(1, Math.round(Number(d.time_limit_ms)/60000))} mins`);
      const matching = topics.find(t => t.name?.toLowerCase() === aiTopic.trim().toLowerCase()); if (matching) setTopicId(matching.id);
      setActiveTab('basic');
    } catch (e) { setAiError(e.message || 'AI generation failed. Configure the LLM and try again.'); }
    finally { setGenerating(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault(); if (!title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const payload = { title:title.trim(), difficulty, topic_id:topicId || null, points:Number(points), estimated_time:estimatedTime, status,
        description:description.trim(), constraints:constraints.trim(), input_format:inputFormat.trim(), output_format:outputFormat.trim(), hints:hints.trim(),
        starter_code:{ javascript:jsStarter, python:pyStarter }, test_cases:testCases.filter(tc => String(tc.input).trim() || String(tc.expected_output).trim()) };
      if (dueDate) { payload.due_date = dueDate; }
      if (currentQuestion) await api.updateQuestion(currentQuestion.id, payload); else await api.createQuestion(payload);
      await afterSave(payload); onClose();
    } catch (e) { alert(e.message || 'Failed to save challenge.'); } finally { setSaving(false); }
  }

  const addTest = () => setTestCases(v => [...v, {input:'',expected_output:'',is_hidden:false}]);
  const removeTest = i => setTestCases(v => v.filter((_,idx) => idx !== i));
  const changeTest = (i,k,v) => setTestCases(prev => prev.map((tc,idx) => idx === i ? {...tc,[k]:v} : tc));
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              {currentQuestion ? 'Edit Challenge' : 'Create Coding Challenge'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Author manually or generate a complete language-independent draft with AI.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!currentQuestion && (
          <div className="m-5 p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <Sparkles className="w-4 h-4" /> AI Question Generator (Language-Independent)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <input
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="Topic e.g. Arrays, Trees, Dynamic Programming"
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
              />
              <select
                value={aiDifficulty}
                onChange={e => setAiDifficulty(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
              <button
                type="button"
                disabled={generating}
                onClick={generateWithAI}
                className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <label className="text-[11px] text-slate-400">Test cases count</label>
              <input
                type="number"
                min="2"
                max="20"
                value={aiCount}
                onChange={e => setAiCount(e.target.value)}
                className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
              />
              {aiError && <span className="text-[11px] text-rose-400">{aiError}</span>}
            </div>
          </div>
        )}

        <div className="px-5 border-b border-slate-800 flex items-center gap-5 bg-slate-950/40 text-xs">
          {['basic','coding','testcases'].map((tab,i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`py-3 font-semibold border-b-2 ${activeTab===tab ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400'}`}
            >
              {i+1}. {tab==='basic' ? 'Problem & Specs' : tab==='coding' ? 'Starter Code' : `Test Cases (${testCases.length})`}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[65vh] space-y-4 text-xs">
          {activeTab==='basic' && (
            <div className="space-y-4">
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Challenge title"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={difficulty}
                  onChange={e => {
                    const val = e.target.value;
                    setDifficulty(val);
                    const pts = val === 'easy' ? 10 : val === 'medium' ? 20 : 30;
                    setPoints(pts);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="easy">easy (10 pts)</option>
                  <option value="medium">medium (20 pts)</option>
                  <option value="hard">hard (30 pts)</option>
                </select>
                <select
                  value={topicId}
                  onChange={e => setTopicId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="">Select Topic</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input
                  type="number"
                  value={points}
                  onChange={e => setPoints(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  placeholder="Points"
                />
              </div>
              <textarea
                required
                rows={5}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Problem description"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <textarea
                  rows={3}
                  value={inputFormat}
                  onChange={e => setInputFormat(e.target.value)}
                  placeholder="Input format"
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
                <textarea
                  rows={3}
                  value={outputFormat}
                  onChange={e => setOutputFormat(e.target.value)}
                  placeholder="Output format"
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <textarea
                rows={3}
                value={constraints}
                onChange={e => setConstraints(e.target.value)}
                placeholder="Constraints"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
              <textarea
                rows={2}
                value={hints}
                onChange={e => setHints(e.target.value)}
                placeholder="Hints (optional)"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <div className="flex items-center gap-3">
                <label className="text-slate-400">Publishing status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="draft">Draft — review before publish</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          )}

          {activeTab==='coding' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">JavaScript / Node.js Template</label>
                <textarea
                  rows={9}
                  value={jsStarter}
                  onChange={e => setJsStarter(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Python 3 Template</label>
                <textarea
                  rows={9}
                  value={pyStarter}
                  onChange={e => setPyStarter(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-200 font-mono"
                />
              </div>
            </div>
          )}

          {activeTab==='testcases' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-400">Public cases are visible; hidden cases remain evaluation-only.</p>
                <button
                  type="button"
                  onClick={addTest}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {testCases.map((tc, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex justify-between">
                    <b className="text-white">Test Case #{i+1}</b>
                    <div className="flex gap-3 items-center">
                      <label className="text-amber-400">
                        <input
                          type="checkbox"
                          checked={Boolean(tc.is_hidden)}
                          onChange={e => changeTest(i, 'is_hidden', e.target.checked)}
                        /> Hidden
                      </label>
                      {testCases.length > 1 && (
                        <button type="button" onClick={() => removeTest(i)} className="text-rose-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <textarea
                      rows={3}
                      value={tc.input}
                      onChange={e => changeTest(i, 'input', e.target.value)}
                      placeholder="Input"
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-200 font-mono"
                    />
                    <textarea
                      rows={3}
                      value={tc.expected_output}
                      onChange={e => changeTest(i, 'expected_output', e.target.value)}
                      placeholder="Expected output"
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold disabled:opacity-50">
              {saving ? 'Saving...' : status === 'draft' ? 'Save Draft' : currentQuestion ? 'Update Challenge' : 'Publish Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
