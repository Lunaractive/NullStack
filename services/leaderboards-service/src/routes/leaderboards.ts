import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { postgres } from '@nullstack/database';
import { redis } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { validateRequest } from '../middleware/validate-request';
import { validateDeveloperAuth, validateTitleKey } from '../middleware/auth';
import { calculateNextReset } from '../utils/reset-scheduler';
import { ResetFrequency, SortOrder } from '../types/leaderboard';

const router = Router();

// Validation schemas
const createLeaderboardSchema = z.object({
  leaderboardName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().min(1).max(200),
  statisticName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  sortOrder: z.enum(['ascending', 'descending']).default('descending'),
  resetFrequency: z.enum(['never', 'hourly', 'daily', 'weekly', 'monthly']).default('never'),
  maxEntries: z.number().int().min(10).max(10000).default(100),
});

// POST /api/v1/leaderboards - Create leaderboard (developer)
router.post(
  '/',
  validateDeveloperAuth,
  validateRequest(createLeaderboardSchema),
  async (req, res, next) => {
    try {
      const { leaderboardName, displayName, statisticName, sortOrder, resetFrequency, maxEntries } = req.body;
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

      // Get title ID from title key
      const titleResult = await postgres.query(
        'SELECT id FROM titles WHERE secret_key = $1',
        [titleKey]
      );

      if (titleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.TITLE_NOT_FOUND,
            message: 'Title not found',
          },
        });
      }

      const titleId = titleResult.rows[0].id;

      // Check if leaderboard already exists
      const existingLeaderboard = await postgres.query(
        'SELECT id FROM leaderboards WHERE title_id = $1 AND leaderboard_name = $2',
        [titleId, leaderboardName]
      );

      if (existingLeaderboard.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.CONFLICT,
            message: 'Leaderboard name already exists',
          },
        });
      }

      const leaderboardId = uuidv4();
      const now = new Date();
      const nextResetAt = calculateNextReset(resetFrequency as ResetFrequency, now);

      // Create leaderboard
      const result = await postgres.query(
        `INSERT INTO leaderboards
         (id, title_id, leaderboard_name, display_name, statistic_name, sort_order,
          reset_frequency, max_entries, last_reset_at, next_reset_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          leaderboardId,
          titleId,
          leaderboardName,
          displayName,
          statisticName,
          sortOrder,
          resetFrequency,
          maxEntries,
          now,
          nextResetAt,
          now,
          now,
        ]
      );

      res.status(201).json({
        success: true,
        data: {
          id: result.rows[0].id,
          leaderboardName: result.rows[0].leaderboard_name,
          displayName: result.rows[0].display_name,
          statisticName: result.rows[0].statistic_name,
          sortOrder: result.rows[0].sort_order,
          resetFrequency: result.rows[0].reset_frequency,
          maxEntries: result.rows[0].max_entries,
          lastResetAt: result.rows[0].last_reset_at,
          nextResetAt: result.rows[0].next_reset_at,
          createdAt: result.rows[0].created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/leaderboards - List leaderboards
router.get(
  '/',
  validateTitleKey,
  async (req, res, next) => {
    try {
      const titleId = req.titleId;

      const result = await postgres.query(
        `SELECT id, leaderboard_name, display_name, statistic_name, sort_order,
                reset_frequency, max_entries, last_reset_at, next_reset_at, created_at
         FROM leaderboards
         WHERE title_id = $1
         ORDER BY created_at DESC`,
        [titleId]
      );

      res.json({
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          leaderboardName: row.leaderboard_name,
          displayName: row.display_name,
          statisticName: row.statistic_name,
          sortOrder: row.sort_order,
          resetFrequency: row.reset_frequency,
          maxEntries: row.max_entries,
          lastResetAt: row.last_reset_at,
          nextResetAt: row.next_reset_at,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/leaderboards/:id/entries - Get leaderboard entries with pagination
router.get(
  '/:id/entries',
  validateTitleKey,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const titleId = req.titleId;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const offset = parseInt(req.query.offset as string) || 0;

      // Verify leaderboard exists and belongs to title
      const leaderboardResult = await postgres.query(
        `SELECT id, leaderboard_name, statistic_name, sort_order, max_entries
         FROM leaderboards
         WHERE id = $1 AND title_id = $2`,
        [id, titleId]
      );

      if (leaderboardResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Leaderboard not found',
          },
        });
      }

      const leaderboard = leaderboardResult.rows[0];
      const cacheKey = `leaderboard:${id}:entries:${offset}:${limit}`;

      // Try to get from cache
      const cachedEntries = await redis.get(cacheKey);
      if (cachedEntries) {
        return res.json({
          success: true,
          data: {
            leaderboardId: id,
            leaderboardName: leaderboard.leaderboard_name,
            entries: cachedEntries,
          },
        });
      }

      // Get entries from Redis sorted set
      const redisKey = `leaderboard:${id}:scores`;
      const isDescending = leaderboard.sort_order === 'descending';

      // Get entries with scores
      const entries = isDescending
        ? await redis.zrevrange(redisKey, offset, offset + limit - 1, true)
        : await redis.zrange(redisKey, offset, offset + limit - 1, true);

      // Parse entries (format is [member, score, member, score, ...])
      const parsedEntries = [];
      for (let i = 0; i < entries.length; i += 2) {
        const playerId = entries[i];
        const value = parseFloat(entries[i + 1]);
        const rank = offset + (i / 2) + 1;

        parsedEntries.push({
          playerId,
          value,
          rank,
        });
      }

      // Cache for 60 seconds
      await redis.set(cacheKey, parsedEntries, 60);

      res.json({
        success: true,
        data: {
          leaderboardId: id,
          leaderboardName: leaderboard.leaderboard_name,
          entries: parsedEntries,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/leaderboards/:id/player/:playerId - Get player position
router.get(
  '/:id/player/:playerId',
  validateTitleKey,
  async (req, res, next) => {
    try {
      const { id, playerId } = req.params;
      const titleId = req.titleId;

      // Verify leaderboard exists and belongs to title
      const leaderboardResult = await postgres.query(
        `SELECT id, leaderboard_name, statistic_name, sort_order
         FROM leaderboards
         WHERE id = $1 AND title_id = $2`,
        [id, titleId]
      );

      if (leaderboardResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Leaderboard not found',
          },
        });
      }

      const leaderboard = leaderboardResult.rows[0];
      const cacheKey = `leaderboard:${id}:player:${playerId}`;

      // Try to get from cache
      const cachedPosition = await redis.get(cacheKey);
      if (cachedPosition) {
        return res.json({
          success: true,
          data: cachedPosition,
        });
      }

      // Get player rank and score from Redis sorted set
      const redisKey = `leaderboard:${id}:scores`;
      const isDescending = leaderboard.sort_order === 'descending';

      const score = await redis.zscore(redisKey, playerId);
      if (score === null) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Player not found on leaderboard',
          },
        });
      }

      // Get rank (0-indexed, so add 1)
      const rank = isDescending
        ? await redis.zrevrank(redisKey, playerId)
        : await redis.zrank(redisKey, playerId);

      const position = {
        leaderboardId: id,
        leaderboardName: leaderboard.leaderboard_name,
        playerId,
        value: parseFloat(score),
        rank: rank !== null ? rank + 1 : null,
      };

      // Cache for 30 seconds
      await redis.set(cacheKey, position, 30);

      res.json({
        success: true,
        data: position,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/leaderboards/:id/reset - Reset leaderboard (developer)
router.post(
  '/:id/reset',
  validateDeveloperAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
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

      // Get title ID from title key
      const titleResult = await postgres.query(
        'SELECT id FROM titles WHERE secret_key = $1',
        [titleKey]
      );

      if (titleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.TITLE_NOT_FOUND,
            message: 'Title not found',
          },
        });
      }

      const titleId = titleResult.rows[0].id;

      // Verify leaderboard exists and belongs to title
      const leaderboardResult = await postgres.query(
        `SELECT id, reset_frequency FROM leaderboards WHERE id = $1 AND title_id = $2`,
        [id, titleId]
      );

      if (leaderboardResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.ITEM_NOT_FOUND,
            message: 'Leaderboard not found',
          },
        });
      }

      const leaderboard = leaderboardResult.rows[0];

      // Clear leaderboard entries in Redis
      const redisKey = `leaderboard:${id}:scores`;
      await redis.delete(redisKey);

      // Clear cache
      await redis.deletePattern(`leaderboard:${id}:*`);

      // Update last reset time and calculate next reset
      const now = new Date();
      const nextResetAt = calculateNextReset(
        leaderboard.reset_frequency as ResetFrequency,
        now
      );

      await postgres.query(
        `UPDATE leaderboards
         SET last_reset_at = $1, next_reset_at = $2, updated_at = $3
         WHERE id = $4`,
        [now, nextResetAt, now, id]
      );

      res.json({
        success: true,
        data: {
          leaderboardId: id,
          resetAt: now,
          nextResetAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const leaderboardsRouter = router;
