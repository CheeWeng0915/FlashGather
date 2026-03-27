const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const requireDatabase = require('../middleware/requireDatabase');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

router.use(requireDatabase);

const toRoleValue = (user) => (user?.role === 'admin' ? 'admin' : 'member');

const formatUserResponse = (user) => ({
  id: String(user._id),
  username: user.username,
  email: user.email,
  role: toRoleValue(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const createAuthResponse = (user) => {
  const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: jwtExpiresIn });

  return {
    token,
    sessionExpiresIn: jwtExpiresIn,
    user: formatUserResponse(user)
  };
};

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
      await user.save();

      return res.json({ message: 'Password updated successfully' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
