const { db } = require('./db');
const { v4: uuidv4 } = require('uuid');

function seedDatabase() {
  // Topics
  const topics = [
    { id: 'top-arrays', name: 'Arrays & Hashing' },
    { id: 'top-two-pointers', name: 'Two Pointers' },
    { id: 'top-sliding-window', name: 'Sliding Window' },
    { id: 'top-stack', name: 'Stack' },
    { id: 'top-binary-search', name: 'Binary Search' },
    { id: 'top-linked-list', name: 'Linked List' },
    { id: 'top-trees', name: 'Trees' },
    { id: 'top-dp', name: 'Dynamic Programming' },
    { id: 'top-graphs', name: 'Graphs' }
  ];

  const insertTopic = db.prepare('INSERT OR IGNORE INTO topics (id, name) VALUES (?, ?)');
  topics.forEach(t => insertTopic.run(t.id, t.name));

  // Users
  const users = [
    { id: 'usr-admin-01', name: 'Axly Admin', email: 'admin@axly.in', role: 'admin' },
    { id: 'usr-user-01', name: 'Alex Mercer', email: 'alex@example.com', role: 'user' },
    { id: 'usr-user-02', name: 'Priya Sharma', email: 'priya@example.com', role: 'user' },
    { id: 'usr-user-03', name: 'David Kim', email: 'david@example.com', role: 'user' }
  ];

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)');
  users.forEach(u => insertUser.run(u.id, u.name, u.email, u.role));

  // Questions
  const questions = [
    {
      id: 'q-two-sum',
      title: 'Two Sum',
      difficulty: 'easy',
      topic_id: 'top-arrays',
      url: 'https://leetcode.com/problems/two-sum/',
      is_active: 1
    },
    {
      id: 'q-valid-anagram',
      title: 'Valid Anagram',
      difficulty: 'easy',
      topic_id: 'top-arrays',
      url: 'https://leetcode.com/problems/valid-anagram/',
      is_active: 1
    },
    {
      id: 'q-group-anagrams',
      title: 'Group Anagrams',
      difficulty: 'medium',
      topic_id: 'top-arrays',
      url: 'https://leetcode.com/problems/group-anagrams/',
      is_active: 1
    },
    {
      id: 'q-top-k-frequent',
      title: 'Top K Frequent Elements',
      difficulty: 'medium',
      topic_id: 'top-arrays',
      url: 'https://leetcode.com/problems/top-k-frequent-elements/',
      is_active: 1
    },
    {
      id: 'q-trapping-rain-water',
      title: 'Trapping Rain Water',
      difficulty: 'hard',
      topic_id: 'top-two-pointers',
      url: 'https://leetcode.com/problems/trapping-rain-water/',
      is_active: 1
    },
    {
      id: 'q-3sum',
      title: '3Sum',
      difficulty: 'medium',
      topic_id: 'top-two-pointers',
      url: 'https://leetcode.com/problems/3sum/',
      is_active: 1
    },
    {
      id: 'q-longest-substring',
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'medium',
      topic_id: 'top-sliding-window',
      url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
      is_active: 1
    },
    {
      id: 'q-valid-parentheses',
      title: 'Valid Parentheses',
      difficulty: 'easy',
      topic_id: 'top-stack',
      url: 'https://leetcode.com/problems/valid-parentheses/',
      is_active: 1
    },
    {
      id: 'q-binary-search',
      title: 'Binary Search',
      difficulty: 'easy',
      topic_id: 'top-binary-search',
      url: 'https://leetcode.com/problems/binary-search/',
      is_active: 1
    },
    {
      id: 'q-median-two-sorted-arrays',
      title: 'Median of Two Sorted Arrays',
      difficulty: 'hard',
      topic_id: 'top-binary-search',
      url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
      is_active: 1
    }
  ];

  const insertQuestion = db.prepare(`
    INSERT OR IGNORE INTO questions (id, title, difficulty, topic_id, url, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  questions.forEach(q => insertQuestion.run(q.id, q.title, q.difficulty, q.topic_id, q.url, q.is_active));

  // Assignments for alex@example.com (usr-user-01)
  const assignments = [
    { id: 'asgn-01', user_id: 'usr-user-01', question_id: 'q-two-sum', assigned_by: 'usr-admin-01', status: 'assigned' },
    { id: 'asgn-02', user_id: 'usr-user-01', question_id: 'q-valid-anagram', assigned_by: 'usr-admin-01', status: 'assigned' },
    { id: 'asgn-03', user_id: 'usr-user-01', question_id: 'q-group-anagrams', assigned_by: 'usr-admin-01', status: 'assigned' },
    { id: 'asgn-04', user_id: 'usr-user-01', question_id: 'q-top-k-frequent', assigned_by: 'usr-admin-01', status: 'assigned' },
    { id: 'asgn-05', user_id: 'usr-user-01', question_id: 'q-trapping-rain-water', assigned_by: 'usr-admin-01', status: 'assigned' }
  ];

  const insertAssignment = db.prepare(`
    INSERT OR IGNORE INTO assignments (id, user_id, question_id, assigned_by, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  assignments.forEach(a => insertAssignment.run(a.id, a.user_id, a.question_id, a.assigned_by, a.status));

  // Submissions for usr-user-01
  const submissions = [
    { id: 'sub-01', user_id: 'usr-user-01', question_id: 'q-two-sum', status: 'solved', solved_at: new Date().toISOString() },
    { id: 'sub-02', user_id: 'usr-user-01', question_id: 'q-valid-anagram', status: 'solved', solved_at: new Date().toISOString() },
    { id: 'sub-03', user_id: 'usr-user-01', question_id: 'q-group-anagrams', status: 'attempted', attempted_at: new Date().toISOString() }
  ];

  const insertSubmission = db.prepare(`
    INSERT OR IGNORE INTO submissions (id, user_id, question_id, status, attempted_at, solved_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  submissions.forEach(s => insertSubmission.run(s.id, s.user_id, s.question_id, s.status, s.attempted_at || null, s.solved_at || null));

  // Today's Daily Question (UTC date)
  const todayUtc = new Date().toISOString().split('T')[0];
  const insertDailyQuestion = db.prepare(`
    INSERT OR IGNORE INTO daily_questions (id, question_id, date, created_by)
    VALUES (?, ?, ?, ?)
  `);
  insertDailyQuestion.run('daily-today', 'q-two-sum', todayUtc, 'usr-admin-01');

  console.log('Database seeded successfully.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
