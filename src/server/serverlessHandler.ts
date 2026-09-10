import mongoose from 'mongoose';
import { createApp } from './app';

let isConnected = false;
const app = createApp();

async function handler(req: any, res: any) {
  if (!isConnected && process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
    } catch (err: any) {
      console.warn('MongoDB connection failed in serverless handler:', err.message);
    }
  }
  return app(req, res);
}

export default handler;
