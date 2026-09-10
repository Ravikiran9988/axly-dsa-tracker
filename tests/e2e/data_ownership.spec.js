const { test, expect, request } = require('@playwright/test');

const API_BASE = 'http://localhost:5000/api/v1';

test.describe('Data Ownership & IDOR Security Tests', () => {
  let userA, userB, admin;
  let tokenA, tokenB, tokenAdmin;

  test.beforeAll(async () => {
    const apiContext = await request.newContext();

    // 1. Provision User A
    const resA = await apiContext.post(`${API_BASE}/auth/dev-login`, {
      data: { email: 'usera@example.com', role: 'user' }
    });
    const dataA = await resA.json();
    userA = dataA.user;
    tokenA = dataA.token;

    // 2. Provision User B
    const resB = await apiContext.post(`${API_BASE}/auth/dev-login`, {
      data: { email: 'userb@example.com', role: 'user' }
    });
    const dataB = await resB.json();
    userB = dataB.user;
    tokenB = dataB.token;

    // 3. Provision Admin
    const resAdmin = await apiContext.post(`${API_BASE}/auth/dev-login`, {
      data: { email: 'admin_sec@example.com', role: 'admin' }
    });
    const dataAdmin = await resAdmin.json();
    admin = dataAdmin.user;
    tokenAdmin = dataAdmin.token;

    // 4. Fetch valid practice problem IDs
    const problemsRes = await apiContext.get(`${API_BASE}/practice/problems`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const problemsData = await problemsRes.json();
    if (problemsData.data && problemsData.data.length >= 2) {
      userA.pracId1 = problemsData.data[0].id;
      userA.pracId2 = problemsData.data[1].id;
    } else {
      throw new Error('Not enough practice problems found in DB to run tests');
    }
  });

  test('User A can create and access their own submission', async ({ request }) => {
    // 1. Create submission for User A using User A's token
    const startRes = await request.post(`${API_BASE}/code/submit`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        question_id: userA.pracId1,
        language: 'javascript',
        source_code: 'console.log("User A Code");'
      }
    });
    expect(startRes.status()).toBe(200);
    const startData = await startRes.json();
    const submissionId = startData.data.submission_id;

    // 2. User A can view their submission history for this problem
    const historyRes = await request.get(`${API_BASE}/code/submissions/${userA.pracId1}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    expect(historyRes.status()).toBe(200);
    const historyData = await historyRes.json();
    
    // Validate submission is in history
    const found = historyData.data.find(s => s.id === submissionId);
    expect(found).toBeDefined();
    expect(found.source_code).toBe('console.log("User A Code");');

    // 3. IDOR Test: User B attempts to access User A's submission directly (if such an endpoint existed, but we rely on history bound to user)
    const historyResB = await request.get(`${API_BASE}/code/submissions/${userA.pracId1}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    expect(historyResB.status()).toBe(200);
    const historyDataB = await historyResB.json();
    
    // User B's history for this problem should NOT contain User A's submission
    const foundByB = historyDataB.data.find(s => s.id === submissionId);
    expect(foundByB).toBeUndefined();
  });

  test('User B cannot abandon User A practice progress (IDOR Protection)', async ({ request }) => {
    // 1. User A starts a practice problem
    const startRes = await request.post(`${API_BASE}/practice/problems/${userA.pracId2}/start`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    expect(startRes.status()).toBe(200);

    // 2. User B attempts to abandon the same practice problem. 
    // Since abandon is bound to req.user.id, this will either abandon User B's progress (if they had one) or return 409 Conflict (not started).
    // It will NOT abandon User A's progress.
    const abandonResB = await request.post(`${API_BASE}/practice/problems/${userA.pracId2}/abandon`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    // Should be 409 because User B hasn't started it
    expect(abandonResB.status()).toBe(409);

    // Verify User A's progress is still in_progress
    const progressA = await request.get(`${API_BASE}/practice/problems/${userA.pracId2}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const progressDataA = await progressA.json();
    expect(progressDataA.data.practice_status).toBe('in_progress');
  });

  test('User B cannot manipulate other user fields via Profile Update', async ({ request }) => {
    // Attempt to update profile and inject another user's ID or change role
    const updateRes = await request.patch(`${API_BASE}/users/profile/me`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: {
        name: 'User B Hacked',
        id: userA.id,          // Attempt to update User A's profile
        user_id: userA.id,
        role: 'admin'          // Attempt to escalate privileges
      }
    });
    
    expect(updateRes.status()).toBe(200);
    const updatedData = await updateRes.json();
    
    // The API should ignore the injected IDs and Role, and only update User B's name
    expect(updatedData.data.id).toBe(userB.id);
    expect(updatedData.data.name).toBe('User B Hacked');
    expect(updatedData.data.role).toBe('user');
    
    // Verify User A remains untouched
    const getResA = await request.get(`${API_BASE}/auth/verify`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const checkA = await getResA.json();
    expect(checkA.user.name).not.toBe('User B Hacked');
  });

  test('Student cannot access Admin endpoints (RBAC Protection)', async ({ request }) => {
    // 1. Student attempts to view all users
    const listUsersRes = await request.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    expect(listUsersRes.status()).toBe(403);

    // 2. Student attempts to view another user's detailed profile directly
    const getUserRes = await request.get(`${API_BASE}/users/${userB.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    expect(getUserRes.status()).toBe(403);

    // 3. Admin CAN access it
    const adminRes = await request.get(`${API_BASE}/users/${userB.id}`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    expect(adminRes.status()).toBe(200);
  });
});
