require('dotenv').config();

const env = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/voicecal',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  SESSION_SECRET: process.env.SESSION_SECRET || 'your_super_secret_session_key',
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretjwtkey',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'anothersupersecretrefreshkey',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/calendarMaker', // Added MongoDB URI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY, // Changed from GOOGLE_API_KEY
};

// Basic validation for critical environment variables
if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
  console.error('Error: Missing essential Google OAuth environment variables.');
  process.exit(1);
}
if (!env.SESSION_SECRET || !env.JWT_SECRET) {
  console.error('Error: Missing essential SESSION_SECRET or JWT_SECRET environment variables.');
  process.exit(1);
}
if (!env.OPENROUTER_API_KEY && !env.GEMINI_API_KEY) {
  console.error('Error: Missing OPENROUTER_API_KEY or GEMINI_API_KEY environment variable. At least one AI API key is required.');
  process.exit(1);
}

module.exports = env;
