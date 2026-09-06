import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function dailyChallengeAiAuthoringPlugin() {
  return {
    name: 'axly-daily-challenge-ai-authoring',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('/AdminDailyChallengeModal.jsx')) {
        if (code.includes('handleGenerateAiTestCases')) return null;

        const stateMarker = "  const [recReason, setRecReason] = useState('');\n";
        const stateInsert = `${stateMarker}  const [aiTestCaseLoading, setAiTestCaseLoading] = useState(false);\n  const [aiHintLoading, setAiHintLoading] = useState(false);\n`;
        if (!code.includes(stateMarker)) throw new Error('Daily Challenge modal state marker not found');
        code = code.replace(stateMarker, stateInsert);

        const handlerMarker = '  const groupedTopics = useMemo(() => {';
        const handlers = `  const buildAiAuthoringPayload = () => ({\n    ...formData,\n    topic: formData.topic_name || '',\n    pattern: formData.pattern_name || ''\n  });\n\n  const handleGenerateAiTestCases = async () => {\n    if (!formData.title.trim() || !formData.description.trim()) {\n      setError('Enter the challenge title and problem statement before generating test cases.');\n      return;\n    }\n    setAiTestCaseLoading(true);\n    setError(null);\n    try {\n      const res = await api.generateDailyChallengeTestCases(buildAiAuthoringPayload());\n      const generated = res?.data?.test_cases;\n      if (!Array.isArray(generated) || generated.length !== 4) throw new Error('AI did not return 4 verified test cases.');\n      setFormData(prev => ({\n        ...prev,\n        test_cases: generated.map((tc, idx) => ({\n          id: \`ai-tc-\${Date.now()}-\${idx}\`,\n          input: tc.input,\n          expected_output: tc.expected_output,\n          is_hidden: Boolean(tc.is_hidden)\n        }))\n      }));\n    } catch (err) {\n      setError(err.message || 'AI test case generation failed.');\n    } finally {\n      setAiTestCaseLoading(false);\n    }\n  };\n\n  const handleGenerateAiHints = async () => {\n    if (!formData.title.trim() || !formData.description.trim()) {\n      setError('Enter the challenge title and problem statement before generating hints.');\n      return;\n    }\n    setAiHintLoading(true);\n    setError(null);\n    try {\n      const res = await api.generateDailyChallengeHints(buildAiAuthoringPayload());\n      const generated = res?.data?.hints;\n      if (!Array.isArray(generated) || generated.length !== 3) throw new Error('AI did not return 3 progressive hints.');\n      setFormData(prev => ({ ...prev, hints: generated }));\n    } catch (err) {\n      setError(err.message || 'AI hint generation failed.');\n    } finally {\n      setAiHintLoading(false);\n    }\n  };\n\n`;
        if (!code.includes(handlerMarker)) throw new Error('Daily Challenge modal handler marker not found');
        code = code.replace(handlerMarker, handlers + handlerMarker);

        const testToolbar = `                    <button\n                      type="button"\n                      onClick={addTestCase}\n                      className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1"\n                    >\n                      <Plus className="w-3 h-3" /> Add Test Case\n                    </button>`;
        const testToolbarReplacement = `                    <div className="flex items-center gap-2">\n                      <button\n                        type="button"\n                        onClick={handleGenerateAiTestCases}\n                        disabled={aiTestCaseLoading}\n                        className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1 border-indigo-500/40 text-indigo-300 hover:text-indigo-200"\n                      >\n                        {aiTestCaseLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-400" />}\n                        {aiTestCaseLoading ? 'Generating...' : 'AI Generate Test Cases'}\n                      </button>\n                      <button\n                        type="button"\n                        onClick={addTestCase}\n                        className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1"\n                      >\n                        <Plus className="w-3 h-3" /> Add Test Case\n                      </button>\n                    </div>`;
        if (!code.includes(testToolbar)) throw new Error('Daily Challenge test case toolbar marker not found');
        code = code.replace(testToolbar, testToolbarReplacement);

        const hintToolbar = `                      <button\n                        type="button"\n                        onClick={addHint}\n                        className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1"\n                      >\n                        <Plus className="w-3 h-3" /> Add Hint\n                      </button>`;
        const hintToolbarReplacement = `                      <div className="flex items-center gap-2">\n                        <button\n                          type="button"\n                          onClick={handleGenerateAiHints}\n                          disabled={aiHintLoading}\n                          className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1 border-indigo-500/40 text-indigo-300 hover:text-indigo-200"\n                        >\n                          {aiHintLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-400" />}\n                          {aiHintLoading ? 'Generating...' : 'AI Generate Hints'}\n                        </button>\n                        <button\n                          type="button"\n                          onClick={addHint}\n                          className="btn-secondary btn-sm text-[11px] inline-flex items-center gap-1"\n                        >\n                          <Plus className="w-3 h-3" /> Add Hint\n                        </button>\n                      </div>`;
        if (!code.includes(hintToolbar)) throw new Error('Daily Challenge hint toolbar marker not found');
        code = code.replace(hintToolbar, hintToolbarReplacement);

        return { code, map: null };
      }

      if (id.endsWith('/AdminDailyChallenge.jsx')) {
        if (code.includes('automationProgressStage')) return null;

        // Keep AI Assist and Auto Fill modes; remove only the Manual mode button from the UI.
        const manualModeButton = "                { key: 'manual', label: 'Manual' },\n";
        if (code.includes(manualModeButton)) {
          code = code.replace(manualModeButton, '');
        }

        const stateMarker = "  const [showLogsModal, setShowLogsModal] = useState(false);\n";
        const stateInsert = `${stateMarker}  const [automationProgressStage, setAutomationProgressStage] = useState('Starting pipeline');\n  const [automationElapsed, setAutomationElapsed] = useState(0);\n`;
        if (!code.includes(stateMarker)) throw new Error('Daily Challenge automation state marker not found');
        code = code.replace(stateMarker, stateInsert);

        const effectMarker = "  useEffect(() => {\n    loadData();\n  }, [difficulty, topicId, statusFilter, dateFilter]);\n";
        const progressEffect = `${effectMarker}\n  useEffect(() => {\n    if (!isRunningAutomation) {\n      setAutomationElapsed(0);\n      return undefined;\n    }\n\n    const startedAt = Date.now();\n    const stageTimer = window.setInterval(() => {\n      const elapsed = Math.floor((Date.now() - startedAt) / 1000);\n      setAutomationElapsed(elapsed);\n      const stages = [\n        'Generating challenge',\n        'Checking schema & uniqueness',\n        'Sandbox verifying solution',\n        'Trying next fallback if needed',\n        'Finalizing result'\n      ];\n      setAutomationProgressStage(stages[Math.min(Math.floor(elapsed / 3), stages.length - 1)]);\n    }, 1000);\n\n    const poll = window.setInterval(async () => {\n      try {\n        const res = await api.getDailyChallengeAutomationStatus();\n        const status = res?.data?.settings?.last_run_status;\n        if (status && status !== 'running') {\n          setAutomationProgressStage(status === 'success' ? 'Challenge generated successfully' : 'Pipeline finished with no valid challenge');\n          setIsRunningAutomation(false);\n          await loadAutomationStatus();\n          await loadData();\n        }\n      } catch (_) {}\n    }, 1000);\n\n    return () => {\n      window.clearInterval(stageTimer);\n      window.clearInterval(poll);\n    };\n  }, [isRunningAutomation]);\n`;
        if (!code.includes(effectMarker)) throw new Error('Daily Challenge data effect marker not found');
        code = code.replace(effectMarker, progressEffect);

        const statusMarker = "        setAutomationLogs(res.data.recent_logs || []);\n";
        const statusReplacement = `${statusMarker}        setIsRunningAutomation(res.data.settings?.last_run_status === 'running');\n`;
        if (!code.includes(statusMarker)) throw new Error('Daily Challenge automation status marker not found');
        code = code.replace(statusMarker, statusReplacement);

        const progressStartMarker = "  const handleRunAutoFillNow = async () => {\n    setIsRunningAutomation(true);\n    setActionError(null);\n";
        const progressStartReplacement = `${progressStartMarker}    setAutomationProgressStage('Starting pipeline');\n    setAutomationElapsed(0);\n`;
        if (!code.includes(progressStartMarker)) throw new Error('Daily Challenge automation handler start marker not found');
        code = code.replace(progressStartMarker, progressStartReplacement);

        const handlerCatchMarker = "    } catch (err) {\n      setActionError(err.message || 'Automatic challenge generation failed. Admin action required.');\n";
        const handlerCatchReplacement = `${handlerCatchMarker}      setIsRunningAutomation(false);\n`;
        if (!code.includes(handlerCatchMarker)) throw new Error('Daily Challenge automation catch marker not found');
        code = code.replace(handlerCatchMarker, handlerCatchReplacement);

        const handlerEndMarker = "    } finally {\n      setIsRunningAutomation(false);\n    }\n  };";
        const handlerEndReplacement = "    } finally {\n      // The API starts a background job. Polling owns the transition out of RUNNING.\n    }\n  };";
        if (!code.includes(handlerEndMarker)) throw new Error('Daily Challenge automation handler end marker not found');
        code = code.replace(handlerEndMarker, handlerEndReplacement);

        const panelMarker = "      <div className=\"p-5 rounded-3xl bg-slate-900/80 border border-purple-500/30 space-y-4 backdrop-blur-xl\">";
        const progressPanel = `${panelMarker}\n        {isRunningAutomation && (\n          <div className=\"rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4 space-y-3\">\n            <div className=\"flex items-center justify-between gap-3\">\n              <div className=\"flex items-center gap-2\">\n                <Activity className=\"w-4 h-4 text-purple-400 animate-pulse\" />\n                <span className=\"text-xs font-bold text-white\">AI PIPELINE IN PROGRESS</span>\n              </div>\n              <span className=\"text-[10px] font-mono text-purple-300\">{Math.floor(automationElapsed / 60)}:{String(automationElapsed % 60).padStart(2, '0')}</span>\n            </div>\n            <div className=\"h-2 w-full overflow-hidden rounded-full bg-slate-800\">\n              <div className=\"h-full w-2/5 rounded-full bg-purple-500 animate-[pulse_1.4s_ease-in-out_infinite]\" />\n            </div>\n            <div className=\"flex items-center justify-between gap-3 text-[10px] font-mono\">\n              <span className=\"text-slate-300\">{automationProgressStage}</span>\n              <span className=\"text-slate-500\">Live status</span>\n            </div>\n          </div>\n        )}`;
        if (!code.includes(panelMarker)) throw new Error('Daily Challenge automation panel marker not found');
        code = code.replace(panelMarker, progressPanel);

        return { code, map: null };
      }

      return null;
    }
  };
}

export default defineConfig({
  plugins: [dailyChallengeAiAuthoringPlugin(), react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
});