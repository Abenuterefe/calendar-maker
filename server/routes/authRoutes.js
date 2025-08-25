const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Initiate Google OAuth flow
// @route   GET /auth/google
router.get('/google', authController.googleAuth);

// @desc    Google OAuth callback
// @route   GET /auth/callback
router.get('/callback', authController.googleAuthCallback);

// @desc    Logout user
// @route   GET /auth/logout
router.get('/logout', authController.logout);

// @desc    Get authentication status (will be protected by JWT middleware later)
// @route   GET /auth/status
router.get('/status', protect, authController.getAuthStatus);

// @desc    Refresh access token using refresh token
// @route   POST /auth/refresh-token
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
