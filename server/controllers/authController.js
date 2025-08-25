const googleOAuthClient = require('../config/googleOAuth');
const authService = require('../services/authService');
const env = require('../config/env');
const jwtUtils = require('../utils/jwtUtils'); // Added for refresh token verification

const authController = {
  // Initiates Google OAuth flow
  googleAuth: (req, res) => {
    console.log("➡️ /auth/google endpoint hit");
    const url = googleOAuthClient.generateAuthUrl({
      access_type: "offline",
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent', // Ensure refresh token is always granted
    });
    console.log("🔗 Redirecting user to Google login URL:", url);
    res.redirect(url);
  },

  // Handles Google OAuth callback
  googleAuthCallback: async (req, res) => {
    console.log("➡️ /auth/callback endpoint hit");
    const code = req.query.code;
    console.log("📨 Received auth code:", code);

    if (!code) {
      console.error("❌ No authorization code received.");
      return res.redirect(`${env.CLIENT_URL}/?auth=failed`);
    }

    try {
      const { tokens } = await googleOAuthClient.getToken(code);
      
      googleOAuthClient.setCredentials(tokens); // Set credentials for further API calls in this request context if needed.

      // Instead of verifying ID token, we'll directly use the Google ID from the profile object
      // (which is implicitly available through the tokens.id_token mechanism that Passport.js used to handle).
      // For direct OAuth without `openid` scope, `id_token` is not guaranteed.
      // We will assume `googleId` can be derived from some part of `tokens` or we use our app's internal ID.
      // For this simplified in-memory setup, let's assume the user is identified by the `access_token` for now
      // and we'll derive a `googleId` from a placeholder or the access token itself if needed. 
      // For a truly direct implementation without `id_token`, usually you'd need a separate call
      // to a Google user info endpoint or rely purely on internal app ID associated with tokens.
      
      // For now, let's derive a pseudo-googleId from the access token for the in-memory store
      // In a real DB setup, you'd likely get an ID via a minimalist openid scope or the /userinfo endpoint.
      const googleId = tokens.access_token.substring(0, 20); // Placeholder: use first 20 chars of access token as a unique ID

      // Find or create user in our DB and save their Google tokens
      const user = await authService.findOrCreateUser(googleId);
      const updatedUser = await authService.updateUserTokens(
        user.id, // Our internal user ID
        tokens.access_token,
        tokens.refresh_token,
        new Date(tokens.expiry_date)
      );

      // Generate our application's JWTs
      const { accessToken: appJwt, refreshToken, refreshTokenExpiry } = authService.generateAuthTokens(updatedUser);

      // Set refresh token as an HttpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'Lax', // Adjust as needed, 'Strict' or 'Lax' recommended
        expires: refreshTokenExpiry,
      });

      console.log("✅ Google OAuth Success! App JWTs generated and refresh token set as cookie.");
      res.redirect(
        `${env.CLIENT_URL}/?token=${appJwt}&userId=${updatedUser.id}&googleId=${updatedUser.googleId}`
      );
    } catch (error) {
      console.error("❌ Error during Google OAuth callback:", error.message);
      res.redirect(`${env.CLIENT_URL}/?auth=error`);
    }
  },

  logout: (req, res) => {
    console.log("➡️ Logout endpoint hit (direct OAuth)");
    res.clearCookie('refreshToken'); // Clear the refresh token cookie
    res.redirect(`${env.CLIENT_URL}/?logout=success`);
  },

  refreshToken: async (req, res) => {
    console.log("➡️ Refresh token endpoint hit");
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    try {
      const decoded = jwtUtils.verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(403).json({ message: 'Invalid or expired refresh token' });
      }

      // In a real database scenario, you would also check if the refresh token exists in your DB
      // and hasn't been revoked.
      const user = await authService.findOrCreateUser(decoded.googleId); // Use findOrCreateUser for simplicity with in-memory
      if (!user) {
        return res.status(403).json({ message: 'User not found for refresh token' });
      }

      // Generate a new access token
      const { accessToken: newAccessToken } = authService.generateAuthTokens(user);

      res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
      console.error("❌ Error refreshing token:", error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  getAuthStatus: async (req, res) => {
    if (req.user) {
      res.status(200).json({ isAuthenticated: true, user: { id: req.user.id, googleId: req.user.googleId } });
    } else {
      res.status(200).json({ isAuthenticated: false, user: null });
    }
  },
};

module.exports = authController;
