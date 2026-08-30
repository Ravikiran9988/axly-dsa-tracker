const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { generateToken, generateTestToken } = require('../middleware/auth');
const authUserRepository = require('../db/authUserRepository');
const { getDatabaseDriver } = require('../db/repository');
const PostgresRepository = require('../db/postgresRepository');
const SqliteRepository = require('../db/sqliteRepository');
const {
  sendOtpEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('../services/emailService');

const { recordDailyLogin, getUserStreaks } = require('../services/streakService');
const { getUserScoreBreakdown } = require('../services/gamificationService');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  const isoString = expiresAt.includes('T') ? expiresAt : (expiresAt.replace(' ', 'T') + (expiresAt.endsWith('Z') ? '' : 'Z'));
  const expiryTime = new Date(isoString).getTime();
  return isNaN(expiryTime) || expiryTime < Date.now();
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

    if (!trimmedName) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Full name is required', field: 'name' }
      });
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required', field: 'email' }
      });
    }

    if (!validatePasswordStrength(password)) {
      return res.status(400).json({
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters.',
          field: 'password'
        }
      });
    }

    // Check if user already exists and is verified
    const existingUser = await authUserRepository.findUserByEmail(normalizedEmail);
    if (existingUser && existingUser.password_hash && (existingUser.email_verified === 1 || existingUser.email_verified === true)) {
      return res.status(409).json({
        error: { code: 'EMAIL_EXISTS', message: 'An account with this email address already exists.' }
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    let user;

    if (existingUser) {
      // User exists (unverified previous attempt or Google OAuth without password)
      await authUserRepository.updatePassword(existingUser.id, passwordHash);
      await authUserRepository.updateProfile(existingUser.id, { name: trimmedName });
      user = await authUserRepository.findUserById(existingUser.id);
    } else {
      const id = `usr-${uuidv4()}`;
      user = await authUserRepository.provisionUser({
        id,
        name: trimmedName,
        email: normalizedEmail,
        password_hash: passwordHash,
        email_verified: false
      });
    }

    // Generate 6-digit OTP (10 minutes expiration)
    const otp = generateNumericOtp();
    const tokenHash = hashToken(otp);
    const tokenId = `tok-${uuidv4()}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate any previous OTPs for this user
    await authUserRepository.invalidateUserTokens(user.id, 'otp_verification');
    await authUserRepository.invalidateUserTokens(user.id, 'verification');

    await authUserRepository.createAuthToken({
      id: tokenId,
      userId: user.id,
      tokenHash,
      tokenType: 'otp_verification',
      expiresAt
    });

    // Also support link-based token for backwards compatibility
    const rawLinkToken = crypto.randomBytes(32).toString('hex');
    await authUserRepository.createAuthToken({
      id: `tok-link-${uuidv4()}`,
      userId: user.id,
      tokenHash: hashToken(rawLinkToken),
      tokenType: 'verification',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    // Send OTP email from Axly <noreply@axly.in>
    await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      expiresMinutes: 10
    }).catch((err) => {
      console.warn('Failed to dispatch OTP email:', err.message);
    });

    return res.status(201).json({
      message: 'Account created successfully. A 6-digit verification code has been sent to your email.',
      email: user.email
    });
  } catch (err) {
    next(err);
  }
}

// 2. POST /api/v1/auth/verify-otp
async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanOtp = typeof otp === 'string' ? otp.trim() : '';

    if (!normalizedEmail || !cleanOtp) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Email and 6-digit verification code are required' }
      });
    }

    const user = await authUserRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(400).json({
        error: { code: 'INVALID_OTP', message: 'Invalid verification code. Please check and try again.' }
      });
    }

    const tokenHash = hashToken(cleanOtp);
    const authToken = await authUserRepository.findAuthTokenByHash(tokenHash, 'otp_verification');

    if (!authToken || authToken.user_id !== user.id || authToken.used_at) {
      return res.status(400).json({
        error: { code: 'INVALID_OTP', message: 'Invalid verification code. Please check and try again.' }
      });
    }

    if (isTokenExpired(authToken.expires_at)) {
      return res.status(400).json({
        error: { code: 'EXPIRED_OTP', message: 'The verification code has expired. Please request a new code.' }
      });
    }

    // Mark token as used and set email_verified = 1
    await authUserRepository.markAuthTokenUsed(authToken.id);
    await authUserRepository.setEmailVerified(user.id, true);

    const updatedUser = await authUserRepository.findUserById(user.id);
    await recordDailyLogin(updatedUser.id);
    const formattedUser = await formatAuthUser(updatedUser);
    const sessionToken = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role
    });

    return res.status(200).json({
      message: 'Account verified and created successfully.',
      token: sessionToken,
      user: formattedUser
    });
  } catch (err) {
    next(err);
  }
}

// 3. POST /api/v1/auth/resend-otp
async function resendOtp(req, res, next) {
  try {
    const { email } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required', field: 'email' }
      });
    }

    const user = await authUserRepository.findUserByEmail(normalizedEmail);
    if (user && (user.email_verified === 0 || user.email_verified === false)) {
      // Invalidate all previous OTPs
      await authUserRepository.invalidateUserTokens(user.id, 'otp_verification');

      const newOtp = generateNumericOtp();
      const tokenHash = hashToken(newOtp);
      const tokenId = `tok-${uuidv4()}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await authUserRepository.createAuthToken({
        id: tokenId,
        userId: user.id,
        tokenHash,
        tokenType: 'otp_verification',
        expiresAt
      });

      await sendOtpEmail({
        to: user.email,
        name: user.name,
        otp: newOtp,
        expiresMinutes: 10
      }).catch((err) => {
        console.warn('Failed to dispatch resend OTP email:', err.message);
      });
    }

    return res.status(200).json({
      message: 'If an unverified account exists for this email, a new verification code has been sent.'
    });
  } catch (err) {
    next(err);
  }
}

// 4. POST /api/v1/auth/login
async function login(req, res, next) {
  try {
    const { email, password, user_id, role = 'user' } = req.body || {};

    // Backward-compatibility hook for test runners with explicit user_id
    if (!password && user_id && process.env.NODE_ENV !== 'production') {
      let user = await authUserRepository.findUserById(user_id);
      if (!user) {
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : `${user_id}@example.com`;
        const name = normalizedEmail.split('@')[0];
        user = await authUserRepository.provisionUser({ id: user_id, name, email: normalizedEmail, email_verified: true });
      }
      const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });
      return res.status(200).json({ token, user });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required', field: 'email' }
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Password is required', field: 'password' }
      });
    }

    const user = await authUserRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        error: {
          code: 'GOOGLE_AUTH_REQUIRED',
          message: 'This account was registered with Google. Please use Continue with Google.'
        }
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    // Check email verification status
    if (user.email_verified === 0 || user.email_verified === false) {
      return res.status(403).json({
        error: {
          code: 'UNVERIFIED_EMAIL',
          message: 'Please verify your email before signing in.',
          email: user.email
        }
      });
    }

    await recordDailyLogin(user.id);
    const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const formattedUser = await formatAuthUser(user);

    return res.status(200).json({ token, user: formattedUser });
  } catch (err) {
    next(err);
  }
}

// 5. POST /api/v1/auth/verify-email (Supports both token-based and OTP verification)
async function verifyEmail(req, res, next) {
  try {
    const { token, email, otp } = req.body || {};

    if (email && otp) {
      return verifyOtp(req, res, next);
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: { code: 'INVALID_TOKEN', message: 'Verification token or code is required' }
      });
    }

    const tokenHash = hashToken(token.trim());
    let authToken = await authUserRepository.findAuthTokenByHash(tokenHash, 'verification');
    if (!authToken) {
      authToken = await authUserRepository.findAuthTokenByHash(tokenHash, 'otp_verification');
    }

    if (!authToken || authToken.used_at) {
      return res.status(400).json({
        error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'The verification link is invalid or has already been used.' }
      });
    }

    if (isTokenExpired(authToken.expires_at)) {
      return res.status(400).json({
        error: { code: 'EXPIRED_TOKEN', message: 'The verification link has expired. Please request a new one.' }
      });
    }

    await authUserRepository.markAuthTokenUsed(authToken.id);
    await authUserRepository.setEmailVerified(authToken.user_id, true);

    const user = await authUserRepository.findUserById(authToken.user_id);
    await recordDailyLogin(user.id);
    const sessionToken = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const formattedUser = await formatAuthUser(user);

    return res.status(200).json({
      message: 'Your email address has been verified successfully.',
      token: sessionToken,
      user: formattedUser
    });
  } catch (err) {
    next(err);
  }
}

// 6. POST /api/v1/auth/resend-verification
async function resendVerification(req, res, next) {
  return resendOtp(req, res, next);
}

// 7. POST /api/v1/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required', field: 'email' }
      });
    }

    const user = await authUserRepository.findUserByEmail(normalizedEmail);
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const tokenId = `tok-${uuidv4()}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

      await authUserRepository.invalidateUserTokens(user.id, 'password_reset');
      await authUserRepository.createAuthToken({
        id: tokenId,
        userId: user.id,
        tokenHash,
        tokenType: 'password_reset',
        expiresAt
      });

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token: rawToken
      }).catch((err) => {
        console.warn('Failed to dispatch password reset email:', err.message);
      });
    }

    return res.status(200).json({
      message: 'If an account exists for this email, a password reset link has been sent.'
    });
  } catch (err) {
    next(err);
  }
}

// 8. POST /api/v1/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: { code: 'INVALID_TOKEN', message: 'Password reset token is required' }
      });
    }

    if (!validatePasswordStrength(password)) {
      return res.status(400).json({
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters.',
          field: 'password'
        }
      });
    }

    const tokenHash = hashToken(token.trim());
    const authToken = await authUserRepository.findAuthTokenByHash(tokenHash, 'password_reset');

    if (!authToken || authToken.used_at) {
      return res.status(400).json({
        error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'The password reset link is invalid or has already been used.' }
      });
    }

    if (isTokenExpired(authToken.expires_at)) {
      return res.status(400).json({
        error: { code: 'EXPIRED_TOKEN', message: 'The password reset link has expired. Please request a new one.' }
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    await authUserRepository.updatePassword(authToken.user_id, passwordHash);
    await authUserRepository.markAuthTokenUsed(authToken.id);

    return res.status(200).json({
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
}

// 9. GET or POST /api/v1/auth/verify
async function verifySession(req, res, next) {
  try {
    await recordDailyLogin(req.user.id);
    const formattedUser = await formatAuthUser(req.user);
    return res.status(200).json({ user: formattedUser });
  } catch (err) {
    next(err);
  }
}

// 10. POST /api/v1/auth/dev-login (Disabled in production)
async function devLogin(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Development login is disabled in production.' } });
    }

    const { email, role = 'user' } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const allowedRoles = new Set(['user', 'mentor', 'admin']);

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid email is required', field: 'email' } });
    }
    if (!allowedRoles.has(role)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role', field: 'role' } });
    }

    let user = await authUserRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      const id = `usr-${Date.now()}`;
      const name = normalizedEmail.split('@')[0];
      user = await authUserRepository.provisionUser({ id, name, email: normalizedEmail, email_verified: true });
      if (role !== 'user') {
        const repo = getDatabaseDriver() === 'postgres' ? new PostgresRepository() : new SqliteRepository();
        await repo.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        user = await authUserRepository.findUserById(id);
      }
    } else if (role !== user.role) {
      const repo = getDatabaseDriver() === 'postgres' ? new PostgresRepository() : new SqliteRepository();
      await repo.execute('UPDATE users SET role = ? WHERE id = ?', [role, user.id]);
      user = { ...user, role };
    }

    await recordDailyLogin(user.id);
    const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const formattedUser = await formatAuthUser(user);

    return res.status(200).json({ token, user: formattedUser });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  verifyOtp,
  resendOtp,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  verifySession,
  devLogin
};
