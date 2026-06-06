const mongoose = require('mongoose');

let isConnected = false;


async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  await mongoose.connect(uri);
  isConnected = true;
  console.log(`[DB] Connected to MongoDB: ${mongoose.connection.host}`);
}

module.exports = { connectDB };
