const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('👉 Using Mongo URI:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
  }
};

module.exports = connectDB;
