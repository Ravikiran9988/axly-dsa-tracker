const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || 'Axly <noreply@axly.in>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

let transporter = null;
const sentMailLog = [];

function getTransporter() {
  if (transporter) return transporter;

  let rawTransporter = null;
  const isRealSmtpConfigured =
    process.env.NODE_ENV !== 'test' &&
    SMTP_HOST &&
    SMTP_USER &&
    SMTP_PASSWORD &&
    !SMTP_USER.includes('your-domain') &&
    !SMTP_PASSWORD.includes('your-');

  if (isRealSmtpConfigured) {
    rawTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD
      }
    });
  }

  transporter = {
    sendMail: async (mailOptions) => {
      const emailRecord = {
        ...mailOptions,
        from: mailOptions.from || SMTP_FROM,
        timestamp: Date.now()
      };
      sentMailLog.push(emailRecord);

      if (rawTransporter) {
        return rawTransporter.sendMail(mailOptions);
      }

      if (process.env.NODE_ENV !== 'test') {
        console.log(`[EMAIL DISPATCH] From: ${emailRecord.from} | To: ${emailRecord.to} | Subject: ${emailRecord.subject}`);
      }
      return { messageId: `msg-${Date.now()}` };
    }
  };

  return transporter;
}

function getOtpEmailHtml({ name, otp, expiresMinutes = 10 }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070B14; color: #E2E8F0; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #0A0F1D; border: 1px solid #1E293B; border-radius: 16px; padding: 36px 32px; }
    .logo-badge { display: inline-block; background: linear-gradient(135deg, #06B6D4, #4F46E5); color: #FFFFFF; font-weight: 800; font-size: 14px; padding: 6px 14px; border-radius: 8px; font-family: monospace; }
    h1 { color: #FFFFFF; font-size: 22px; margin-top: 20px; font-weight: 700; letter-spacing: -0.02em; }
    p { color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 16px 0; }
    .otp-card { margin: 28px 0; text-align: center; background: #0F172A; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
    .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38BDF8; font-family: monospace; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1E293B; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">AXLY DSA TRACKER</div>
    <h1>Verify your registration</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Thank you for creating an account on <strong>Axly DSA Tracker</strong>. Use the following One-Time Password (OTP) to complete your registration:</p>
    <div class="otp-card">
      <div class="otp-code">${otp}</div>
    </div>
    <p>This verification code is single-use and will expire in <strong>${expiresMinutes} minutes</strong>.</p>
    <p>If you did not request this verification code, please disregard this email.</p>
    <div class="footer">
      © ${new Date().getFullYear()} Axly DSA Tracker. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getVerificationEmailHtml({ name, verifyUrl, expiresHours = 24 }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070B14; color: #E2E8F0; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #0A0F1D; border: 1px solid #1E293B; border-radius: 16px; padding: 36px 32px; }
    .logo-badge { display: inline-block; background: linear-gradient(135deg, #06B6D4, #4F46E5); color: #FFFFFF; font-weight: 800; font-size: 14px; padding: 6px 14px; border-radius: 8px; font-family: monospace; }
    h1 { color: #FFFFFF; font-size: 22px; margin-top: 20px; font-weight: 700; letter-spacing: -0.02em; }
    p { color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 16px 0; }
    .btn-container { margin: 28px 0; text-align: center; }
    .btn { display: inline-block; background: linear-gradient(135deg, #06B6D4, #4F46E5); color: #FFFFFF !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 12px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1E293B; font-size: 12px; color: #64748B; text-align: center; }
    .link-text { word-break: break-all; color: #06B6D4; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">AXLY DSA TRACKER</div>
    <h1>Verify your email address</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Welcome to <strong>Axly DSA Tracker</strong>. To activate your account and start practicing, please verify your email address by clicking the button below.</p>
    <div class="btn-container">
      <a href="${verifyUrl}" class="btn">Verify Your Email</a>
    </div>
    <p>This verification link will expire in <strong>${expiresHours} hours</strong>. If you did not create an account on Axly DSA Tracker, you can safely ignore this email.</p>
    <p style="font-size: 12px; color: #64748B;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${verifyUrl}" class="link-text">${verifyUrl}</a></p>
    <div class="footer">
      © ${new Date().getFullYear()} Axly DSA Tracker. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getPasswordResetEmailHtml({ name, resetUrl, expiresMinutes = 60 }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070B14; color: #E2E8F0; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #0A0F1D; border: 1px solid #1E293B; border-radius: 16px; padding: 36px 32px; }
    .logo-badge { display: inline-block; background: linear-gradient(135deg, #06B6D4, #4F46E5); color: #FFFFFF; font-weight: 800; font-size: 14px; padding: 6px 14px; border-radius: 8px; font-family: monospace; }
    h1 { color: #FFFFFF; font-size: 22px; margin-top: 20px; font-weight: 700; letter-spacing: -0.02em; }
    p { color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 16px 0; }
    .btn-container { margin: 28px 0; text-align: center; }
    .btn { display: inline-block; background: linear-gradient(135deg, #EF4444, #8B5CF6); color: #FFFFFF !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 14px 32px; border-radius: 12px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1E293B; font-size: 12px; color: #64748B; text-align: center; }
    .link-text { word-break: break-all; color: #06B6D4; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">AXLY DSA TRACKER</div>
    <h1>Reset your password</h1>
    <p>Hi ${name || 'there'},</p>
    <p>We received a request to reset the password for your Axly DSA Tracker account. Click the button below to choose a new password.</p>
    <div class="btn-container">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <p>This password reset link is single-use and will expire in <strong>${expiresMinutes} minutes</strong>.</p>
    <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
    <p style="font-size: 12px; color: #64748B;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetUrl}" class="link-text">${resetUrl}</a></p>
    <div class="footer">
      © ${new Date().getFullYear()} Axly DSA Tracker. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

async function sendOtpEmail({ to, name, otp, expiresMinutes = 10 }) {
  const mailer = getTransporter();
  const html = getOtpEmailHtml({ name, otp, expiresMinutes });

  return mailer.sendMail({
    from: SMTP_FROM,
    to,
    subject: 'Your Axly Verification Code',
    html,
    text: `Hi ${name || 'there'},\n\nYour Axly DSA Tracker verification code is: ${otp}\n\nThis code expires in ${expiresMinutes} minutes.`
  });
}

async function sendVerificationEmail({ to, name, token }) {
  const mailer = getTransporter();
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  const html = getVerificationEmailHtml({ name, verifyUrl });

  return mailer.sendMail({
    from: SMTP_FROM,
    to,
    subject: 'Verify your email — Axly DSA Tracker',
    html,
    text: `Hi ${name || 'there'},\n\nPlease verify your Axly DSA Tracker account using this link:\n${verifyUrl}\n\nThis link expires in 24 hours.`
  });
}

async function sendPasswordResetEmail({ to, name, token }) {
  const mailer = getTransporter();
  const resetUrl = `${APP_URL}/reset-password/${token}`;
  const html = getPasswordResetEmailHtml({ name, resetUrl });

  return mailer.sendMail({
    from: SMTP_FROM,
    to,
    subject: 'Reset your password — Axly DSA Tracker',
    html,
    text: `Hi ${name || 'there'},\n\nPlease reset your password using this link:\n${resetUrl}\n\nThis link expires in 60 minutes.`
  });
}

function getLatestSentEmail(toEmail) {
  if (!toEmail) return sentMailLog[sentMailLog.length - 1];
  return [...sentMailLog].reverse().find((mail) => mail.to === toEmail);
}

function clearMailLog() {
  sentMailLog.length = 0;
}

module.exports = {
  sendOtpEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  getTransporter,
  getLatestSentEmail,
  clearMailLog,
  SMTP_FROM
};
