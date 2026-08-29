const { getRepository } = require('../db/repositoryFactory');

const repo = getRepository();

async function getUserAnalytics(userId) {
  const user = (await repo.one('SELECT id, name, points, streak, longest_streak FROM users WHERE id = ?', [userId])) || {};

  // Summary statistics
  const summary = (await repo.one(`
    SELECT 
      COUNT(*) AS total_submissions,
      SUM(CASE WHEN status IN ('solved', 'approved', 'completed') THEN 1 ELSE 0 END) AS solved_submissions,
      AVG(COALESCE(final_score, test_score, manual_score, 0)) AS average_score,
      AVG(COALESCE(solve_duration_seconds, 0)) AS average_time_seconds
    FROM submissions
    WHERE user_id = ?
  `, [userId])) || {};

  const totalAttemptsRow = await repo.one('SELECT COUNT(*) AS count FROM code_submissions_log WHERE user_id = ?', [userId]);
  const totalAttempts = Number(totalAttemptsRow?.count || 0);
  const solvedCount = Number(summary.solved_submissions || 0);
  const successPercentage = totalAttempts > 0 ? Math.round((solvedCount / totalAttempts) * 100) : (solvedCount > 0 ? 100 : 0);

  // Difficulty performance
  const difficulty = (await repo.many(`
    SELECT 
      q.difficulty,
      COUNT(s.id) AS attempts,
      SUM(CASE WHEN s.status IN ('solved', 'approved', 'completed') THEN 1 ELSE 0 END) AS solved,
      AVG(COALESCE(s.final_score, s.test_score, s.manual_score, 0)) AS average_score
    FROM submissions s
    JOIN questions q ON q.id = s.question_id
    WHERE s.user_id = ?
    GROUP BY q.difficulty
  `, [userId])).map(d => {
    const att = Number(d.attempts || 0);
    const sol = Number(d.solved || 0);
    return {
      difficulty: d.difficulty,
      attempts: att,
      solved: sol,
      average_score: Math.round(Number(d.average_score || 0) * 100) / 100,
      accuracy: att ? Math.round((sol / att) * 100) : 0
    };
  });

  // Topic intelligence
  const topics = (await repo.many(`
    SELECT 
      COALESCE(t.name, 'General') AS topic,
      q.topic_id,
      COUNT(s.id) AS attempts,
      SUM(CASE WHEN s.status IN ('solved', 'approved', 'completed') THEN 1 ELSE 0 END) AS solved,
      AVG(COALESCE(s.final_score, s.test_score, s.manual_score, 0)) AS average_score,
      AVG(COALESCE(s.solve_duration_seconds, 0)) AS average_time_seconds
    FROM submissions s
    JOIN questions q ON q.id = s.question_id
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE s.user_id = ?
    GROUP BY q.topic_id, t.name
    ORDER BY attempts DESC
  `, [userId])).map(r => {
    const att = Number(r.attempts || 0);
    const sol = Number(r.solved || 0);
    return {
      topic: r.topic,
      topic_id: r.topic_id,
      attempts: att,
      solved: sol,
      average_score: Math.round(Number(r.average_score || 0) * 100) / 100,
      average_time_seconds: Math.round(Number(r.average_time_seconds || 0) * 10) / 10,
      accuracy: att ? Math.round((sol / att) * 100) : 0
    };
  });

  // Weak topics (low accuracy or failed attempts)
  const weakTopics = topics.filter(t => t.attempts >= 1 && t.accuracy < 60);

  // Activity over last 30 days
  const activityRows = await repo.many(`
    SELECT 
      s.solved_at, s.attempted_at, s.created_at, s.status
    FROM submissions s
    WHERE s.user_id = ?
    ORDER BY COALESCE(s.solved_at, s.attempted_at, s.created_at) DESC
    LIMIT 100
  `, [userId]);

  const activityMap = {};
  for (const s of activityRows) {
    const dateStr = String(s.solved_at || s.attempted_at || s.created_at || '').slice(0, 10);
    if (!dateStr) continue;
    if (!activityMap[dateStr]) {
      activityMap[dateStr] = { date: dateStr, submissions: 0, solved: 0 };
    }
    activityMap[dateStr].submissions += 1;
    if (['solved', 'approved', 'completed'].includes(s.status)) {
      activityMap[dateStr].solved += 1;
    }
  }
  const activity = Object.values(activityMap).slice(0, 30);

  return {
    summary: {
      total_submissions: Number(summary.total_submissions || 0),
      total_attempts: totalAttempts,
      solved_submissions: solvedCount,
      average_score: Math.round(Number(summary.average_score || 0) * 100) / 100,
      average_time_seconds: Math.round(Number(summary.average_time_seconds || 0) * 100) / 100,
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

async function getAdminStats() {
  const totalLearnersRow = await repo.one("SELECT COUNT(*) AS count FROM users WHERE role = 'user'");
  const totalLearners = Number(totalLearnersRow?.count || 0);

  const activeLearnersRow = await repo.one(`
    SELECT COUNT(DISTINCT user_id) AS count
    FROM submissions
  `);
  const activeLearners = Number(activeLearnersRow?.count || 0);

  // Questions stats
  const totalQuestionsRow = await repo.one("SELECT COUNT(*) AS count FROM questions WHERE (is_active = 1 OR is_active = TRUE)");
  const totalQuestions = Number(totalQuestionsRow?.count || 0);

  const publishedQuestionsRow = await repo.one("SELECT COUNT(*) AS count FROM questions WHERE status = 'published' AND (is_active = 1 OR is_active = TRUE)");
  const publishedQuestions = Number(publishedQuestionsRow?.count || totalQuestions);

  const draftQuestionsRow = await repo.one("SELECT COUNT(*) AS count FROM questions WHERE status = 'draft' AND (is_active = 1 OR is_active = TRUE)");
  const draftQuestions = Number(draftQuestionsRow?.count || 0);

  // Submissions stats
  const totalSubmissionsRow = await repo.one("SELECT COUNT(*) AS count FROM submissions");
  const totalSubmissions = Number(totalSubmissionsRow?.count || 0);

  const solvedSubmissionsRow = await repo.one("SELECT COUNT(*) AS count FROM submissions WHERE status IN ('solved', 'approved', 'completed')");
  const solvedSubmissions = Number(solvedSubmissionsRow?.count || 0);

  // Pending reviews count
  const pendingReviewsRow = await repo.one("SELECT COUNT(*) AS count FROM submissions WHERE status IN ('under_review', 'changes_requested') OR review_status = 'pending'");
  const pendingReviews = Number(pendingReviewsRow?.count || 0);

  // Total and active assignments
  const totalAssignmentsRow = await repo.one("SELECT COUNT(*) AS count FROM assignments");
  const totalAssignments = Number(totalAssignmentsRow?.count || 0);

  const activeAssignmentsRow = await repo.one("SELECT COUNT(*) AS count FROM assignments WHERE status = 'assigned'");
  const activeAssignments = Number(activeAssignmentsRow?.count || 0);

  const completedAssignmentsRow = await repo.one("SELECT COUNT(*) AS count FROM assignments WHERE status = 'completed'");
  const completedAssignments = Number(completedAssignmentsRow?.count || 0);
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  // Active Cohorts
  let activeCohorts = 0;
  try {
    const activeCohortsRow = await repo.one("SELECT COUNT(*) AS count FROM cohorts");
    activeCohorts = Number(activeCohortsRow?.count || 0);
  } catch (_) {}

  // Today's daily challenge
  const todayUtc = new Date().toISOString().slice(0, 10);
  const todayDaily = await repo.one(`
    SELECT dq.id, dq.date, dq.question_id, q.title, q.difficulty, q.points, t.name AS topic_name
    FROM daily_questions dq
    JOIN questions q ON dq.question_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE dq.date = ?
  `, [todayUtc]);

  // Questions by difficulty
  const diffRows = await repo.many(`
    SELECT difficulty, COUNT(*) AS count
    FROM questions
    WHERE (is_active = 1 OR is_active = TRUE)
    GROUP BY difficulty
  `);
  const difficultyDistribution = {
    easy: Number(diffRows.find(d => d.difficulty?.toLowerCase() === 'easy')?.count || 0),
    medium: Number(diffRows.find(d => d.difficulty?.toLowerCase() === 'medium')?.count || 0),
    hard: Number(diffRows.find(d => d.difficulty?.toLowerCase() === 'hard')?.count || 0)
  };

  // Questions by topic
  const topicDistribution = await repo.many(`
    SELECT COALESCE(t.name, 'General') AS topic_name, COUNT(q.id) AS count
    FROM questions q
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE (q.is_active = 1 OR q.is_active = TRUE)
    GROUP BY q.topic_id, t.name
    ORDER BY count DESC
    LIMIT 8
  `);

  // Recent activity / submissions log
  const recentSubmissions = await repo.many(`
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
  `);

  return {
    learners: { total: totalLearners, active: activeLearners },
    students: { total: totalLearners, active: activeLearners },
    questions: {
      total: totalQuestions,
      published: publishedQuestions,
      draft: draftQuestions,
      by_difficulty: difficultyDistribution,
      by_topic: topicDistribution.map(t => ({ ...t, count: Number(t.count || 0) }))
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
    cohorts: { active: activeCohorts },
    pending_reviews: pendingReviews,
    today_challenge: todayDaily,
    recent_activity: recentSubmissions
  };
}

module.exports = {
  getUserAnalytics,
  getAdminStats
};
