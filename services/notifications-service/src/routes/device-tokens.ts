import { Router } from 'express';
import { z } from 'zod';
import { DeviceToken } from '../models/device-token';
import { authenticatePlayer, AuthRequest } from '../middleware/auth';
import { ERROR_CODES } from '@nullstack/shared';

const router = Router();

// Validation schemas
const registerDeviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().optional(),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
});

// POST /api/v1/devices/register - Register device token (player)
router.post('/register', authenticatePlayer, async (req: AuthRequest, res) => {
  try {
    const validatedData = registerDeviceSchema.parse(req.body);

    // Check if token already exists
    let deviceToken = await DeviceToken.findOne({
      token: validatedData.token,
    });

    if (deviceToken) {
      // Update existing token
      deviceToken.playerId = req.user!.playerId!;
      deviceToken.titleId = req.user!.titleId;
      deviceToken.platform = validatedData.platform;
      deviceToken.appVersion = validatedData.appVersion;
      deviceToken.deviceModel = validatedData.deviceModel;
      deviceToken.osVersion = validatedData.osVersion;
      deviceToken.enabled = true;
      deviceToken.updatedAt = new Date();
    } else {
      // Create new token
      deviceToken = new DeviceToken({
        playerId: req.user!.playerId!,
        titleId: req.user!.titleId,
        token: validatedData.token,
        platform: validatedData.platform,
        appVersion: validatedData.appVersion,
        deviceModel: validatedData.deviceModel,
        osVersion: validatedData.osVersion,
        enabled: true,
      });
    }

    await deviceToken.save();

    res.status(200).json({
      success: true,
      data: {
        token: deviceToken.token,
        platform: deviceToken.platform,
        enabled: deviceToken.enabled,
        createdAt: deviceToken.createdAt,
        updatedAt: deviceToken.updatedAt,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: error.errors,
        },
      });
    }

    throw error;
  }
});

// DELETE /api/v1/devices/:token - Unregister device
router.delete('/:token', authenticatePlayer, async (req: AuthRequest, res) => {
  try {
    const deviceToken = await DeviceToken.findOne({
      token: req.params.token,
      playerId: req.user!.playerId,
      titleId: req.user!.titleId,
    });

    if (!deviceToken) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Device token not found',
        },
      });
    }

    // Disable the token instead of deleting it
    deviceToken.enabled = false;
    deviceToken.updatedAt = new Date();
    await deviceToken.save();

    res.json({
      success: true,
      data: {
        message: 'Device token unregistered successfully',
      },
    });
  } catch (error) {
    throw error;
  }
});

// GET /api/v1/devices - Get all devices for current player (optional endpoint)
router.get('/', authenticatePlayer, async (req: AuthRequest, res) => {
  try {
    const deviceTokens = await DeviceToken.find({
      playerId: req.user!.playerId,
      titleId: req.user!.titleId,
      enabled: true,
    }).select('-__v');

    res.json({
      success: true,
      data: {
        devices: deviceTokens.map(dt => ({
          token: dt.token,
          platform: dt.platform,
          appVersion: dt.appVersion,
          deviceModel: dt.deviceModel,
          osVersion: dt.osVersion,
          createdAt: dt.createdAt,
          updatedAt: dt.updatedAt,
        })),
      },
    });
  } catch (error) {
    throw error;
  }
});

export const deviceTokensRouter = router;
