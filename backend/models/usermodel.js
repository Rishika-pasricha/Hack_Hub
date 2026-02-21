const mongoose = require('../config/db');

const userSchema= new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    profileImageUrl: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true },
    otp: String,
    otpExpiry: Date,
    removedProductsCount: { type: Number, default: 0 },
    uploadBanUntil: { type: Date, default: null },
    reportNotifications: {
        type: [
            {
                type: { type: String, enum: ['product_reported', 'product_removed'], default: 'product_reported' },
                productId: { type: String, required: true },
                productName: { type: String, required: true },
                message: { type: String, required: true },
                createdAt: { type: Date, default: Date.now }
            }
        ],
        default: []
    },
    createdAt: { type: Date, default: Date.now }
})

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema)
