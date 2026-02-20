const mongoose = require('../config/db');

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    content: { type: String, trim: true, required: true },
    authorName: { type: String, trim: true, required: true },
    authorEmail: { type: String, trim: true, lowercase: true, required: true },
    municipalityEmail: { type: String, trim: true, lowercase: true, required: true },
    sourceType: { type: String, enum: ['user', 'municipality'], default: 'user' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

blogPostSchema.index({ municipalityEmail: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('BlogPost', blogPostSchema);
