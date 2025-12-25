import { Request, Response, NextFunction } from 'express';
import { postgres } from '@nullstack/database';
import { redis } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';

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
      req.body.titleId = cachedTitleId;
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

    req.body.titleId = title.id;
    next();
  } catch (error) {
    next(error);
  }
}
