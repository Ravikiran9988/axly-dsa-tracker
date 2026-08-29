const { getRepository } = require('../db/repositoryFactory');
const { AppError } = require('../middleware/errorHandler');

const repo = getRepository();

function extractJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error('LLM returned invalid JSON');
  return JSON.parse(match[0]);
}

async function reviewCode({ submission_id }) {
  const submission = await repo.one(`
    SELECT s.*, q.title, q.description, q.problem_statement, q.constraints
    FROM submissions s
    JOIN questions q ON q.id = s.question_id
    WHERE s.id = ?
  `, [submission_id]);

  if (!submission) throw new AppError('Submission not found', 404, 'NOT_FOUND');
  if (!submission.source_code) throw new AppError('This submission has no code to review', 400, 'VALIDATION_ERROR');

  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AppError('LLM review is not configured. Set LLM_API_KEY.', 503, 'AI_NOT_CONFIGURED');

  const base = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const prompt = `Review this DSA solution. Return ONLY JSON with keys score (0-100), correctness, time_complexity, space_complexity, code_quality, readability, suggestions. Do not execute code. Problem: ${submission.title}\n${submission.problem_statement || submission.description || ''}\nConstraints: ${submission.constraints || ''}\nLanguage: ${submission.language || ''}\nCode:\n${submission.source_code}`;

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a rigorous DSA code reviewer. Be concise and factual.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) throw new AppError(`LLM provider error (${response.status})`, 502, 'AI_PROVIDER_ERROR');
  const data = await response.json();
  const result = extractJson(data?.choices?.[0]?.message?.content);
  const score = Math.max(0, Math.min(100, Number(result.score) || 0));
  const feedback = JSON.stringify(result);
  const now = new Date().toISOString();

  await repo.execute(`
    UPDATE submissions
    SET ai_score = ?, ai_feedback = ?, ai_reviewed_at = ?, final_score = COALESCE(manual_score, ?), updated_at = ?
    WHERE id = ?
  `, [score, feedback, now, score, now, submission_id]);

  return repo.one('SELECT * FROM submissions WHERE id = ?', [submission_id]);
}

module.exports = { reviewCode };
