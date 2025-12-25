import { Router } from 'express';
import { z } from 'zod';
import { postgres } from '@nullstack/database';
import { redis } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { validateRequest } from '../middleware/validate-request';
import { validateTitleKey } from '../middleware/auth';

const router = Router();

// Validation schemas
const updateStatisticSchema = z.object({
  playerId: z.string().min(1),
  statisticName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  value: z.number(),
  updateType: z.enum(['set', 'increment', 'max', 'min']).default('set'),
});

// Helper function to update leaderboards based on statistic
async function updateLeaderboards(
  titleId: string,
  playerId: string,
  statisticName: string,
  value: number
) {
  // Find all leaderboards that use this statistic
  const leaderboards = await postgres.query(
    `SELECT id, sort_order, max_entries FROM leaderboards
     WHERE title_id = $1 AND statistic_name = $2`,
    [titleId, statisticName]
  );

  // Update each leaderboard in Redis
  for (const leaderboard of leaderboards.rows) {
    const redisKey = `leaderboard:${leaderboard.id}:scores`;

    // Add or update player score in sorted set
    await redis.zadd(redisKey, value, playerId);

    // Trim to max entries if needed
    const maxEntries = leaderboard.max_entries;
    const isDescending = leaderboard.sort_order === 'descending';

    if (isDescending) {
      // Keep top scores, remove lowest
      const count = await redis.zcard(redisKey);
      if (count > maxEntries) {
        await redis.zremrangebyrank(redisKey, 0, count - maxEntries - 1);
      }
    } else {
      // Keep lowest scores, remove highest
      const count = await redis.zcard(redisKey);
      if (count > maxEntries) {
        await redis.zremrangebyrank(redisKey, maxEntries, -1);
      }
    }

    // Invalidate cache for this leaderboard
    await redis.deletePattern(`leaderboard:${leaderboard.id}:*`);
  }
}

// POST /api/v1/statistics/update - Update player statistics
router.post(
  '/update',
  validateTitleKey,
  validateRequest(updateStatisticSchema),
  async (req, res, next) => {
    try {
      const { playerId, statisticName, value, updateType } = req.body;
      const titleId = req.titleId;

      // Get current statistic value
      const currentStatResult = await postgres.query(
        `SELECT value FROM player_statistics
         WHERE title_id = $1 AND player_id = $2 AND statistic_name = $3`,
        [titleId, playerId, statisticName]
      );

      let newValue = value;
      let currentValue = 0;

      if (currentStatResult.rows.length > 0) {
        currentValue = currentStatResult.rows[0].value;

        // Calculate new value based on update type
        switch (updateType) {
          case 'set':
            newValue = value;
            break;
          case 'increment':
            newValue = currentValue + value;
            break;
          case 'max':
            newValue = Math.max(currentValue, value);
            break;
          case 'min':
            newValue = Math.min(currentValue, value);
            break;
        }

        // Update existing statistic
        await postgres.query(
          `UPDATE player_statistics
           SET value = $1, updated_at = $2
           WHERE title_id = $3 AND player_id = $4 AND statistic_name = $5`,
          [newValue, new Date(), titleId, playerId, statisticName]
        );
      } else {
        // Create new statistic
        await postgres.query(
          `INSERT INTO player_statistics
           (title_id, player_id, statistic_name, value, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [titleId, playerId, statisticName, newValue, new Date(), new Date()]
        );
      }

      // Update related leaderboards
      await updateLeaderboards(titleId, playerId, statisticName, newValue);

      res.json({
        success: true,
        data: {
          playerId,
          statisticName,
          previousValue: currentValue,
          newValue,
          updateType,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/statistics/player/:playerId - Get all player statistics
router.get(
  '/player/:playerId',
  validateTitleKey,
  async (req, res, next) => {
    try {
      const { playerId } = req.params;
      const titleId = req.titleId;

      const cacheKey = `statistics:${titleId}:${playerId}`;

      // Try to get from cache
      const cachedStats = await redis.get(cacheKey);
      if (cachedStats) {
        return res.json({
          success: true,
          data: {
            playerId,
            statistics: cachedStats,
          },
        });
      }

      // Get all statistics for player
      const result = await postgres.query(
        `SELECT statistic_name, value, updated_at
         FROM player_statistics
         WHERE title_id = $1 AND player_id = $2
         ORDER BY statistic_name ASC`,
        [titleId, playerId]
      );

      const statistics = result.rows.map(row => ({
        statisticName: row.statistic_name,
        value: row.value,
        updatedAt: row.updated_at,
      }));

      // Cache for 5 minutes
      await redis.set(cacheKey, statistics, 300);

      res.json({
        success: true,
        data: {
          playerId,
          statistics,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const statisticsRouter = router;
