import mongoose from 'mongoose';
import { createApp } from '../src/server/app';

let isConnected = false;

const app = createApp();

export default async function handler(req: any, res: any) {
  // Lazily connect to MongoDB if connection string provided
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
