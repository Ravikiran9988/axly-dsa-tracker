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
        const handlers = `  const buildAiAuthoringPayload = () => ({\n    ...formData,\n    topic: formData.topic_name || '',\n    pattern: formData.pattern_name || ''\n  });\n\n  const handleGenerateAiTestCases = async () => {\n    if (!formData.title.trim() || !formData.description.trim()) {\n      setError('Enter the challenge title and problem statement before generating test cases.');\n      return;\n    }\n    setAiTestCaseLoading(true);\n    setError(null);\n    try {\n      const res = await api.generateDailyChallengeTestCases(buildAiAuthoringPayload());\n      const generated = res?.data?.test_cases;\n      if (!Array.isArray(generated) || generated.length !== 4) throw new Error('AI did not return 4 test cases.');\n      setFormData(prev => ({\n        ...prev,\n        test_cases: generated.map((tc, idx) => ({\n          id: \`ai-tc-\${Date.now()}-\${idx}\`,\n          input: tc.input,\n          expected_output: tc.expected_output,\n          is_hidden: Boolean(tc.is_hidden)\n        }))\n      }));\n    } catch (err) {\n      setError(err.message || 'AI test case generation failed.');\n    } finally {\n      setAiTestCaseLoading(false);\n    }\n  };\n\n  const handleGenerateAiHints = async () => {\n    if (!formData.title.trim() || !formData.description.trim()) {\n      setError('Enter the challenge title and problem statement before generating hints.');\n      return;\n    }\n    setAiHintLoading(true);\n    setError(null);\n    try {\n      const res = await api.generateDailyChallengeHints(buildAiAuthoringPayload());\n      const generated = res?.data?.hints;\n      if (!Array.isArray(generated) || generated.length !== 3) throw new Error('AI did not return 3 progressive hints.');\n      setFormData(prev => ({ ...prev, hints: generated }));\n    } catch (err) {\n      setError(err.message || 'AI hint generation failed.');\n    } finally {\n      setAiHintLoading(false);\n    }\n  };\n\n`;
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

      // AdminDailyChallenge.jsx already contains the final two-mode UI directly:
      // AI Assist + Auto Fill. Do not transform this file here; the old transform
      // depended on exact source formatting and was causing Vercel build failures.
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