import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_CODES } from '@nullstack/shared';
import { postgres } from '@nullstack/database';

export interface AuthRequest extends Request {
  playerId?: string;
  titleId?: string;
  developerId?: string;
  authType?: 'player' | 'developer';
}

export const verifyPlayerToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
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
      req.authType = 'player';

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid or expired token',
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

export const verifyDeveloperToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
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

      req.developerId = decoded.developerId;
      req.titleId = decoded.titleId;
      req.authType = 'developer';

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid or expired token',
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

export const verifyTitleKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const titleKey = req.headers['x-title-key'] as string;
    if (!titleKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TITLE_KEY,
          message: 'Title key is required',
        },
      });
    }

    const result = await postgres.query(
      'SELECT title_id FROM title_keys WHERE key_value = $1',
      [titleKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TITLE_KEY,
          message: 'Invalid title key',
        },
      });
    }

    req.titleId = result.rows[0].title_id;
    next();
  } catch (error) {
    next(error);
  }
};
