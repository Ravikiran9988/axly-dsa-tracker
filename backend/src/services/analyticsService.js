const { db } = require('../db/db');

function getUserAnalytics(userId) {
  const user = db.prepare('SELECT id, name, points, streak, longest_streak FROM users WHERE id = ?').get(userId) || {};

  // Summary statistics
  const summary = db.prepare(`
    SELECT 
      COUNT(*) AS total_submissions,
      SUM(CASE WHEN status IN ('solved', 'approved', 'completed') THEN 1 ELSE 0 END) AS solved_submissions,
      ROUND(AVG(COALESCE(final_score, test_score, manual_score, 0)), 2) AS average_score,
      ROUND(AVG(COALESCE(solve_duration_seconds, 0)), 2) AS average_time_seconds
    FROM submissions
    WHERE user_id = ?
  `).get(userId) || {};

  const totalAttempts = db.prepare('SELECT COUNT(*) AS count FROM code_submissions_log WHERE user_id = ?').get(userId)?.count || 0;
  const solvedCount = Number(summary.solved_submissions || 0);
  const successPercentage = totalAttempts > 0 ? Math.round((solvedCount / totalAttempts) * 100) : (solvedCount > 0 ? 100 : 0);

  // Difficulty performance
  const difficulty = db.prepare(`
    SELECT 
      q.difficulty,
      COUNT(s.id) AS attempts,
      SUM(CASE WHEN s.status IN ('solved', 'approved', 'completed') THEN 1 ELSE 0 END) AS solved,
      ROUND(AVG(COALESCE(s.final_score, s.test_score, s.manual_score, 0)), 2) AS average_score
    FROM submissions s
    JOIN questions q ON q.id = s.question_id
    WHERE s.user_id = ?
    GROUP BY q.difficulty
  `).all(userId).map(d => ({
    ...d,
    accuracy: d.attempts ? Math.round((d.solved / d.attempts) * 100) : 0
  }));

  // Topic intelligence
  const topics = db.prepare(`
    SELECT 
      COALESCE(t.name, 'General') AS topic,
      q.topic_id,
      COUNT(s.id) AS attempts,
      SUM(CASE WHEN s.status IN ('solved', 'approved', 'completed') THEN 1 ELSE 0 END) AS solved,
      ROUND(AVG(COALESCE(s.final_score, s.test_score, s.manual_score, 0)), 2) AS average_score,
      ROUND(AVG(COALESCE(s.solve_duration_seconds, 0)), 1) AS average_time_seconds
    FROM submissions s
    JOIN questions q ON q.id = s.question_id
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE s.user_id = ?
    GROUP BY q.topic_id
    ORDER BY attempts DESC
  `).all(userId).map(r => ({
    ...r,
    accuracy: r.attempts ? Math.round((r.solved / r.attempts) * 100) : 0
  }));

  // Weak topics (low accuracy or failed attempts)
  const weakTopics = topics.filter(t => t.attempts >= 1 && t.accuracy < 60);

  // Activity over last 30 days
  const activity = db.prepare(`
    SELECT 
      DATE(COALESCE(s.solved_at, s.attempted_at, s.created_at)) AS date,
      COUNT(*) AS submissions,
      SUM(CASE WHEN s.status IN ('solved', 'approved', 'completed') THEN 1 ELSE 0 END) AS solved
    FROM submissions s
    WHERE s.user_id = ?
    GROUP BY DATE(COALESCE(s.solved_at, s.attempted_at, s.created_at))
    ORDER BY date DESC
    LIMIT 30
  `).all(userId);

  return {
    summary: {
      total_submissions: Number(summary.total_submissions || 0),
      total_attempts: totalAttempts,
      solved_submissions: solvedCount,
      average_score: Number(summary.average_score || 0),
      average_time_seconds: Number(summary.average_time_seconds || 0),
      success_percentage: successPercentage,
      current_streak: user.streak || 0,
      longest_streak: user.longest_streak || 0,
      points: user.points || 0
    },
    difficulty_breakdown: difficulty,
    topic_breakdown: topics,
    weak_topics: weakTopics.slice(0, 5),
    activity
  };
}

module.exports = { getUserAnalytics };
