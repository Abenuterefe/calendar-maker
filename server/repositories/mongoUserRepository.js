const User = require('../models/User');

const mongoUserRepository = (() => {

  const findByGoogleId = async (googleId) => {
    return User.findOne({ googleId });
  };

  const createUser = async (googleId) => {
    const newUser = new User({ googleId });
    await newUser.save();
    return newUser;
  };

  const findById = async (id) => {
    return User.findById(id);
  };

  const updateTokens = async (userId, accessToken, refreshToken, tokenExpiryDate) => {
    const user = await User.findById(userId);
    if (!user) {
      return null; // User not found
    }

    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    user.tokenExpiryDate = tokenExpiryDate;
    await user.save();
    return user;
  };

  return Object.freeze({
    findByGoogleId,
    createUser,
    findById,
    updateTokens,
  });
})();

module.exports = mongoUserRepository;
