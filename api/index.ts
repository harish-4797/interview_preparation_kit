import { createApp } from '../src/server/app';

// Export Express app for Vercel serverless functions
const app = createApp();

export default app;
