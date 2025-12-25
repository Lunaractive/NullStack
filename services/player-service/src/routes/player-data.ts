import { Router } from 'express';
import { z } from 'zod';
import { PlayerProfile } from '@nullstack/database';
import { ERROR_CODES, PLAYER_DATA_KEYS } from '@nullstack/shared';
import { authenticatePlayer, validatePlayerAccess } from '../middleware/authenticate-player';
import {
  getPlayerData,
  setPlayerData,
  deletePlayerData,
} from '../models/player-data';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
});

const setPlayerDataSchema = z.object({
  value: z.any(),
  permission: z.enum(['Public', 'Private']).optional(),
});

router.get(
  '/:playerId/profile',
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

      res.json({
        success: true,
        data: {
          playerId: profile.playerId,
          titleId: profile.titleId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          level: profile.level,
          experience: profile.experience,
          tags: profile.tags,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:playerId/profile',
  authenticatePlayer,
  validatePlayerAccess,
  async (req, res, next) => {
    try {
      const { playerId } = req.params;
      const titleId = req.player!.titleId;

      const validation = updateProfileSchema.safeParse(req.body);
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

      const { displayName, avatarUrl } = validation.data;

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (displayName !== undefined) {
        updateData.displayName = displayName;
      }

      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl;
      }

      let profile = await PlayerProfile.findOne({ playerId, titleId });

      if (!profile) {
        profile = await PlayerProfile.create({
          playerId,
          titleId,
          displayName: displayName || `Player_${playerId.substring(0, 8)}`,
          avatarUrl: avatarUrl || '',
          level: 1,
          experience: 0,
          tags: [],
          customData: new Map(),
          statistics: new Map(),
        });
      } else {
        profile = await PlayerProfile.findOneAndUpdate(
          { playerId, titleId },
          updateData,
          { new: true }
        );
      }

      res.json({
        success: true,
        data: {
          playerId: profile!.playerId,
          titleId: profile!.titleId,
          displayName: profile!.displayName,
          avatarUrl: profile!.avatarUrl,
          level: profile!.level,
          experience: profile!.experience,
          updatedAt: profile!.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:playerId/data/:key',
  authenticatePlayer,
  validatePlayerAccess,
  async (req, res, next) => {
    try {
      const { playerId, key } = req.params;
      const titleId = req.player!.titleId;
      const dataType = req.query.dataType as string || PLAYER_DATA_KEYS.CUSTOM_DATA;

      const validDataTypes = [
        PLAYER_DATA_KEYS.CUSTOM_DATA,
        PLAYER_DATA_KEYS.READ_ONLY_DATA,
        PLAYER_DATA_KEYS.INTERNAL_DATA,
      ];

      if (!validDataTypes.includes(dataType as any)) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Invalid dataType. Must be CustomData, ReadOnlyData, or InternalData',
          },
        });
      }

      const data = await getPlayerData(playerId, titleId, dataType, key);

      if (!data[key]) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: `Key '${key}' not found`,
          },
        });
      }

      res.json({
        success: true,
        data: {
          key,
          value: data[key].value,
          lastUpdated: data[key].lastUpdated,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:playerId/data/:key',
  authenticatePlayer,
  validatePlayerAccess,
  async (req, res, next) => {
    try {
      const { playerId, key } = req.params;
      const titleId = req.player!.titleId;
      const dataType = req.query.dataType as string || PLAYER_DATA_KEYS.CUSTOM_DATA;

      const validDataTypes = [
        PLAYER_DATA_KEYS.CUSTOM_DATA,
        PLAYER_DATA_KEYS.READ_ONLY_DATA,
        PLAYER_DATA_KEYS.INTERNAL_DATA,
      ];

      if (!validDataTypes.includes(dataType as any)) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Invalid dataType. Must be CustomData, ReadOnlyData, or InternalData',
          },
        });
      }

      if (dataType === PLAYER_DATA_KEYS.READ_ONLY_DATA) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'ReadOnlyData cannot be modified by players',
          },
        });
      }

      const validation = setPlayerDataSchema.safeParse(req.body);
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

      const { value, permission } = validation.data;

      await setPlayerData(playerId, titleId, dataType, key, value, permission);

      res.json({
        success: true,
        data: {
          message: 'Player data updated successfully',
          key,
          dataType,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:playerId/data/:key',
  authenticatePlayer,
  validatePlayerAccess,
  async (req, res, next) => {
    try {
      const { playerId, key } = req.params;
      const titleId = req.player!.titleId;
      const dataType = req.query.dataType as string || PLAYER_DATA_KEYS.CUSTOM_DATA;

      const validDataTypes = [
        PLAYER_DATA_KEYS.CUSTOM_DATA,
        PLAYER_DATA_KEYS.READ_ONLY_DATA,
        PLAYER_DATA_KEYS.INTERNAL_DATA,
      ];

      if (!validDataTypes.includes(dataType as any)) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'Invalid dataType. Must be CustomData, ReadOnlyData, or InternalData',
          },
        });
      }

      if (dataType === PLAYER_DATA_KEYS.READ_ONLY_DATA) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'ReadOnlyData cannot be deleted by players',
          },
        });
      }

      const deleted = await deletePlayerData(playerId, titleId, dataType, key);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: `Key '${key}' not found`,
          },
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Player data deleted successfully',
          key,
          dataType,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const playerDataRouter = router;
