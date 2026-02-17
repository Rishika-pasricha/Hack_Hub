const mongoose = require('../config/db');

const userSchema= new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    passwordHash: String,
})

module.exports = mongoose.model('User', userSchema)