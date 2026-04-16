const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const requireDatabase = require('../middleware/requireDatabase');
const requireAuth = require('../middleware/auth');
const loadCurrentUser = require('../middleware/loadCurrentUser');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.use(requireDatabase);
router.use(requireAuth);
router.use(loadCurrentUser);
router.use(requireAdmin);

const toRoleValue = (user) => (user?.role === 'admin' ? 'admin' : 'member');

const formatUserResponse = (user) => ({
  id: String(user._id),
  username: user.username,
  email: user.email,
  role: toRoleValue(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const roleValidators = [
  body('role')
    .trim()
    .isIn(['admin', 'member'])
    .withMessage('Role must be admin or member')
];

const sendValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return false;
  }

  res.status(400).json({ errors: errors.array() });
  return true;
};

router.get('/', async (req, res) => {
  const rawSearch = typeof req.query.search === 'string' ? req.query.search : '';
  const search = rawSearch.trim();
  const filter = {};

  if (search) {
    const matcher = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { username: matcher },
      { email: matcher }
    ];
  }

  try {
    const users = await User.find(filter)
      .select('_id username email role createdAt updatedAt')
      .sort({ username: 1, email: 1 })
      .collation({ locale: 'en', strength: 2 })
      .lean();

    return res.json(users.map(formatUserResponse));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/role', roleValidators, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  if (sendValidationErrors(req, res)) {
    return;
  }

  if (String(req.currentUser._id) === String(req.params.id)) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.role = req.body.role === 'admin' ? 'admin' : 'member';
    await user.save();

    return res.json(formatUserResponse(user));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
