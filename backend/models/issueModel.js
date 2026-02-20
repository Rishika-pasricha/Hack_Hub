const mongoose = require('../config/db');

const issueSchema = new mongoose.Schema(
  {
    subject: { type: String, trim: true, required: true },
    description: { type: String, trim: true, required: true },
    userName: { type: String, trim: true, required: true },
    userEmail: { type: String, trim: true, lowercase: true, required: true },
    municipalityEmail: { type: String, trim: true, lowercase: true, required: true },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' }
  },
  { timestamps: true }
);

issueSchema.index({ municipalityEmail: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Issue', issueSchema);
