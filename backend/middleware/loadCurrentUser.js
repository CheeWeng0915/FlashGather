const User = require('../models/User');

const toRoleValue = (user) => (user?.role === 'admin' ? 'admin' : 'member');

const loadCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.currentUser = user;
    req.user.role = toRoleValue(user);
    return next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = loadCurrentUser;
