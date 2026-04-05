const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const requireDatabase = require('../middleware/requireDatabase');
const {
  isMailerConfigured,
  sendPasswordResetOtpEmail
} = require('../services/mailer');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
const PASSWORD_RESET_OTP_LENGTH = 6;
const PASSWORD_RESET_OTP_EXPIRY_MS = 10 * 60 * 1000;
const PASSWORD_RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_TOKEN_EXPIRES_IN = '10m';

router.use(requireDatabase);

const toRoleValue = (user) => (user?.role === 'admin' ? 'admin' : 'member');
const getUserTokenVersion = (user) => (Number.isInteger(user?.tokenVersion) ? user.tokenVersion : 0);

const formatUserResponse = (user) => ({
  id: String(user._id),
  username: user.username,
  email: user.email,
  role: toRoleValue(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const createAuthResponse = (user) => {
  const token = jwt.sign(
    {
      userId: user._id,
      tokenVersion: getUserTokenVersion(user)
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );

  return {
    token,
    sessionExpiresIn: jwtExpiresIn,
    user: formatUserResponse(user)
  };
};

const clearPasswordResetState = (user) => {
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
  user.passwordResetLastSentAt = null;
};

const clearPasswordResetOtp = (user) => {
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
};

const generatePasswordResetOtp = () =>
  String(crypto.randomInt(0, 10 ** PASSWORD_RESET_OTP_LENGTH)).padStart(
    PASSWORD_RESET_OTP_LENGTH,
    '0'
  );

const getRemainingCooldownSeconds = (lastSentAt) => {
  if (!lastSentAt) {
    return 0;
  }

  const elapsedMs = Date.now() - new Date(lastSentAt).getTime();
  if (elapsedMs >= PASSWORD_RESET_RESEND_COOLDOWN_MS) {
    return 0;
  }

  return Math.ceil((PASSWORD_RESET_RESEND_COOLDOWN_MS - elapsedMs) / 1000);
};

const createPasswordResetToken = (user) =>
  jwt.sign(
    {
      userId: String(user._id),
      email: user.email,
      tokenVersion: getUserTokenVersion(user),
      purpose: 'password-reset'
    },
    jwtSecret,
    { expiresIn: PASSWORD_RESET_TOKEN_EXPIRES_IN }
  );

router.post(
  '/register',
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const normalizedUsername = req.body.username.trim();
    const normalizedEmail = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    try {
      const existingByEmail = await User.findOne({ email: normalizedEmail });
      if (existingByEmail) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const existingByUsername = await User.findOne({ username: normalizedUsername });
      if (existingByUsername) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = new User({
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashed
      });
      await user.save();

      return res.json(createAuthResponse(user));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/login',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').exists().withMessage('Password is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const normalizedEmail = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      return res.json(createAuthResponse(user));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/forgot-password/request',
  body('email').isEmail().withMessage('Valid email is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!isMailerConfigured()) {
      return res.status(500).json({
        error: 'Password reset email is not configured on the server.'
      });
    }

    const normalizedEmail = req.body.email.trim().toLowerCase();

    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({
          error: 'No account found for that email address.'
        });
      }

      const remainingCooldownSeconds = getRemainingCooldownSeconds(
        user.passwordResetLastSentAt
      );
      if (remainingCooldownSeconds > 0) {
        return res.status(429).json({
          error: `Please wait ${remainingCooldownSeconds} seconds before requesting another OTP.`
        });
      }

      const otp = generatePasswordResetOtp();
      user.passwordResetOtpHash = await bcrypt.hash(otp, 10);
      user.passwordResetOtpExpiresAt = new Date(
        Date.now() + PASSWORD_RESET_OTP_EXPIRY_MS
      );
      user.passwordResetLastSentAt = new Date();
      await user.save();

      try {
        await sendPasswordResetOtpEmail({
          otp,
          toEmail: user.email,
          toName: user.username,
          expiresInMinutes: PASSWORD_RESET_OTP_EXPIRY_MS / (60 * 1000)
        });
      } catch (error) {
        try {
          clearPasswordResetState(user);
          await user.save();
        } catch (rollbackError) {
          console.error(
            'Failed to rollback password reset state after email send failure:',
            rollbackError.message
          );
        }

        console.error('Failed to send password reset OTP email:', error.message);
        return res.status(500).json({
          error: 'Unable to send the password reset email right now.'
        });
      }

      return res.json({
        message: `A 6-digit OTP has been sent to ${user.email}.`
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/forgot-password/verify-otp',
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp')
    .trim()
    .isLength({ min: PASSWORD_RESET_OTP_LENGTH, max: PASSWORD_RESET_OTP_LENGTH })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const normalizedEmail = req.body.email.trim().toLowerCase();
    const otp = req.body.otp.trim();

    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({
          error: 'No account found for that email address.'
        });
      }

      if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
        return res.status(400).json({
          error: 'No active password reset request. Please request a new OTP.'
        });
      }

      const expiryTime = new Date(user.passwordResetOtpExpiresAt).getTime();
      if (Number.isNaN(expiryTime) || expiryTime <= Date.now()) {
        clearPasswordResetOtp(user);
        await user.save();
        return res.status(400).json({
          error: 'OTP has expired. Please request a new one.'
        });
      }

      const otpMatches = await bcrypt.compare(otp, user.passwordResetOtpHash);
      if (!otpMatches) {
        return res.status(400).json({ error: 'Invalid OTP.' });
      }

      clearPasswordResetOtp(user);
      await user.save();

      return res.json({
        message: 'OTP verified successfully. You can now reset your password.',
        resetToken: createPasswordResetToken(user),
        resetTokenExpiresIn: PASSWORD_RESET_TOKEN_EXPIRES_IN,
        email: user.email
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/forgot-password/reset',
  body('resetToken').trim().notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const resetToken = req.body.resetToken.trim();
    const { newPassword } = req.body;

    try {
      let payload;

      try {
        payload = jwt.verify(resetToken, jwtSecret);
      } catch (error) {
        return res.status(400).json({
          error: 'Reset session is invalid or expired. Please verify a new OTP.'
        });
      }

      if (payload?.purpose !== 'password-reset' || !payload?.userId || !payload?.email) {
        return res.status(400).json({
          error: 'Reset session is invalid or expired. Please verify a new OTP.'
        });
      }

      const user = await User.findOne({
        _id: payload.userId,
        email: payload.email
      });
      if (!user) {
        return res.status(400).json({
          error: 'Reset session is invalid or expired. Please verify a new OTP.'
        });
      }

      if (payload.tokenVersion !== getUserTokenVersion(user)) {
        return res.status(400).json({
          error: 'Reset session is invalid or expired. Please verify a new OTP.'
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      user.tokenVersion = getUserTokenVersion(user) + 1;
      clearPasswordResetOtp(user);
      await user.save();

      return res.json({
        message: 'Password reset successfully. Please sign in again.',
        requiresReauth: true
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: formatUserResponse(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post(
  '/change-password',
  requireAuth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from your current password'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const matches = await bcrypt.compare(currentPassword, user.password);
      if (!matches) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      user.tokenVersion = getUserTokenVersion(user) + 1;
      await user.save();

      return res.json({
        message: 'Password updated successfully. Please sign in again.',
        requiresReauth: true
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
