import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { postgres } from '@nullstack/database';
import { redis } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';

interface JWTPayload {
  id: string;
  email?: string;
  type: 'developer' | 'player' | 'server';
  titleId?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: JWTPayload;
      titleId?: string;
    }
  }
}

export async function validateDeveloperAuth(
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
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    if (decoded.type !== 'developer') {
      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Developer authentication required',
        },
      });
    }

    req.auth = decoded;
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

export async function validateTitleKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const titleKey = req.headers['x-title-key'] as string;

    if (!titleKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Title key required',
        },
      });
    }

    const cachedTitleId = await redis.get(`title_key:${titleKey}`);

    if (cachedTitleId) {
      req.titleId = cachedTitleId;
      return next();
    }

    const result = await postgres.query(
      `SELECT id, status FROM titles WHERE secret_key = $1`,
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

    const title = result.rows[0];

    if (title.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.TITLE_SUSPENDED,
          message: 'Title is suspended',
        },
      });
    }

    if (title.status === 'deleted') {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.TITLE_NOT_FOUND,
          message: 'Title not found',
        },
      });
    }

    await redis.set(`title_key:${titleKey}`, title.id, 3600);

    req.titleId = title.id;
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateServerAuth(
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
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    if (decoded.type !== 'server' && decoded.type !== 'developer') {
      return res.status(403).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Server or developer authentication required',
        },
      });
    }

    req.auth = decoded;
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
