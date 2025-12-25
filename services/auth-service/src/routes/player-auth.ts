import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { postgres } from '@nullstack/database';
import { redis } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { validateRequest } from '../middleware/validate-request';
import { rateLimiter } from '../middleware/rate-limiter';
import { validateTitleKey } from '../middleware/validate-title';
import crypto from 'crypto';

const router = Router();

const registerWithEmailSchema = z.object({
  titleId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(20).optional(),
});

const loginWithEmailSchema = z.object({
  titleId: z.string().uuid(),
  email: z.string().email(),
  password: z.string(),
});

const loginAnonymousSchema = z.object({
  titleId: z.string().uuid(),
  deviceId: z.string(),
});

const linkAccountSchema = z.object({
  platform: z.enum(['email', 'google', 'facebook', 'steam', 'apple', 'custom']),
  platformUserId: z.string(),
  credentials: z.record(z.any()).optional(),
});

router.post(
  '/register',
  validateTitleKey,
  rateLimiter({ windowMs: 60000, max: 10 }),
  validateRequest(registerWithEmailSchema),
  async (req, res, next) => {
    try {
      const { titleId, email, password, username } = req.body;

      const existingEmail = await postgres.query(
        'SELECT id FROM player_accounts WHERE title_id = $1 AND email = $2',
        [titleId, email]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.CONFLICT,
            message: 'Email already registered for this title',
          },
        });
      }

      if (username) {
        const existingUsername = await postgres.query(
          'SELECT id FROM player_accounts WHERE title_id = $1 AND username = $2',
          [titleId, username]
        );

        if (existingUsername.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: {
              code: ERROR_CODES.USERNAME_TAKEN,
              message: 'Username already taken',
            },
          });
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const playerResult = await postgres.query(
        `INSERT INTO player_accounts (title_id, email, username)
         VALUES ($1, $2, $3)
         RETURNING id, title_id, email, username, created_at`,
        [titleId, email, username || null]
      );

      const player = playerResult.rows[0];

      await postgres.query(
        `INSERT INTO linked_accounts (player_id, platform, platform_user_id)
         VALUES ($1, $2, $3)`,
        [player.id, 'email', passwordHash]
      );

      const sessionToken = generateSessionToken(player.id, titleId);

      res.status(201).json({
        success: true,
        data: {
          playerId: player.id,
          sessionTicket: sessionToken.accessToken,
          refreshToken: sessionToken.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  validateTitleKey,
  rateLimiter({ windowMs: 60000, max: 10 }),
  validateRequest(loginWithEmailSchema),
  async (req, res, next) => {
    try {
      const { titleId, email, password } = req.body;

      const playerResult = await postgres.query(
        `SELECT pa.id, pa.title_id, pa.email, pa.username, pa.banned, pa.ban_expires
         FROM player_accounts pa
         WHERE pa.title_id = $1 AND pa.email = $2`,
        [titleId, email]
      );

      if (playerResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
          },
        });
      }

      const player = playerResult.rows[0];

      if (player.banned) {
        const banActive = !player.ban_expires || new Date(player.ban_expires) > new Date();
        if (banActive) {
          return res.status(403).json({
            success: false,
            error: {
              code: ERROR_CODES.PLAYER_BANNED,
              message: 'Player account is banned',
              details: { banExpires: player.ban_expires },
            },
          });
        }
      }

      const linkedAccount = await postgres.query(
        `SELECT platform_user_id FROM linked_accounts
         WHERE player_id = $1 AND platform = 'email'`,
        [player.id]
      );

      if (linkedAccount.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
          },
        });
      }

      const passwordHash = linkedAccount.rows[0].platform_user_id;
      const passwordValid = await bcrypt.compare(password, passwordHash);

      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
          },
        });
      }

      await postgres.query(
        'UPDATE player_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [player.id]
      );

      const sessionToken = generateSessionToken(player.id, titleId);

      res.json({
        success: true,
        data: {
          playerId: player.id,
          sessionTicket: sessionToken.accessToken,
          refreshToken: sessionToken.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login-anonymous',
  validateTitleKey,
  rateLimiter({ windowMs: 60000, max: 20 }),
  validateRequest(loginAnonymousSchema),
  async (req, res, next) => {
    try {
      const { titleId, deviceId } = req.body;

      const titleSettings = await postgres.query(
        'SELECT allow_anonymous_login FROM title_settings WHERE title_id = $1',
        [titleId]
      );

      if (!titleSettings.rows[0]?.allow_anonymous_login) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Anonymous login not allowed for this title',
          },
        });
      }

      const existingAccount = await postgres.query(
        `SELECT pa.id FROM player_accounts pa
         JOIN linked_accounts la ON pa.id = la.player_id
         WHERE la.platform = 'anonymous' AND la.platform_user_id = $1 AND pa.title_id = $2`,
        [deviceId, titleId]
      );

      let playerId: string;

      if (existingAccount.rows.length > 0) {
        playerId = existingAccount.rows[0].id;

        await postgres.query(
          'UPDATE player_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
          [playerId]
        );
      } else {
        const playerResult = await postgres.query(
          `INSERT INTO player_accounts (title_id)
           VALUES ($1)
           RETURNING id`,
          [titleId]
        );

        playerId = playerResult.rows[0].id;

        await postgres.query(
          `INSERT INTO linked_accounts (player_id, platform, platform_user_id)
           VALUES ($1, $2, $3)`,
          [playerId, 'anonymous', deviceId]
        );
      }

      const sessionToken = generateSessionToken(playerId, titleId);

      res.json({
        success: true,
        data: {
          playerId,
          sessionTicket: sessionToken.accessToken,
          refreshToken: sessionToken.refreshToken,
          newlyCreated: existingAccount.rows.length === 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/link-account',
  validateTitleKey,
  async (req, res, next) => {
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
      const decoded = verifyPlayerToken(token);

      const { platform, platformUserId, credentials } = req.body;

      const existingLink = await postgres.query(
        `SELECT player_id FROM linked_accounts
         WHERE platform = $1 AND platform_user_id = $2`,
        [platform, platformUserId]
      );

      if (existingLink.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.ACCOUNT_ALREADY_LINKED,
            message: 'This account is already linked to another player',
          },
        });
      }

      await postgres.query(
        `INSERT INTO linked_accounts (player_id, platform, platform_user_id)
         VALUES ($1, $2, $3)`,
        [decoded.playerId, platform, platformUserId]
      );

      res.json({
        success: true,
        data: { message: 'Account linked successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
);

function generateSessionToken(playerId: string, titleId: string) {
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

  const accessToken = jwt.sign(
    {
      playerId,
      titleId,
      type: 'player',
    },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    {
      playerId,
      titleId,
      type: 'player',
    },
    jwtRefreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

function verifyPlayerToken(token: string): any {
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.verify(token, jwtSecret);
}

export const playerAuthRouter = router;
