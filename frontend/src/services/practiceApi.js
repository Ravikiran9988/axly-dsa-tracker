const BASE = `${(import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')}/practice`;

function getHeaders() {
  const token = localStorage.getItem('axly_auth_token') || localStorage.getItem('axly_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get(path, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  const r = await fetch(`${BASE}${path}${q.toString() ? `?${q.toString()}` : ''}`, {
    headers: { 'Content-Type': 'application/json', ...getHeaders() }
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.error?.message || 'Practice request failed');
  return d;
}

async function post(path, body = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify(body)
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.error?.message || d?.error || 'Practice request failed');
  return d;
}

export const practiceApi = {
  getProblems: (p) => get('/problems', p),
  getProblem: (id) => get(`/problems/${id}`),
  getProgress: () => get('/progress'),
  getTopics: () => get('/topics'),
  getPatterns: () => get('/patterns'),
  start: (id) => post(`/problems/${id}/start`),
  abandon: (id) => post(`/problems/${id}/abandon`),
  recordSubmission: (id, submissionId, passed) => post(`/problems/${id}/submission`, { submissionId, passed })
};
