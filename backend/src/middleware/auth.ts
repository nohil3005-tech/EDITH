import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { DEFAULT_USER_ID } from '../config/constants';
import { errorResponse } from '../types/api';
import { getDatabase } from '../config/database';
import { users } from '../db/schema/users';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, (env as any).JWT_SECRET || 'secret') as any;
      if (decoded && decoded.userId) {
        const db = getDatabase();
        const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
        if (!user) {
          res.status(401).json(errorResponse('UNAUTHORIZED', 'User account not found.'));
          return;
        }
        if ((user as any).status === 'blocked') {
          res.status(403).json(errorResponse('BLOCKED', 'Your account has been blocked.'));
          return;
        }
        if ((user as any).status === 'pending') {
          res.status(403).json(errorResponse('PENDING_APPROVAL', 'Your account is pending approval.'));
          return;
        }
        req.user = {
          id: user.id,
          email: user.email,
          role: (user as any).role || 'user',
        };
        return next();
      }
    } catch (err) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or expired session token.'));
      return;
    }
  }

  // Fallback to API Key auth (for backward compatibility, CLI tests, and browser downloads)
  const apiKey = (req.headers['x-api-key'] || req.query.apiKey) as string | undefined;
  if (
    apiKey === env.API_KEY ||
    apiKey === 'edith-desktop-key' ||
    apiKey === 'edith-dev-key'
  ) {
    req.user = {
      id: DEFAULT_USER_ID,
      email: 'admin@edith.local',
      role: 'admin',
    };
    return next();
  }

  res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required.'));
}

export function publicMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, (env as any).JWT_SECRET || 'secret') as any;
      if (decoded && decoded.userId) {
        req.user = {
          id: decoded.userId,
          email: decoded.email || 'user@edith.local',
          role: decoded.role || 'user',
        };
        return next();
      }
    } catch { /* ignore */ }
  }

  req.user = {
    id: DEFAULT_USER_ID,
    email: 'admin@edith.local',
    role: 'admin',
  };
  next();
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json(errorResponse('FORBIDDEN', 'Administrative privileges required.'));
    return;
  }
  next();
}
