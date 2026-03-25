const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';

const requireAuth = (req, res, next) => {
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

    req.user = { id: String(payload.userId) };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = requireAuth;
