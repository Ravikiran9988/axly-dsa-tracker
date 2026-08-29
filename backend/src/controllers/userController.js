const { getRepository } = require('../db/repositoryFactory');
const { AppError } = require('../middleware/errorHandler');
const auditService = require('../services/auditService');
const { COMPETITIVE_ORDER, getCompetitiveLeaders } = require('../services/leaderboardService');

const repo = getRepository();

function safeParseJson(value, fallback = []) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function listUsers(req, res, next) {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Number(limit) || 50);
    const offset = (p - 1) * l;
    const whereClauses = [];
    const params = [];

    if (role) {
      whereClauses.push('u.role = ?');
      params.push(role);
    }
    if (search && search.trim()) {
      whereClauses.push('(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(COALESCE(u.institution, \'\')) LIKE ?)');
      const s = `%${search.trim().toLowerCase()}%`;
      params.push(s, s, s);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const totalRow = await repo.one(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);
    const total = Number(totalRow?.total || 0);

    const users = await repo.many(`
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM assignments a WHERE a.user_id = u.id) AS assigned_count,
        (SELECT COUNT(*) FROM assignments a JOIN submissions s ON s.question_id = a.question_id AND s.user_id = u.id WHERE s.status IN ('solved','completed','approved')) AS completed_count,
        (SELECT COUNT(*) FROM assignments a WHERE a.user_id = u.id AND a.status IN ('assigned','ongoing','under_review')) AS pending_count
      FROM users u
      ${whereSql}
      ORDER BY u.points DESC, u.streak DESC, u.longest_streak DESC, u.name ASC, u.id ASC
      LIMIT ? OFFSET ?
    `, [...params, l, offset]);

    return res.status(200).json({
      data: users.map(u => ({ ...u, skills: safeParseJson(u.skills) })),
      page: p,
      limit: l,
      total
    });
  } catch (err) {
    next(err);
  }
}

async function getMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await repo.one('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const badges = await repo.many(`
      SELECT b.*, ub.awarded_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
    `, [userId]);

    const totalAssignedRow = await repo.one('SELECT COUNT(*) AS count FROM assignments WHERE user_id = ?', [userId]);
    const totalAssigned = Number(totalAssignedRow?.count || 0);

    const completedRow = await repo.one("SELECT COUNT(*) AS count FROM submissions WHERE user_id = ? AND status IN ('solved','completed','approved')", [userId]);
    const completed = Number(completedRow?.count || 0);

    const ongoingRow = await repo.one("SELECT COUNT(*) AS count FROM submissions WHERE user_id = ? AND status IN ('attempted','under_review','changes_requested')", [userId]);
    const ongoing = Number(ongoingRow?.count || 0);

    const incomplete = Math.max(0, totalAssigned - completed - ongoing);

    const totalAttemptsRow = await repo.one('SELECT COUNT(*) AS count FROM code_submissions_log WHERE user_id = ?', [userId]);
    const totalAttempts = Number(totalAttemptsRow?.count || 0);
    const accuracy = totalAttempts > 0 ? Math.round((completed / totalAttempts) * 100) : (completed > 0 ? 85 : 0);

    const recentSubmissions = await repo.many(`
      SELECT s.*, q.title AS question_title, q.difficulty AS question_difficulty, q.points AS question_points
      FROM submissions s
      JOIN questions q ON s.question_id = q.id
      WHERE s.user_id = ?
      ORDER BY s.updated_at DESC, s.created_at DESC
      LIMIT 10
    `, [userId]);

    const recentFeedback = await repo.many(`
      SELECT s.id, s.question_id, s.feedback, s.review_status, s.reviewed_at, q.title AS question_title, rev.name AS reviewer_name
      FROM submissions s
      JOIN questions q ON s.question_id = q.id
      LEFT JOIN users rev ON s.reviewer_id = rev.id
      WHERE s.user_id = ? AND s.feedback IS NOT NULL
      ORDER BY s.reviewed_at DESC
      LIMIT 5
    `, [userId]);

    let cohorts = [];
    try {
      cohorts = await repo.many(`
        SELECT c.*, cm.joined_at
        FROM cohort_members cm
        JOIN cohorts c ON cm.cohort_id = c.id
        WHERE cm.user_id = ?
      `, [userId]);
    } catch (_) {}

    const { getUserScoreBreakdown } = require('../services/gamificationService');
    const scoreBreakdown = await getUserScoreBreakdown(userId);

    return res.status(200).json({
      data: {
        ...user,
        skills: safeParseJson(user.skills),
        points: scoreBreakdown.total_score,
        total_score: scoreBreakdown.total_score,
        practice_points: scoreBreakdown.practice_points,
        daily_challenge_points: scoreBreakdown.daily_challenge_points,
        streak_bonus: scoreBreakdown.streak_bonus,
        leaderboard_score: scoreBreakdown.leaderboard_score,
        score_breakdown: scoreBreakdown,
        stats: {
          total_challenges: totalAssigned || completed,
          completed,
          ongoing,
          incomplete,
          accuracy_rate: `${accuracy}%`,
          points: scoreBreakdown.total_score,
          total_score: scoreBreakdown.total_score,
          practice_points: scoreBreakdown.practice_points,
          daily_challenge_points: scoreBreakdown.daily_challenge_points,
          streak_bonus: scoreBreakdown.streak_bonus,
          leaderboard_score: scoreBreakdown.leaderboard_score,
          streak: Number(user.streak || 0),
          longest_streak: Number(user.longest_streak || 0),
          rank: Number(user.rank || 1)
        },
        badges,
        cohorts,
        recent_submissions: recentSubmissions,
        recent_feedback: recentFeedback
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, username, bio, institution, github_url, linkedin_url, skills, avatar_url } = req.body;
    const fields = [];
    const params = [];

    if (name !== undefined) { fields.push('name = ?'); params.push(name.trim()); }
    if (username !== undefined) { fields.push('username = ?'); params.push(username.trim()); }
    if (bio !== undefined) { fields.push('bio = ?'); params.push(bio.trim()); }
    if (institution !== undefined) { fields.push('institution = ?'); params.push(institution.trim()); }
    if (github_url !== undefined) { fields.push('github_url = ?'); params.push(github_url.trim()); }
    if (linkedin_url !== undefined) { fields.push('linkedin_url = ?'); params.push(linkedin_url.trim()); }
    if (skills !== undefined) { fields.push('skills = ?'); params.push(typeof skills === 'object' ? JSON.stringify(skills) : skills); }
    if (avatar_url !== undefined) { fields.push('avatar_url = ?'); params.push(avatar_url.trim()); }

    if (fields.length) {
      params.push(userId);
      await repo.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return getMyProfile(req, res, next);
  } catch (err) {
    next(err);
  }
}

async function getLeaderboard(req, res, next) {
  try {
    const period = String(req.query.period || 'all').toLowerCase();
    const limit = Number(req.query.limit || 100);
    const ranked = await getCompetitiveLeaders(limit, period);
    return res.status(200).json({ data: ranked, period });
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await repo.one('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const assignments = await repo.many(`
      SELECT a.*, q.title AS question_title, q.difficulty, q.points, s.status AS submission_status, s.feedback
      FROM assignments a
      JOIN questions q ON a.question_id = q.id
      LEFT JOIN submissions s ON s.question_id = a.question_id AND s.user_id = a.user_id
      WHERE a.user_id = ?
      ORDER BY a.assigned_at DESC
    `, [req.params.id]);

    let cohorts = [];
    try {
      cohorts = await repo.many(`
        SELECT c.*, cm.joined_at
        FROM cohort_members cm
        JOIN cohorts c ON cm.cohort_id = c.id
        WHERE cm.user_id = ?
      `, [req.params.id]);
    } catch (_) {}

    return res.status(200).json({
      data: {
        ...user,
        skills: safeParseJson(user.skills),
        assignments,
        cohorts
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!['admin', 'user', 'mentor'].includes(role)) {
      throw new AppError('role must be one of admin|user|mentor', 400, 'VALIDATION_ERROR', 'role');
    }

    const targetUser = await repo.one('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!targetUser) throw new AppError('User not found', 404, 'NOT_FOUND');

    await repo.execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    const updatedUser = await repo.one('SELECT * FROM users WHERE id = ?', [req.params.id]);

    await auditService.logAction({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'user_role_change',
      resourceType: 'user',
      resourceId: req.params.id,
      beforeData: { role: targetUser.role },
      afterData: { role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(200).json({ data: updatedUser });
  } catch (err) {
    next(err);
  }
}

async function getUserStats(req, res, next) {
  try {
    const userId = req.params.id;
    const user = await repo.one('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const totalSubmissionsRow = await repo.one('SELECT COUNT(*) AS count FROM submissions WHERE user_id = ?', [userId]);
    const solvedSubmissionsRow = await repo.one("SELECT COUNT(*) AS count FROM submissions WHERE user_id = ? AND status IN ('solved','completed','approved')", [userId]);

    return res.status(200).json({
      data: {
        user_id: userId,
        points: Number(user.points || 0),
        streak: Number(user.streak || 0),
        longest_streak: Number(user.longest_streak || 0),
        rank: Number(user.rank || 1),
        total_submissions: Number(totalSubmissionsRow?.count || 0),
        solved_submissions: Number(solvedSubmissionsRow?.count || 0)
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getMyProfile,
  updateMyProfile,
  getLeaderboard,
  getUserById,
  updateUserRole,
  getUserStats
};
