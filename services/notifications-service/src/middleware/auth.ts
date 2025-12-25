import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_CODES } from '@nullstack/shared';

export interface AuthRequest extends Request {
  user?: {
    developerId?: string;
    playerId?: string;
    titleId: string;
    type: 'developer' | 'player';
  };
}

export function authenticateDeveloper(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'No token provided',
        },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    if (decoded.type !== 'developer') {
      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Developer access required',
        },
      });
    }

    req.user = {
      developerId: decoded.developerId,
      titleId: decoded.titleId,
      type: 'developer',
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid token',
      },
    });
  }
}

export function authenticatePlayer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'No token provided',
        },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    if (decoded.type !== 'player') {
      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Player access required',
        },
      });
    }

    req.user = {
      playerId: decoded.playerId,
      titleId: decoded.titleId,
      type: 'player',
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid token',
      },
    });
  }
}
