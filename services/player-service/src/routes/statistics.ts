import { Router } from 'express';
import { z } from 'zod';
import { PlayerProfile } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { authenticatePlayer, validatePlayerAccess } from '../middleware/authenticate-player';

const router = Router();

const updateStatisticsSchema = z.object({
  statistics: z.record(z.number()),
});

router.get(
  '/:playerId/statistics',
  authenticatePlayer,
  validatePlayerAccess,
  async (req, res, next) => {
    try {
      const { playerId } = req.params;
      const titleId = req.player!.titleId;

      const profile = await PlayerProfile.findOne({ playerId, titleId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.PLAYER_NOT_FOUND,
            message: 'Player profile not found',
          },
        });
      }

      const statistics: Record<string, number> = {};
      if (profile.statistics) {
        profile.statistics.forEach((value, key) => {
          statistics[key] = value;
        });
      }

      res.json({
        success: true,
        data: {
          playerId: profile.playerId,
          statistics,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:playerId/statistics',
  authenticatePlayer,
  validatePlayerAccess,
  async (req, res, next) => {
    try {
      const { playerId } = req.params;
      const titleId = req.player!.titleId;

      const validation = updateStatisticsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid input',
            details: validation.error.errors,
          },
        });
      }

      const { statistics } = validation.data;

      let profile = await PlayerProfile.findOne({ playerId, titleId });

      if (!profile) {
        profile = await PlayerProfile.create({
          playerId,
          titleId,
          displayName: `Player_${playerId.substring(0, 8)}`,
          avatarUrl: '',
          level: 1,
          experience: 0,
          tags: [],
          customData: new Map(),
          statistics: new Map(Object.entries(statistics)),
        });
      } else {
        const currentStats = new Map(profile.statistics || new Map());

        Object.entries(statistics).forEach(([key, value]) => {
          const currentValue = currentStats.get(key) || 0;
          currentStats.set(key, currentValue + value);
        });

        profile.statistics = currentStats;
        profile.updatedAt = new Date();
        await profile.save();
      }

      const resultStatistics: Record<string, number> = {};
      if (profile.statistics) {
        profile.statistics.forEach((value, key) => {
          resultStatistics[key] = value;
        });
      }

      res.json({
        success: true,
        data: {
          playerId: profile.playerId,
          statistics: resultStatistics,
          updatedAt: profile.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const statisticsRouter = router;
