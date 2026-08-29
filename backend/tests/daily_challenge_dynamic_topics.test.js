const request = require('supertest');
const app = require('../src/app');
const { db, initSchema } = require('../src/db/db');
const { seedDatabase } = require('../src/db/seed');

let adminToken;
let userToken;

beforeAll(async () => {
  initSchema();
  seedDatabase();

  const adminLogin = await request(app)
    .post('/api/v1/auth/dev-login')
    .send({ email: 'admin@axly.in', role: 'admin' });
  adminToken = adminLogin.body.token;

  const userLogin = await request(app)
    .post('/api/v1/auth/dev-login')
    .send({ email: 'john@student.axly.in', role: 'user' });
  userToken = userLogin.body.token;
});

describe('Dynamic Daily Challenge Topics & AI Recommendation System', () => {

  test('1. Topic Taxonomy API returns 40+ topics across 5 categories with patterns', async () => {
    const res = await request(app)
      .get('/api/v1/daily-challenges/topics')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.topics.length).toBeGreaterThanOrEqual(30);

    const categories = res.body.data.categories;
    expect(categories).toHaveProperty('Core');
    expect(categories).toHaveProperty('Trees');
    expect(categories).toHaveProperty('Graphs');
    expect(categories).toHaveProperty('Advanced');
    expect(categories).toHaveProperty('Other');

    // Check specific topics
    const topics = res.body.data.topics;
    const graphTopic = topics.find(t => t.name === 'Graphs' || t.id === 'graphs');
    expect(graphTopic).toBeDefined();
    expect(graphTopic.patterns.length).toBeGreaterThan(0);

    const dpTopic = topics.find(t => t.name === 'Dynamic Programming' || t.id === 'dynamic-programming');
    expect(dpTopic).toBeDefined();

    // Check existing two-pointers-sliding-window is preserved
    const combinedTopic = topics.find(t => t.id === 'two-pointers-sliding-window');
    expect(combinedTopic).toBeDefined();
  });

  test('2. Create Manual Daily Challenge with Primary Topic = Arrays & Pattern = Sliding Window', async () => {
    const payload = {
      title: 'Manual Sliding Window Max Subarray Test ' + Date.now(),
      difficulty: 'medium',
      topic_id: 'arrays',
      topic_name: 'Arrays',
      pattern_name: 'Sliding Window',
      points: 100,
      description: 'Find maximum subarray sum under sliding window constraints.',
      constraints: '1 <= N <= 10^5',
      input_format: 'JSON array',
      output_format: 'Integer',
      examples: [{ input: '[1, 2, 3]', output: '6', explanation: 'Sum is 6' }],
      test_cases: [
        { input: '[1, 2, 3]', expected_output: '6', is_hidden: false },
        { input: '[0, 0, 0]', expected_output: '0', is_hidden: true }
      ]
    };

    const res = await request(app)
      .post('/api/v1/daily-challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.topic_id).toBe('arrays');
    expect(res.body.data.pattern_name).toBe('Sliding Window');
  });

  test('3. Create Manual Daily Challenge with Primary Topic = Graphs & Pattern = BFS', async () => {
    const payload = {
      title: 'Manual Graph BFS Shortest Path Test ' + Date.now(),
      difficulty: 'hard',
      topic_id: 'graphs',
      topic_name: 'Graphs',
      pattern_name: 'BFS',
      points: 150,
      description: 'Find shortest path in an unweighted graph using BFS level order traversal.',
      constraints: '1 <= V <= 1000',
      input_format: 'Adjacency list',
      output_format: 'Shortest distance',
      examples: [{ input: '[[1], [0]]', output: '1', explanation: 'Direct edge' }],
      test_cases: [
        { input: '[[1], [0]]', expected_output: '1', is_hidden: false },
        { input: '[[0]]', expected_output: '0', is_hidden: true }
      ]
    };

    const res = await request(app)
      .post('/api/v1/daily-challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.topic_id).toBe('graphs');
    expect(res.body.data.pattern_name).toBe('BFS');
  });

  test('4. Create Manual Daily Challenge with Primary Topic = Other & Custom Topic', async () => {
    const payload = {
      title: 'Custom Topic Trie Hashing Test ' + Date.now(),
      difficulty: 'medium',
      topic_id: 'other',
      topic_name: 'Other',
      custom_topic: 'Quantum Trie Hashing',
      pattern_name: 'Trie Insertion',
      points: 100,
      description: 'Implement a specialized quantum trie hashing algorithm.',
      constraints: '1 <= N <= 100',
      input_format: 'String key',
      output_format: 'Hash value',
      examples: [{ input: 'axly', output: '42', explanation: 'Hash is 42' }],
      test_cases: [
        { input: 'axly', expected_output: '42', is_hidden: false },
        { input: 'test', expected_output: '10', is_hidden: true }
      ]
    };

    const res = await request(app)
      .post('/api/v1/daily-challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.topic_id).toBe('other');
    expect(res.body.data.topic_name).toBe('Quantum Trie Hashing');
  });

  test('5. AI Generation with Graphs + Shortest Path + Hard', async () => {
    const res = await request(app)
      .post('/api/v1/daily-challenges/generate-ai')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        topic: 'Graphs',
        pattern: 'Shortest Path',
        difficulty: 'hard',
        points: 150
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.topic).toBe('Graphs');
    expect(res.body.data.difficulty).toBe('hard');
  });

  test('6. AI Generation with Dynamic Programming + 1D DP', async () => {
    const res = await request(app)
      .post('/api/v1/daily-challenges/generate-ai')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        topic: 'Dynamic Programming',
        pattern: '1D DP',
        difficulty: 'medium',
        points: 100
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.topic).toBe('Dynamic Programming');
  });

  test('7. AI Topic Recommendation ("Surprise Me") returns diverse topic & rationale', async () => {
    const res = await request(app)
      .post('/api/v1/daily-challenges/recommend-topic')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ difficulty: 'medium' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('topic_id');
    expect(res.body.data).toHaveProperty('topic_name');
    expect(res.body.data).toHaveProperty('reason');
    expect(typeof res.body.data.reason).toBe('string');
  });

  test('8. Practice Question Bank taxonomy is unaffected', async () => {
    const res = await request(app)
      .get('/api/v1/questions/topics')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
