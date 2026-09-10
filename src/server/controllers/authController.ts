import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { UserModel, memoryUsers, MemoryUser } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_trao_prep_kit_2026';

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || password.length < 6) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: 'Valid email and a password of at least 6 characters are required.',
        });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (isMongoConnected()) {
        const existing = await UserModel.findOne({ email: normalizedEmail });
        if (existing) {
          res.status(409).json({
            error: 'USER_EXISTS',
            message: 'An account with this email already exists.',
          });
          return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await UserModel.create({
          email: normalizedEmail,
          passwordHash,
          name: name?.trim() || 'User',
        });

        const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, {
          expiresIn: '7d',
        });

        res.status(201).json({
          message: 'Account created successfully',
          token,
          user: { id: user._id.toString(), email: user.email, name: user.name },
        });
      } else {
        // Memory fallback store
        if (memoryUsers.has(normalizedEmail)) {
          res.status(409).json({
            error: 'USER_EXISTS',
            message: 'An account with this email already exists.',
          });
          return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const user: MemoryUser = {
          id,
          email: normalizedEmail,
          passwordHash,
          name: name?.trim() || 'User',
          createdAt: new Date(),
        };

        memoryUsers.set(normalizedEmail, user);

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
          expiresIn: '7d',
        });

        res.status(201).json({
          message: 'Account created successfully',
          token,
          user: { id: user.id, email: user.email, name: user.name },
        });
      }
    } catch (err: any) {
      res.status(500).json({
        error: 'SERVER_ERROR',
        message: err.message || 'Failed to register account.',
      });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: 'Email and password are required.',
        });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (isMongoConnected()) {
        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) {
          res.status(401).json({
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          });
          return;
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
          res.status(401).json({
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          });
          return;
        }

        const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, {
          expiresIn: '7d',
        });

        res.json({
          message: 'Login successful',
          token,
          user: { id: user._id.toString(), email: user.email, name: user.name },
        });
      } else {
        // Memory fallback
        const user = memoryUsers.get(normalizedEmail);
        if (!user) {
          res.status(401).json({
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          });
          return;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          res.status(401).json({
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          });
          return;
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
          expiresIn: '7d',
        });

        res.json({
          message: 'Login successful',
          token,
          user: { id: user.id, email: user.email, name: user.name },
        });
      }
    } catch (err: any) {
      res.status(500).json({
        error: 'SERVER_ERROR',
        message: err.message || 'Login failed.',
      });
    }
  }

  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
        return;
      }

      if (isMongoConnected()) {
        const user = await UserModel.findById(req.user.id).select('-passwordHash');
        if (!user) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
          return;
        }
        res.json({ user: { id: user._id.toString(), email: user.email, name: user.name } });
      } else {
        const user = memoryUsers.get(req.user.email);
        if (!user) {
          res.json({ user: { id: req.user.id, email: req.user.email, name: 'User' } });
          return;
        }
        res.json({ user: { id: user.id, email: user.email, name: user.name } });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
}
