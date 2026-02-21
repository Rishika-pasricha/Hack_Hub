const mongoose = require('../config/db');

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: "" },
    price: { type: Number, required: true },
    productImageUrl: { type: String, trim: true, required: true },
    sellerName: { type: String, trim: true, required: true },
    sellerEmail: { type: String, trim: true, lowercase: true, required: true },
    city: { type: String, trim: true, required: true },
    reports: {
      type: [
        {
          reporterEmail: { type: String, trim: true, lowercase: true, required: true },
          reason: {
            type: String,
            enum: ['spam', 'fake', 'offensive', 'scam'],
            default: 'spam'
          },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
