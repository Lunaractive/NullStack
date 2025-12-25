import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_CODES } from '@nullstack/shared';

export interface PlayerAuthPayload {
  playerId: string;
  titleId: string;
  type: 'player';
}

declare global {
  namespace Express {
    interface Request {
      player?: PlayerAuthPayload;
    }
  }
}

export function authenticatePlayer(
  req: Request,
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

    try {
      const decoded = jwt.verify(token, jwtSecret) as PlayerAuthPayload;

      if (decoded.type !== 'player') {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Invalid token type',
          },
        });
      }

      req.player = decoded;
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.TOKEN_EXPIRED,
            message: 'Token has expired',
          },
        });
      }

      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid token',
        },
      });
    }
  } catch (error) {
    next(error);
  }
}

export function validatePlayerAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestedPlayerId = req.params.playerId;

  if (!req.player) {
    return res.status(401).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required',
      },
    });
  }

  if (req.player.playerId !== requestedPlayerId) {
    return res.status(403).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Access denied to this player data',
      },
    });
  }

  next();
}
