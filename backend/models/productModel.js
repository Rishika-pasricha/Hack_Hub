const mongoose = require('../config/db');

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: "" },
    price: { type: Number, required: true },
    productImageUrl: { type: String, trim: true, required: true },
    sellerName: { type: String, trim: true, required: true },
    sellerEmail: { type: String, trim: true, lowercase: true, required: true },
    city: { type: String, trim: true, required: true }
  },
  { timestamps: true }
);

productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
