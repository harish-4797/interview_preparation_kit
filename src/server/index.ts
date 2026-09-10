import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createApp } from './app';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trao_interview_prep';

async function startServer() {
  const app = createApp();

  // Attempt MongoDB connection with 3-second timeout
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('✓ Successfully connected to MongoDB database.');
  } catch (err: any) {
    console.warn('⚠️  MongoDB connection unsuccessful:', err.message);
    console.warn('⚡ Operating with high-performance in-memory persistence fallback.');
  }

  const server = app.listen(PORT, () => {
    console.log('====================================================');
    console.log(` Trao Prep Kit API Server running on port ${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log('====================================================');
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down server...');
    server.close(async () => {
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
