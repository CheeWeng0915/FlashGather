const mongoose = require('mongoose');

const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    error: 'Database unavailable. If you are testing locally with MongoDB Atlas, add your current public IP to Atlas Network Access and restart the backend.'
  });
};

module.exports = requireDatabase;
