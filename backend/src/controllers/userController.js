const { db } = require('../db/db');
const { AppError } = require('../middleware/errorHandler');

// GET /api/v1/users (Admin only)
function listUsers(req, res, next) {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let whereClauses = [];
    const params = [];

    if (role) {
      whereClauses.push('u.role = ?');
      params.push(role);
    }

    if (search) {
      whereClauses.push('(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.institution) LIKE ?)');
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) as total FROM users u ${whereSql}`).get(...params).total;

    const users = db.prepare(`
      SELECT 
        u.*,
        (
          SELECT GROUP_CONCAT(c.name, ', ')
          FROM cohort_members cm
          JOIN cohorts c ON cm.cohort_id = c.id
          WHERE cm.user_id = u.id
        ) as cohort_name,
        (SELECT COUNT(*) FROM assignments a WHERE a.user_id = u.id) as assigned_count,
        (SELECT COUNT(*) FROM assignments a 
         JOIN submissions s ON s.question_id = a.question_id AND s.user_id = u.id 
         WHERE s.status IN ('solved', 'completed', 'approved')) as completed_count,
        (SELECT COUNT(*) FROM assignments a 
         WHERE a.user_id = u.id AND a.status IN ('assigned', 'ongoing', 'under_review')) as pending_count
      FROM users u
      ${whereSql}
      ORDER BY u.points DESC, u.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    return res.status(200).json({
      data: users.map(u => ({
        ...u,
        skills: safeParseJson(u.skills)
      })),
      page: Number(page),
      limit: Number(limit),
      total
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/profile/me
function getMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    // Badges
    const badges = db.prepare(`
      SELECT b.*, ub.awarded_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
    `).all(userId);

    // Total challenges stats
    const totalAssigned = db.prepare('SELECT COUNT(*) as count FROM assignments WHERE user_id = ?').get(userId).count;
    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM submissions 
      WHERE user_id = ? AND status IN ('solved', 'completed', 'approved')
    `).get(userId).count;
    const ongoing = db.prepare(`
      SELECT COUNT(*) as count FROM submissions 
      WHERE user_id = ? AND status IN ('attempted', 'under_review', 'changes_requested')
    `).get(userId).count;
    const incomplete = Math.max(0, totalAssigned - completed - ongoing);

    const totalAttempts = db.prepare('SELECT COUNT(*) as count FROM code_submissions_log WHERE user_id = ?').get(userId).count;
    const accuracy = totalAttempts > 0 ? Math.round((completed / totalAttempts) * 100) : (completed > 0 ? 85 : 0);

    // Recent activity & submissions
    const recentSubmissions = db.prepare(`
      SELECT s.*, q.title as question_title, q.difficulty as question_difficulty, q.points as question_points
      FROM submissions s
      JOIN questions q ON s.question_id = q.id
      WHERE s.user_id = ?
      ORDER BY s.updated_at DESC, s.created_at DESC
      LIMIT 10
    `).all(userId);

    // Recent mentor feedback
    const recentFeedback = db.prepare(`
      SELECT s.id, s.question_id, s.feedback, s.review_status, s.reviewed_at, q.title as question_title, rev.name as reviewer_name
      FROM submissions s
      JOIN questions q ON s.question_id = q.id
      LEFT JOIN users rev ON s.reviewer_id = rev.id
      WHERE s.user_id = ? AND s.feedback IS NOT NULL
      ORDER BY s.reviewed_at DESC
      LIMIT 5
    `).all(userId);

    // Cohorts joined
    const cohorts = db.prepare(`
      SELECT c.*, cm.joined_at
      FROM cohort_members cm
      JOIN cohorts c ON cm.cohort_id = c.id
      WHERE cm.user_id = ?
    `).all(userId);

    return res.status(200).json({
      data: {
        ...user,
        skills: safeParseJson(user.skills),
        stats: {
          total_challenges: totalAssigned || completed,
          completed,
          ongoing,
          incomplete,
          accuracy_rate: `${accuracy}%`,
          points: user.points,
          streak: user.streak,
          longest_streak: user.longest_streak,
          rank: user.rank || 1
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

// PATCH /api/v1/users/profile/me
function updateMyProfile(req, res, next) {
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
    if (skills !== undefined) {
      fields.push('skills = ?');
      params.push(typeof skills === 'object' ? JSON.stringify(skills) : skills);
    }
    if (avatar_url !== undefined) { fields.push('avatar_url = ?'); params.push(avatar_url.trim()); }

    if (fields.length > 0) {
      params.push(userId);
      db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }

    return getMyProfile(req, res, next);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/leaderboard
function getLeaderboard(req, res, next) {
  try {
    const leaders = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.avatar_url, u.points, u.streak, u.longest_streak, u.institution,
        (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id AND s.status IN ('solved', 'completed', 'approved')) as completed_count,
        (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) as badge_count
      FROM users u
      WHERE u.role = 'user'
      ORDER BY u.points DESC, completed_count DESC, u.streak DESC
      LIMIT 100
    `).all();

    const ranked = leaders.map((leader, index) => ({
      ...leader,
      rank: index + 1
    }));

    return res.status(200).json({ data: ranked });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/users/:id (Admin view of student)
function getUserById(req, res, next) {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const assignments = db.prepare(`
      SELECT a.*, q.title as question_title, q.difficulty, q.points, s.status as submission_status, s.feedback
      FROM assignments a
      JOIN questions q ON a.question_id = q.id
      LEFT JOIN submissions s ON s.question_id = a.question_id AND s.user_id = a.user_id
      WHERE a.user_id = ?
      ORDER BY a.assigned_at DESC
    `).all(req.params.id);

    const cohorts = db.prepare(`
      SELECT c.*, cm.joined_at
      FROM cohort_members cm
      JOIN cohorts c ON cm.cohort_id = c.id
      WHERE cm.user_id = ?
    `).all(req.params.id);

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

// PATCH /api/v1/users/:id/role (Admin only)
function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!['admin', 'user', 'mentor'].includes(role)) {
      throw new AppError('role must be one of admin|user|mentor', 400, 'VALIDATION_ERROR', 'role');
    }

    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!targetUser) throw new AppError('User not found', 404, 'NOT_FOUND');

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    const updated = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.params.id);
    return res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
}

function safeParseJson(val) {
  if (!val) return [];
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch (e) {
    return [val];
  }
}

module.exports = {
  listUsers,
  getMyProfile,
  updateMyProfile,
  getLeaderboard,
  getUserById,
  updateUserRole
};
