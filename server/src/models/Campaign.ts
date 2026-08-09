import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  organizationId: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  targetAudience: {
    type: String,
    required: true,
    trim: true,
  },
  requiredLeads: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
  },
  totalLeads: {
    type: Number,
    default: 0,
  },
  sheetUrl: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique: name is unique per org, not globally
campaignSchema.index({ organizationId: 1, name: 1 }, { unique: true });

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;
