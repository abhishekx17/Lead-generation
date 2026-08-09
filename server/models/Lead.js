const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
  },
  businessName: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  website: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  industry: {
    type: String,
    trim: true,
    default: '',
  },
  isValid: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

leadSchema.index({ campaignId: 1 });
leadSchema.index(
  { campaignId: 1, email: 1 },
  { unique: true, sparse: true, partialFilterExpression: { email: { $type: 'string', $ne: '' } } }
);

module.exports = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
