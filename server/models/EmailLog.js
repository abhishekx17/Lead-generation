const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    emailAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailAccount',
      required: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'bounced'],
      required: true,
      default: 'queued',
    },
    errorMessage: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

emailLogSchema.index({ emailAccountId: 1, status: 1 });
emailLogSchema.index({ campaignId: 1 });
emailLogSchema.index({ leadId: 1 });

module.exports = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);
