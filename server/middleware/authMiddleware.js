const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository'); // Use the functional userRepository

const protect = async (req, res, next) => {
  let token;

  console.log('Auth Middleware: Checking for authorization header...');

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Auth Middleware: Token extracted.', token ? 'Token present' : 'No token');

      const decoded = jwt.verify(token, env.JWT_SECRET);
      console.log('Auth Middleware: JWT decoded.', decoded);

      // Attach user from token to req using the functional repository
      req.user = await userRepository.findById(decoded.id); 
      console.log('Auth Middleware: User found in DB.', req.user ? `User ID: ${req.user.id}` : 'User not found');
      
      if (!req.user) {
        console.warn('Auth Middleware: User not found in DB for decoded ID.');
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error('Auth Middleware: Token verification failed:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.warn('Auth Middleware: No token provided in header.');
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
