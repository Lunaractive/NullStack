import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_CODES } from '@nullstack/shared';

export interface AuthenticatedRequest extends Request {
  developerId?: string;
  developerEmail?: string;
}

/**
 * Middleware to authenticate developer requests using JWT tokens
 * Expects Authorization header with Bearer token
 */
export function authenticateDeveloper(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'No authorization token provided',
        },
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;

      // Verify this is a developer token
      if (decoded.type !== 'developer') {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Invalid token type',
          },
        });
      }

      // Attach developer info to request
      req.developerId = decoded.id;
      req.developerEmail = decoded.email;

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
