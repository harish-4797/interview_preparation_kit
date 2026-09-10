const mongoose = require('mongoose');
const { createApp } = require('../dist/server/app');

let isConnected = false;
const app = createApp();

module.exports = async (req, res) => {
  if (!isConnected && process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
    } catch (err) {
      console.warn('MongoDB connection failed in serverless handler:', err.message);
    }
  }
  return app(req, res);
};
