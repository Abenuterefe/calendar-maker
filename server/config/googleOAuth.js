const { google } = require('googleapis');
const env = require('./env');

const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

// We'll export the client and potentially methods to set/get credentials
module.exports = oauth2Client;







