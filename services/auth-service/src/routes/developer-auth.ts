import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { postgres } from '@nullstack/database';
import { redis } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { validateRequest } from '../middleware/validate-request';
import { rateLimiter } from '../middleware/rate-limiter';
import { authenticateDeveloper, AuthenticatedRequest } from '../middleware/authenticate-developer';
import crypto from 'crypto';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  companyName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post(
  '/register',
  rateLimiter({ windowMs: 60000, max: 100 }),
  validateRequest(registerSchema),
  async (req, res, next) => {
    try {
      const { email, password, name, companyName } = req.body;

      const existingUser = await postgres.query(
        'SELECT id FROM developer_accounts WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.CONFLICT,
            message: 'Email already registered',
          },
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await postgres.query(
        `INSERT INTO developer_accounts (email, password_hash, name, company_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, company_name, created_at`,
        [email, passwordHash, name, companyName || null]
      );

      const developer = result.rows[0];

      const verificationToken = crypto.randomBytes(32).toString('hex');
      await redis.set(
        `email_verification:${verificationToken}`,
        developer.id,
        3600 * 24
      );

      res.status(201).json({
        success: true,
        data: {
          id: developer.id,
          email: developer.email,
          name: developer.name,
          companyName: developer.company_name,
          emailVerified: false,
          verificationToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  rateLimiter({ windowMs: 60000, max: 100 }),
  validateRequest(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const result = await postgres.query(
        `SELECT id, email, password_hash, name, company_name, email_verified
         FROM developer_accounts
         WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
          },
        });
      }

      const developer = result.rows[0];

      const passwordValid = await bcrypt.compare(password, developer.password_hash);

      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
          },
        });
      }

      const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

      const accessToken = jwt.sign(
        {
          id: developer.id,
          email: developer.email,
          type: 'developer',
        },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      const refreshToken = jwt.sign(
        {
          id: developer.id,
          type: 'developer',
        },
        jwtRefreshSecret,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      await redis.set(
        `developer_session:${developer.id}`,
        refreshToken,
        7 * 24 * 3600
      );

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          expiresIn: 3600,
          developer: {
            id: developer.id,
            email: developer.email,
            name: developer.name,
            companyName: developer.company_name,
            emailVerified: developer.email_verified,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Refresh token required',
        },
      });
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as any;

    if (decoded.type !== 'developer') {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid token type',
        },
      });
    }

    const storedToken = await redis.get(`developer_session:${decoded.id}`);

    if (storedToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid refresh token',
        },
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    const accessToken = jwt.sign(
      {
        id: decoded.id,
        type: 'developer',
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid refresh token',
        },
      });
    }
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
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

    await redis.delete(`developer_session:${decoded.id}`);

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const developerId = await redis.get(`email_verification:${token}`);

    if (!developerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid or expired verification token',
        },
      });
    }

    await postgres.query(
      'UPDATE developer_accounts SET email_verified = TRUE WHERE id = $1',
      [developerId]
    );

    await redis.delete(`email_verification:${token}`);

    res.json({
      success: true,
      data: { message: 'Email verified successfully' },
    });
  } catch (error) {
    next(error);
  }
});

// Get current developer
router.get('/me', authenticateDeveloper, async (req: AuthenticatedRequest, res, next) => {
  try {
    const developerId = req.developerId!;

    const result = await postgres.query(
      `SELECT id, email, name, company_name, email_verified, created_at
       FROM developer_accounts
       WHERE id = $1`,
      [developerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Developer account not found',
        },
      });
    }

    const developer = result.rows[0];

    res.json({
      success: true,
      data: {
        id: developer.id,
        email: developer.email,
        name: developer.name,
        companyName: developer.company_name,
        emailVerified: developer.email_verified,
        createdAt: developer.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const developerAuthRouter = router;
