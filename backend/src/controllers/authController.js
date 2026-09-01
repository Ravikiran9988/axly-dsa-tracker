const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { generateToken, generateTestToken } = require('../middleware/auth');
const authUserRepository = require('../db/authUserRepository');
const { getDatabaseDriver } = require('../db/repository');
const PostgresRepository = require('../db/postgresRepository');
const {
  sendOtpEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('../services/emailService');

const { recordDailyLogin, getUserStreaks } = require('../services/streakService');
const { getUserScoreBreakdown } = require('../services/gamificationService');

function getSqliteRepository() {
  // Keep better-sqlite3 completely out of PostgreSQL production processes.
  const SqliteRepository = require('../db/sqliteRepository');
  return new SqliteRepository();
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;

  // PostgreSQL drivers commonly return TIMESTAMP/TIMESTAMPTZ values as Date
  // objects. Never call string methods on the value before normalizing it.
  const expiryTime = expiresAt instanceof Date
    ? expiresAt.getTime()
    : new Date(expiresAt).getTime();

  return !Number.isFinite(expiryTime) || expiryTime <= Date.now();
}

function validatePasswordStrength(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpper && hasLower && hasNumber;
}

function generateNumericOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function formatAuthUser(user) {
  if (!user) return null;
  const streaks = await getUserStreaks(user.id);
  const score = await getUserScoreBreakdown(user.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url,
    institution: user.institution,
    individualStreak: streaks.individualStreak,
    individualBestStreak: streaks.individualBestStreak,
    dailyChallengeStreak: streaks.dailyChallengeStreak,
    dailyChallengeBestStreak: streaks.dailyChallengeBestStreak,
    streak: streaks.individualStreak,
    longest_streak: streaks.individualBestStreak,
    points: score.total_score,
    practicePoints: score.practice_points,
    dailyChallengePoints: score.daily_challenge_points,
    streakBonus: score.streak_bonus,
    totalScore: score.total_score,
    leaderboardScore: score.leaderboard_score,
    created_at: user.created_at
  };
}

// 1. POST /api/v1/auth/signup
async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName || !normalizedEmail || !password) {
      throw new AppError('Name, email and password are required', 400, 'VALIDATION_ERROR');
    }
    // ...
