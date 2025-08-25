const userRepository = require('../repositories/userRepository');
const jwtUtils = require('../utils/jwtUtils');

const authService = {
  findOrCreateUser: async (googleId) => {
    let user = await userRepository.findByGoogleId(googleId);

    if (!user) {
      user = await userRepository.createUser(googleId);
    }
    return user;
  },

  updateUserTokens: async (userId, accessToken, refreshToken, expiryDate) => {
    return await userRepository.updateTokens(userId, accessToken, refreshToken, expiryDate);
  },

  generateAuthTokens: (user) => {
    const payload = {
      id: user.id,
      googleId: user.googleId,
    };
    const accessToken = jwtUtils.generateToken(payload);
    const refreshToken = jwtUtils.generateRefreshToken(payload);
    
    // Calculate refresh token expiry date
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days expiration for refresh token

    return { accessToken, refreshToken, refreshTokenExpiry };
  },
};

module.exports = authService;
