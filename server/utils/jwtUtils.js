const jwt = require('jsonwebtoken');
const env = require('../config/env');

const jwtUtils = {
  generateToken: (payload, expiresIn = '1h') => {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
  },

  generateRefreshToken: (payload, expiresIn = '7d') => {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn });
  },

  verifyToken: (token) => {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch (error) {
      return null; // Token is invalid or expired
    }
  },

  verifyRefreshToken: (token) => {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch (error) {
      return null; // Refresh token is invalid or expired
    }
  },
};

module.exports = jwtUtils;


