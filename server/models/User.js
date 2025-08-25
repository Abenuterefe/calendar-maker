const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  accessToken: {
    type: String,
    default: null,
  },
  refreshToken: {
    type: String,
    default: null,
  },
  tokenExpiryDate: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
