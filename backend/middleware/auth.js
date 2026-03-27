const jwt = require('jsonwebtoken');
const User = require('../models/User');

const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';

const readTokenVersion = (value) => (Number.isInteger(value) ? value : 0);

const requireAuth = async (req, res, next) => {
  const authorization = req.get('Authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);

    if (!payload?.userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await User.findById(payload.userId).select('_id tokenVersion');
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (readTokenVersion(payload.tokenVersion) !== readTokenVersion(user.tokenVersion)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: String(payload.userId) };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = requireAuth;
