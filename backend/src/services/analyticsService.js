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

function getAdminStats() {
  // Total and active learners
  const totalLearnersRow = db.prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'user'`).get();
  const totalLearners = totalLearnersRow ? totalLearnersRow.count : 0;

  const activeLearnersRow = db.prepare(`
    SELECT COUNT(DISTINCT user_id) AS count
    FROM submissions
    WHERE datetime(updated_at) >= datetime('now', '-30 days')
  `).get();
  const activeLearners = activeLearnersRow ? activeLearnersRow.count : 0;

  // Questions stats
  const totalQuestionsRow = db.prepare(`SELECT COUNT(*) AS count FROM questions WHERE is_active = 1`).get();
  const totalQuestions = totalQuestionsRow ? totalQuestionsRow.count : 0;

  const publishedQuestionsRow = db.prepare(`SELECT COUNT(*) AS count FROM questions WHERE status = 'published' AND is_active = 1`).get();
  const publishedQuestions = publishedQuestionsRow ? publishedQuestionsRow.count : totalQuestions;

  const draftQuestionsRow = db.prepare(`SELECT COUNT(*) AS count FROM questions WHERE status = 'draft' AND is_active = 1`).get();
  const draftQuestions = draftQuestionsRow ? draftQuestionsRow.count : 0;

  // Submissions stats
  const totalSubmissionsRow = db.prepare(`SELECT COUNT(*) AS count FROM submissions`).get();
  const totalSubmissions = totalSubmissionsRow ? totalSubmissionsRow.count : 0;

  const solvedSubmissionsRow = db.prepare(`
    SELECT COUNT(*) AS count FROM submissions WHERE status IN ('solved', 'approved', 'completed')
  `).get();
  const solvedSubmissions = solvedSubmissionsRow ? solvedSubmissionsRow.count : 0;

  // Pending reviews count
  const pendingReviewsRow = db.prepare(`
    SELECT COUNT(*) AS count FROM submissions WHERE status IN ('under_review', 'changes_requested') OR review_status = 'pending'
  `).get();
  const pendingReviews = pendingReviewsRow ? pendingReviewsRow.count : 0;

  // Total and active assignments
  const totalAssignmentsRow = db.prepare(`SELECT COUNT(*) AS count FROM assignments`).get();
  const totalAssignments = totalAssignmentsRow ? totalAssignmentsRow.count : 0;

  const activeAssignmentsRow = db.prepare(`SELECT COUNT(*) AS count FROM assignments WHERE status = 'assigned'`).get();
  const activeAssignments = activeAssignmentsRow ? activeAssignmentsRow.count : 0;

  const completedAssignmentsRow = db.prepare(`SELECT COUNT(*) AS count FROM assignments WHERE status = 'completed'`).get();
  const completedAssignments = completedAssignmentsRow ? completedAssignmentsRow.count : 0;
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  // Active Cohorts
  const activeCohortsRow = db.prepare(`SELECT COUNT(*) AS count FROM cohorts WHERE is_active = 1`).get();
  const activeCohorts = activeCohortsRow ? activeCohortsRow.count : 0;

  // Today's daily challenge
  const todayDaily = db.prepare(`
    SELECT dq.id, dq.date, dq.question_id, q.title, q.difficulty, q.points, t.name AS topic_name
    FROM daily_questions dq
    JOIN questions q ON dq.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE dq.date = date('now')
  `).get() || null;

  // Questions by difficulty
  const diffRows = db.prepare(`
    SELECT difficulty, COUNT(*) AS count
    FROM questions
    WHERE is_active = 1
    GROUP BY difficulty
  `).all();
  const difficultyDistribution = {
    easy: diffRows.find(d => d.difficulty?.toLowerCase() === 'easy')?.count || 0,
    medium: diffRows.find(d => d.difficulty?.toLowerCase() === 'medium')?.count || 0,
    hard: diffRows.find(d => d.difficulty?.toLowerCase() === 'hard')?.count || 0
  };

  // Questions by topic
  const topicDistribution = db.prepare(`
    SELECT COALESCE(t.name, 'General') AS topic_name, COUNT(q.id) AS count
    FROM questions q
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE q.is_active = 1
    GROUP BY q.topic_id
    ORDER BY count DESC
    LIMIT 8
  `).all();

  // Recent activity / submissions log
  const recentSubmissions = db.prepare(`
    SELECT 
      s.id, s.user_id, s.question_id, s.status, s.language,
      s.solve_duration_seconds, s.test_score, s.final_score, s.updated_at, s.created_at,
      u.name AS user_name, u.email AS user_email, u.avatar_url AS user_avatar,
      q.title AS question_title, q.difficulty AS question_difficulty
    FROM submissions s
    JOIN users u ON s.user_id = u.id
    JOIN questions q ON s.question_id = q.id
    ORDER BY s.updated_at DESC, s.created_at DESC
    LIMIT 10
  `).all();

  return {
    learners: {
      total: totalLearners,
      active: activeLearners
    },
    students: {
      total: totalLearners,
      active: activeLearners
    },
    questions: {
      total: totalQuestions,
      published: publishedQuestions,
      draft: draftQuestions,
      by_difficulty: difficultyDistribution,
      by_topic: topicDistribution
    },
    submissions: {
      total: totalSubmissions,
      solved: solvedSubmissions,
      accuracy_rate: totalSubmissions > 0 ? Math.round((solvedSubmissions / totalSubmissions) * 100) : 0
    },
    assignments: {
      total: totalAssignments,
      active: activeAssignments,
      completed: completedAssignments,
      completion_rate: completionRate
    },
    cohorts: {
      active: activeCohorts
    },
    pending_reviews: pendingReviews,
    today_challenge: todayDaily,
    recent_activity: recentSubmissions
  };
}

module.exports = {
  getUserAnalytics,
  getAdminStats
};
