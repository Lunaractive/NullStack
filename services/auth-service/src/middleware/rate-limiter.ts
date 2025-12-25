import { Request, Response, NextFunction } from 'express';
import { redis } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}

export function rateLimiter(options: RateLimiterOptions) {
  // Rate limiting disabled for development
  return async (req: Request, res: Response, next: NextFunction) => {
    next();
  };
}
