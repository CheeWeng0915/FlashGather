const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    passwordResetOtpHash: {
      type: String,
      default: null
    },
    passwordResetOtpExpiresAt: {
      type: Date,
      default: null
    },
    passwordResetLastSentAt: {
      type: Date,
      default: null
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
