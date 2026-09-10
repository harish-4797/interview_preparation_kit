import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import kitRoutes from './routes/kitRoutes';
import practiceRoutes from './routes/practiceRoutes';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health checks
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Trao AI Interview Prep Kit API',
      timestamp: new Date().toISOString(),
      llmProvider: process.env.LLM_PROVIDER || 'mock',
    });
  });

  // API Routes (mounted on both /api and root prefix for resilient serverless routing)
  app.use('/api/auth', authRoutes);
  app.use('/auth', authRoutes);

  app.use('/api/kits', kitRoutes);
  app.use('/kits', kitRoutes);

  app.use('/api/practice', practiceRoutes);
  app.use('/practice', practiceRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'The requested API endpoint does not exist.',
    });
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Global Error]', err);
    res.status(err.status || 500).json({
      error: err.name || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.',
    });
  });

  return app;
}
