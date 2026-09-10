import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_trao_prep_kit_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication token missing or invalid format. Please log in.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please log in again.',
      });
      return;
    }

    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid session authentication token.',
    });
  }
}
