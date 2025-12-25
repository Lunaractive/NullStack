import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    projectId: string;
    role: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = {
      userId: decoded.userId || decoded.sub,
      projectId: decoded.projectId,
      role: decoded.role || 'user',
    };
    next();
  } catch (error: any) {
    logger.error('Token verification failed', { error: error.message });
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireDeveloperRole = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'developer' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Developer role required' });
    return;
  }

  next();
};
