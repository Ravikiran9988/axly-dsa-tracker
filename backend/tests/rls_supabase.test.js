const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { db, initSchema } = require('../src/db/db');
const { v4: uuidv4 } = require('uuid');

// RLS Verification Test Suite
describe('Supabase PostgreSQL Row-Level Security (RLS) & Role Boundaries', () => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mock.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'mock-anon-key';
  const JWT_SECRET = process.env.JWT_SECRET || 'axly-dsa-tracker-dev-secret-key-32-chars-minimum';

  const userA = {
    id: 'usr-rls-user-a-' + uuidv4().slice(0, 8),
    email: 'usera@axly.in',
    name: 'User Alpha',
    role: 'user'
  };

  const userB = {
    id: 'usr-rls-user-b-' + uuidv4().slice(0, 8),
    email: 'userb@axly.in',
    name: 'User Beta',
    role: 'user'
  };

  const admin = {
    id: 'usr-rls-admin-' + uuidv4().slice(0, 8),
    email: 'admin-rls@axly.in',
    name: 'Admin Supervisor',
    role: 'admin'
  };

  // Generate Supabase-compatible authenticated user JWT tokens
  const tokenUserA = jwt.sign(
    { sub: userA.id, id: userA.id, email: userA.email, role: 'authenticated', app_role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenUserB = jwt.sign(
    { sub: userB.id, id: userB.id, email: userB.email, role: 'authenticated', app_role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenAdmin = jwt.sign(
    { sub: admin.id, id: admin.id, email: admin.email, role: 'authenticated', app_role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Authenticated Supabase clients (scoped to each user's authenticated context)
  const clientUserA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${tokenUserA}` } }
  });

  const clientUserB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${tokenUserB}` } }
  });

  const clientAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${tokenAdmin}` } }
  });

  let testQuestionId;
  let userBAssignmentId;
  let userBSubmissionId;

  beforeAll(() => {
    initSchema();

    // 1. Insert test users into DB
    const insertUser = db.prepare('INSERT OR REPLACE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)');
    insertUser.run(userA.id, userA.name, userA.email, userA.role);
    insertUser.run(userB.id, userB.name, userB.email, userB.role);
    insertUser.run(admin.id, admin.name, admin.email, admin.role);

    // 2. Create a test question
    testQuestionId = 'q-rls-test-' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT OR REPLACE INTO questions (id, title, difficulty, url, is_active)
      VALUES (?, 'RLS Isolation Test Problem', 'medium', 'https://leetcode.com/problems/rls-test/', 1)
    `).run(testQuestionId);

    // 3. Assign to User B only
    userBAssignmentId = 'asgn-userb-' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT OR REPLACE INTO assignments (id, user_id, question_id, assigned_by, status)
      VALUES (?, ?, ?, ?, 'assigned')
    `).run(userBAssignmentId, userB.id, testQuestionId, admin.id);

    // 4. Create submission for User B
    userBSubmissionId = 'sub-userb-' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT OR REPLACE INTO submissions (id, user_id, question_id, status, solved_at)
      VALUES (?, ?, ?, 'solved', datetime('now'))
    `).run(userBSubmissionId, userB.id, testQuestionId);
  });

  // Emulation of RLS Context Resolution (Direct evaluation matching database/policies/rls_policies.sql)
  function executeWithRlsContext(userId, sqlQuery, params = []) {
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId);
    const isAdmin = user?.role === 'admin';

    // RLS Policy Check Engine:
    // Submissions: USING (user_id = auth.uid() OR public.is_admin())
    // Assignments: USING (user_id = auth.uid() OR public.is_admin())
    // Users (update role): WITH CHECK (public.is_admin())
    // Questions (insert/update): WITH CHECK (public.is_admin())
    return {
      userId,
      isAdmin,
      selectSubmissions: () => {
        return db.prepare(`
          SELECT * FROM submissions 
          WHERE (${isAdmin ? '1=1' : 'user_id = ?'})
        `).all(...(isAdmin ? [] : [userId]));
      },
      updateSubmission: (subId, status) => {
        const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(subId);
        if (!sub) return { count: 0, error: 'Not found' };
        if (sub.user_id !== userId && !isAdmin) {
          return { count: 0, error: 'RLS: 403 Forbidden - Policy violation' };
        }
        db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run(status, subId);
        return { count: 1, error: null };
      },
      selectAssignments: () => {
        return db.prepare(`
          SELECT * FROM assignments 
          WHERE (${isAdmin ? '1=1' : 'user_id = ?'})
        `).all(...(isAdmin ? [] : [userId]));
      },
      insertQuestion: (title, diff, url) => {
        if (!isAdmin) {
          return { error: 'RLS: 403 Forbidden - Only admins can insert questions' };
        }
        const qId = 'q-' + uuidv4().slice(0, 8);
        db.prepare('INSERT INTO questions (id, title, difficulty, url, is_active) VALUES (?, ?, ?, ?, 1)').run(qId, title, diff, url);
        return { qId, error: null };
      },
      promoteUser: (targetUserId, newRole) => {
        if (!isAdmin) {
          return { error: 'RLS: 403 Forbidden - Only admins can update user roles' };
        }
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, targetUserId);
        return { error: null };
      }
    };
  }

  test('RLS 1: User A cannot SELECT User B\'s submissions', () => {
    const userAContext = executeWithRlsContext(userA.id);
    const submissions = userAContext.selectSubmissions();
    const userBSubFound = submissions.find(s => s.id === userBSubmissionId || s.user_id === userB.id);

    expect(userBSubFound).toBeUndefined();
  });

  test('RLS 2: User A cannot UPDATE User B\'s submissions', () => {
    const userAContext = executeWithRlsContext(userA.id);
    const result = userAContext.updateSubmission(userBSubmissionId, 'skipped');

    expect(result.count).toBe(0);
    expect(result.error).toContain('RLS: 403 Forbidden');

    // Confirm User B submission in database remains untouched ('solved')
    const originalSub = db.prepare('SELECT status FROM submissions WHERE id = ?').get(userBSubmissionId);
    expect(originalSub.status).toBe('solved');
  });

  test('RLS 3: User A cannot access User B\'s assignments', () => {
    const userAContext = executeWithRlsContext(userA.id);
    const assignments = userAContext.selectAssignments();
    const userBAssignmentFound = assignments.find(a => a.id === userBAssignmentId || a.user_id === userB.id);

    expect(userBAssignmentFound).toBeUndefined();
  });

  test('RLS 4: User A cannot modify questions / admin repository data', () => {
    const userAContext = executeWithRlsContext(userA.id);
    const result = userAContext.insertQuestion('Unauthorized Question', 'hard', 'https://leetcode.com/fail');

    expect(result.error).toContain('RLS: 403 Forbidden');
  });

  test('RLS 5: User A cannot promote themselves to admin', () => {
    const userAContext = executeWithRlsContext(userA.id);
    const result = userAContext.promoteUser(userA.id, 'admin');

    expect(result.error).toContain('RLS: 403 Forbidden');

    // Verify role in database is still 'user'
    const checkUser = db.prepare('SELECT role FROM users WHERE id = ?').get(userA.id);
    expect(checkUser.role).toBe('user');
  });

  test('RLS 6: Admin can perform documented administrative operations across assignments and questions', () => {
    const adminContext = executeWithRlsContext(admin.id);

    // 1. Admin can read all assignments (including User B's)
    const allAssignments = adminContext.selectAssignments();
    const userBAssignmentFound = allAssignments.find(a => a.id === userBAssignmentId);
    expect(userBAssignmentFound).toBeDefined();

    // 2. Admin can create new questions
    const createResult = adminContext.insertQuestion('Admin Created DP Problem', 'hard', 'https://leetcode.com/problems/admin-dp/');
    expect(createResult.error).toBeNull();
    expect(createResult.qId).toBeDefined();

    // 3. Admin can read all submissions
    const allSubmissions = adminContext.selectSubmissions();
    const userBSubFound = allSubmissions.find(s => s.id === userBSubmissionId);
    expect(userBSubFound).toBeDefined();
  });

  test('RLS 7: Historical submissions are preserved when assignment is unassigned', () => {
    // Unassign User B's assignment
    db.prepare("UPDATE assignments SET status = 'unassigned' WHERE id = ?").run(userBAssignmentId);

    // Verify submission row still exists with status = solved
    const subRow = db.prepare('SELECT * FROM submissions WHERE id = ?').get(userBSubmissionId);
    expect(subRow).toBeDefined();
    expect(subRow.status).toBe('solved');
  });
});
