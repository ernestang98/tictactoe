const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  oauth_id: {
    type: String,
    required: false
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: false
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('Passport-User', UserSchema);

module.exports = User;