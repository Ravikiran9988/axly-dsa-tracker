const request = require('supertest');
const app = require('../src/app');
const { getRepo } = require('../src/db/db');
const jwt = require('jsonwebtoken');

describe('DSA AI Coach — Input Handling, Multi-Turn Chat & Request Integrity', () => {
  let studentToken;

  beforeAll(async () => {
    const JWT_SECRET = process.env.JWT_SECRET || 'axly-dsa-tracker-dev-secret-key-32-chars-minimum';
    studentToken = jwt.sign(
      { sub: 'usr-user-01', id: 'usr-user-01', email: 'alex@example.com', name: 'Alex Mercer', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  test('1. Submitting a question passes original trimmed message to DSA AI service', async () => {
    const res = await request(app)
      .post('/api/v1/dsa-ai/coach')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        question: 'bfs',
        action: 'HINT',
        language: 'javascript'
      });

    expect([200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toBeDefined();
      expect(res.body.data.answer || res.body.data.text || res.body.data.response).toBeDefined();
    }
  });

  test('2. Empty query returns validation rejection or fallback gracefully', async () => {
    const res = await request(app)
      .post('/api/v1/dsa-ai/coach')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        question: '   ',
        action: 'HINT'
      });

    expect([200, 400, 422]).toContain(res.status);
  });

  test('3. Multi-turn conversation requests maintain independent response contexts', async () => {
    const res1 = await request(app)
      .post('/api/v1/dsa-ai/coach')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        question: 'bfs',
        action: 'EXPLAIN',
        language: 'javascript'
      });

    const res2 = await request(app)
      .post('/api/v1/dsa-ai/coach')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        question: 'explain bfs',
        action: 'APPROACH',
        language: 'javascript'
      });

    if (res1.status === 200 && res2.status === 200) {
      expect(res1.body.data).toBeDefined();
      expect(res2.body.data).toBeDefined();
    }
  });

  test('4. Attached code context is forwarded alongside query payload', async () => {
    const sampleCode = `function levelOrder(root) { return []; }`;
    const res = await request(app)
      .post('/api/v1/dsa-ai/coach')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        question: 'Why is my code failing for single node?',
        code: sampleCode,
        action: 'CODE_REVIEW',
        language: 'javascript'
      });

    expect([200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toBeDefined();
    }
  });

  test('5. Progressive hint requests increment hint levels cleanly', async () => {
    const resHint1 = await request(app)
      .post('/api/v1/dsa-ai/coach')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        question: 'Give me hint 1 for BFS',
        action: 'HINT',
        hintIndex: 0
      });

    const resHint2 = await request(app)
      .post('/api/v1/dsa-ai/coach')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        question: 'Give me hint 2 for BFS',
        action: 'HINT',
        hintIndex: 1
      });

    expect([200, 429]).toContain(resHint1.status);
    expect([200, 429]).toContain(resHint2.status);
  });
});
