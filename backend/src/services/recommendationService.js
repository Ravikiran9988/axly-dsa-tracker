const { db } = require('../db/db');

function getRecommendations(userId, limit = 8) {
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);

  // Find weak topics for this user (topics with attempts where accuracy is < 60%)
  const weakTopics = db.prepare(`
    SELECT q.topic_id, t.name AS topic_name, COUNT(s.id) AS attempts,
      SUM(CASE WHEN s.status IN ('solved','approved','completed') THEN 1 ELSE 0 END) AS solved
    FROM submissions s
    JOIN questions q ON q.id = s.question_id
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE s.user_id = ?
    GROUP BY q.topic_id
    HAVING (SUM(CASE WHEN s.status IN ('solved','approved','completed') THEN 1 ELSE 0 END) * 1.0 / COUNT(s.id)) < 0.6
    LIMIT 3
  `).all(userId);

  const weakTopicIds = weakTopics.map(wt => wt.topic_id).filter(Boolean);

  let weakTopicQuestions = [];
  if (weakTopicIds.length > 0) {
    const placeholders = weakTopicIds.map(() => '?').join(',');
    weakTopicQuestions = db.prepare(`
      SELECT q.id, q.title, q.difficulty, q.topic_id, q.points, q.estimated_time, t.name AS topic_name
      FROM questions q
      LEFT JOIN topics t ON q.topic_id = t.id
      WHERE q.is_active = 1
        AND q.topic_id IN (${placeholders})
        AND NOT EXISTS (
          SELECT 1 FROM submissions s 
          WHERE s.question_id = q.id AND s.user_id = ? AND s.status IN ('solved', 'approved', 'completed')
        )
      ORDER BY CASE q.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, q.created_at DESC
      LIMIT ?
    `).all(...weakTopicIds, userId, Math.ceil(safeLimit / 2));
  }

  // General progression recommendations (unsolved, ordered by difficulty & recency)
  const generalQuestions = db.prepare(`
    SELECT q.id, q.title, q.difficulty, q.topic_id, q.points, q.estimated_time, t.name AS topic_name
    FROM questions q
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE q.is_active = 1
      AND NOT EXISTS (
        SELECT 1 FROM submissions s 
        WHERE s.question_id = q.id AND s.user_id = ? AND s.status IN ('solved', 'approved', 'completed')
      )
    ORDER BY CASE q.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, q.created_at DESC
    LIMIT ?
  `).all(userId, safeLimit);

  const seenIds = new Set();
  const combined = [];

  for (const q of weakTopicQuestions) {
    if (!seenIds.has(q.id)) {
      seenIds.add(q.id);
      combined.push({
        ...q,
        reason: `Targeted revision: strengthen your skills in ${q.topic_name || 'this topic'}`
      });
    }
  }

  for (const q of generalQuestions) {
    if (!seenIds.has(q.id) && combined.length < safeLimit) {
      seenIds.add(q.id);
      combined.push({
        ...q,
        reason: q.difficulty === 'easy' ? 'Great foundation challenge to maintain momentum' : 'Advance your problem solving with medium difficulty'
      });
    }
  }

  return combined;
}

function getAchievements(userId) {
  const solved = db.prepare("SELECT COUNT(DISTINCT question_id) AS n FROM submissions WHERE user_id=? AND status IN ('solved','approved','completed')").get(userId)?.n || 0;
  const perfect = db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id=? AND status IN ('solved','approved','completed') AND COALESCE(final_score, test_score, manual_score, 0) >= 100").get(userId)?.n || 0;
  const fast = db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id=? AND status IN ('solved','approved','completed') AND solve_duration_seconds > 0 AND solve_duration_seconds <= 300").get(userId)?.n || 0;
  const user = db.prepare('SELECT streak, longest_streak FROM users WHERE id=?').get(userId) || {};
  const currentStreak = user.streak || 0;
  const longestStreak = user.longest_streak || 0;

  const achievements = [];
  const add = (id, title, description, icon, unlocked, progress, target) => {
    achievements.push({ id, title, description, icon, unlocked, progress: Math.min(progress, target), target });
  };

  add('first-solve', 'First Solve', 'Solve your first algorithmic challenge on Axly', '🏆', solved >= 1, solved, 1);
  add('ten-solves', '10 Problems Solved', 'Reach double digits with 10 problems solved', '⚡', solved >= 10, solved, 10);
  add('fifty-solves', '50 Problems Mastered', 'Build strong mastery with 50 problems solved', '🌟', solved >= 50, solved, 50);
  add('hundred-solves', 'Centurion (100 Problems)', 'Elite consistency with 100 problems solved', '👑', solved >= 100, solved, 100);
  add('perfect-score', 'Flawless Execution', 'Achieve a perfect 100/100 score on a problem', '🎯', perfect >= 1, perfect, 1);
  add('fast-solver', 'Speed Demon', 'Solve a problem correctly in under 5 minutes', '⏱️', fast >= 1, fast, 1);
  add('streak-7', 'Weekly Streak', 'Maintain a continuous 7-day solving streak', '🔥', currentStreak >= 7 || longestStreak >= 7, Math.max(currentStreak, longestStreak), 7);
  add('streak-30', 'Monthly Dedication', 'Maintain an incredible 30-day streak', '💎', currentStreak >= 30 || longestStreak >= 30, Math.max(currentStreak, longestStreak), 30);

  return {
    achievements,
    solved_count: Number(solved),
    perfect_score_count: Number(perfect),
    streak: currentStreak
  };
}

module.exports = { getRecommendations, getAchievements };
