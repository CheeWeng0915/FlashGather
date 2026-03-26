const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const requireDatabase = require('../middleware/requireDatabase');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

router.use(requireDatabase);

const createAuthResponse = (user) => {
  const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: jwtExpiresIn });

  return {
    token,
    sessionExpiresIn: jwtExpiresIn,
    user: {
      id: user._id,
      username: user.username,
      email: user.email
    }
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

    const { username, email, password } = req.body;

    try {
      const existingByEmail = await User.findOne({ email });
      if (existingByEmail) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const existingByUsername = await User.findOne({ username });
      if (existingByUsername) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = new User({ username, email, password: hashed });
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

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
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

module.exports = router;
