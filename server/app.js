const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Import cookie-parser
const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Use cookie-parser middleware

// Routes
app.use('/auth', authRoutes);
app.use('/api', calendarRoutes); // Mount calendar routes under /api

// Basic test route


module.exports = app;
