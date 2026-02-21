const mongoose = require('../config/db');

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    content: { type: String, trim: true, default: '' },
    authorName: { type: String, trim: true, required: true },
    authorEmail: { type: String, trim: true, lowercase: true, required: true },
    municipalityEmail: { type: String, trim: true, lowercase: true, required: true },
    media: {
      type: [
        {
          mediaType: { type: String, enum: ['image', 'video'], required: true },
          mediaUrl: { type: String, required: true }
        }
      ],
      default: []
    },
    likes: { type: [{ type: String, trim: true, lowercase: true }], default: [] },
    sourceType: { type: String, enum: ['user', 'municipality'], default: 'user' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

blogPostSchema.index({ municipalityEmail: 1, status: 1, createdAt: -1 });
blogPostSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('BlogPost', blogPostSchema);
