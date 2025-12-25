import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_CODES } from '@nullstack/shared';

export interface AuthRequest extends Request {
  developerId?: string;
  titleId?: string;
  playerId?: string;
  userType?: 'developer' | 'player';
}

export function authenticateDeveloper(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'No token provided',
        },
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (decoded.type !== 'developer') {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid token type',
        },
      });
    }

    req.developerId = decoded.id;
    req.userType = 'developer';
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid token',
        },
      });
    }
    next(error);
  }
}

export function authenticateTitle(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const titleKey = req.headers['x-title-key'] as string;

    if (!titleKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TITLE_KEY,
          message: 'Title key required',
        },
      });
    }

    // Extract titleId from the title key (format: titleId_key)
    const titleId = titleKey.split('_')[0];

    if (!titleId) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TITLE_KEY,
          message: 'Invalid title key format',
        },
      });
    }

    req.titleId = titleId;
    next();
  } catch (error) {
    next(error);
  }
}

export function authenticatePlayer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'No token provided',
        },
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (decoded.type !== 'player') {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid token type',
        },
      });
    }

    req.playerId = decoded.playerId;
    req.titleId = decoded.titleId;
    req.userType = 'player';
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid token',
        },
      });
    }
    next(error);
  }
}
