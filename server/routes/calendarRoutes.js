const express = require('express');
const calendarController = require('../controllers/calendarController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Handle all calendar-related requests (create and read events)
// @route   POST /api/calendar-request
// This route should be protected by our JWT middleware
router.post('/calendar-request', protect, calendarController.handleCalendarRequest);

module.exports = router;

