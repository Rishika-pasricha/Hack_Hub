const mongoose = require('../config/db');

const userSchema= new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    otp: String,
    otpExpiry: Date,
    createdAt: { type: Date, default: Date.now }
})

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema)
