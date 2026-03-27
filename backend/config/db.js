const mongoose = require('mongoose');

const connectDB = async () => {
  mongoose.set('bufferCommands', false);
  console.log('👉 Using Mongo URI:', process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
  });
  console.log('✅ MongoDB connected');
};

module.exports = connectDB;
