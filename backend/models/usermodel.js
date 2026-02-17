const mongoose = require('../config/db');

const userSchema= new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    passwordHash: String,
    otp: String,
    otpExpiry: Date,
    createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('User', userSchema)