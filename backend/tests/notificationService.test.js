process.env.NODE_ENV = 'test';

const { initSchema } = require('../src/db/db');
const { getRepository } = require('../src/db/repositoryFactory');
const {
  listNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  broadcastNotification
} = require('../src/services/notificationService');

const repo = getRepository();

describe('Axly DSA Tracker Notifications Service Tests', () => {
  const user1 = 'usr-notif-test-1';
  const user2 = 'usr-notif-test-2';

  beforeAll(async () => {
    initSchema();

    // Clean up test fixtures
    await repo.execute('DELETE FROM notifications WHERE user_id IN (?, ?)', [user1, user2]);
    await repo.execute('DELETE FROM users WHERE id IN (?, ?)', [user1, user2]);

    await repo.execute(
      `INSERT INTO users (id, name, email, role, points)
       VALUES (?, ?, ?, 'user', 0), (?, ?, ?, 'user', 0)`,
      [user1, 'Alice Notifications', 'alice.notifs@example.com', user2, 'Bob Notifications', 'bob.notifs@example.com']
    );
  });

  test('1. Create notifications across categories and verify category counts', async () => {
    await createNotification({
      userId: user1,
      title: 'New Daily Challenge: Binary Search',
      message: 'Today daily challenge is live! +100 pts.',
      category: 'daily_challenge',
      type: 'daily_challenge_published',
      link: '/daily-challenge'
    });

    await createNotification({
      userId: user1,
      title: 'Practice Problem Solved: Two Sum',
      message: '+10 Practice points awarded.',
      category: 'practice',
      type: 'practice_completed',
      link: '/practice'
    });

    await createNotification({
      userId: user1,
      title: 'Submission Accepted: Two Sum',
      message: 'All 10/10 test cases passed.',
      category: 'submission',
      type: 'submission_accepted',
      link: '/practice'
    });

    await createNotification({
      userId: user1,
      title: '7-Day Streak Milestone!',
      message: 'You have solved Daily Challenges for 7 days.',
      category: 'achievement',
      type: 'streak_milestone',
      link: '/daily-challenge'
    });

    await createNotification({
      userId: user1,
      title: 'Platform Maintenance Notice',
      message: 'Maintenance scheduled for Sunday.',
      category: 'system',
      type: 'system_alert',
      link: '/practice'
    });

    const resAll = await listNotifications(user1, { category: 'all' });
    expect(resAll.notifications.length).toBe(5);
    expect(resAll.unreadCount).toBe(5);
    expect(resAll.categoryCounts.all).toBe(5);
    expect(resAll.categoryCounts.daily_challenge).toBe(1);
    expect(resAll.categoryCounts.practice).toBe(1);
    expect(resAll.categoryCounts.submission).toBe(1);
    expect(resAll.categoryCounts.achievement).toBe(1);
    expect(resAll.categoryCounts.system).toBe(1);
  });

  test('2. Filter notifications by category', async () => {
    const dcRes = await listNotifications(user1, { category: 'daily_challenge' });
    expect(dcRes.notifications.length).toBe(1);
    expect(dcRes.notifications[0].category).toBe('daily_challenge');

    const pracRes = await listNotifications(user1, { category: 'practice' });
    expect(pracRes.notifications.length).toBe(1);
    expect(pracRes.notifications[0].category).toBe('practice');

    const subRes = await listNotifications(user1, { category: 'submission' });
    expect(subRes.notifications.length).toBe(1);
    expect(subRes.notifications[0].category).toBe('submission');
  });

  test('3. Mark single notification as read and verify unread count updates', async () => {
    const before = await listNotifications(user1, { category: 'all' });
    const target = before.notifications[0];

    const after = await markAsRead(target.id, user1);
    const updatedTarget = after.notifications.find(n => n.id === target.id);

    expect(updatedTarget.is_read).toBe(true);
    expect(after.unreadCount).toBe(4);
  });

  test('4. Mark all notifications as read', async () => {
    const res = await markAllAsRead(user1);
    expect(res.unreadCount).toBe(0);
    expect(res.notifications.every(n => n.is_read === true)).toBe(true);
  });

  test('5. User isolation: user2 cannot see user1 notifications', async () => {
    const user2Res = await listNotifications(user2);
    expect(user2Res.notifications.length).toBe(0);
    expect(user2Res.unreadCount).toBe(0);

    // Creating notification for user2
    await createNotification({
      userId: user2,
      title: 'Welcome Bob',
      message: 'Your account is ready.',
      category: 'system',
      type: 'system_alert'
    });

    const user2Updated = await listNotifications(user2);
    expect(user2Updated.notifications.length).toBe(1);
    expect(user2Updated.unreadCount).toBe(1);

    // User1 list remains unaffected
    const user1Res = await listNotifications(user1);
    expect(user1Res.notifications.length).toBe(5);
  });
});
