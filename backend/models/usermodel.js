const mongoose = require('mongoose');

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI environment variable is not set. Please configure it in Render dashboard.');
}

const mongoUri = process.env.MONGO_URI;

console.log('Connecting to MongoDB:', mongoUri.replace(/:[^@]*@/, ':***@'));

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

const userSchema= new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    passwordHash: String,
})

module.exports = mongoose.model('User', userSchema)