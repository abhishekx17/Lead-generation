const mongoose = require('mongoose');

const emailAccountSchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      default: 'default-org',
      required: true,
    },
    userId: {
      type: String,
      default: 'default-user',
      required: true,
    },
    provider: {
      type: String,
      enum: ['gmail'],
      required: true,
      default: 'gmail',
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    accessTokenEncrypted: {
      type: String,
      default: '',
    },
    refreshTokenEncrypted: {
      type: String,
      default: '',
    },
    tokenExpiry: {
      type: Date,
      default: null,
    },
    scope: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['connected', 'revoked', 'error'],
      required: true,
      default: 'connected',
    },
    dailySendCount: {
      type: Number,
      default: 0,
    },
    dailySendResetAt: {
      type: Date,
      default: () => {
        const nextMidnight = new Date();
        nextMidnight.setHours(24, 0, 0, 0);
        return nextMidnight;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate connections per organization
emailAccountSchema.index({ organizationId: 1, email: 1 }, { unique: true });

module.exports = mongoose.models.EmailAccount || mongoose.model('EmailAccount', emailAccountSchema);
