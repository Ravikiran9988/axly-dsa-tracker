const https = require('https');
const { getRepository } = require('../db/repositoryFactory');

const repo = getRepository();
const THRESHOLD = Number(process.env.QUESTION_SIMILARITY_THRESHOLD || 0.85);

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(json.error?.message || json.error || `Embedding request failed (${res.statusCode})`));
          }
          resolve(json);
        } catch (e) {
          reject(new Error('Invalid embedding response'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Embedding request timed out'));
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}

function cosine(a, b) {
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? dot / (Math.sqrt(aa) * Math.sqrt(bb)) : 0;
}

// Embedding provider abstraction
class EmbeddingProvider {
  async getEmbedding(text) {
    const key = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) return null;
    const base = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    try {
      const r = await postJson(`${base}/embeddings`, { model, input: text }, { Authorization: `Bearer ${key}` });
      return r.data?.[0]?.embedding || null;
    } catch (err) {
      console.warn('[Embedding Warning]', err.message);
      return null;
    }
  }
}

const defaultEmbeddingProvider = new EmbeddingProvider();

async function findSimilarQuestions({ title, description, excludeId = null, provider = defaultEmbeddingProvider }) {
  const text = `${title}\n${description || ''}`.trim();
  const vector = await provider.getEmbedding(text);
  if (!vector) {
    return { configured: false, threshold: THRESHOLD, matches: [] };
  }

  const query = excludeId
    ? "SELECT id, title, description, problem_statement FROM questions WHERE status = 'published' AND is_active = TRUE AND id <> ?"
    : "SELECT id, title, description, problem_statement FROM questions WHERE status = 'published' AND is_active = TRUE";
  const params = excludeId ? [excludeId] : [];
  const rows = await repo.many(query, params);

  const matches = [];
  for (const q of rows) {
    const qv = await provider.getEmbedding(`${q.title}\n${q.description || q.problem_statement || ''}`);
    if (!qv) continue;
    const similarity = cosine(vector, qv);
    if (similarity >= THRESHOLD) {
      matches.push({ id: q.id, title: q.title, similarity: Number(similarity.toFixed(4)) });
    }
  }

  return {
    configured: true,
    threshold: THRESHOLD,
    matches: matches.sort((a, b) => b.similarity - a.similarity)
  };
}

module.exports = {
  findSimilarQuestions,
  EmbeddingProvider,
  THRESHOLD
};
