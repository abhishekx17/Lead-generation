const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
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
  searchQuery: {
    type: String,
    trim: true,
    default: "",
  },
  requiredLeads: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ["pending", "running", "completed", "failed"],
    default: "pending",
  },
  totalLeads: {
    type: Number,
    default: 0,
  },
  sheetUrl: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);
