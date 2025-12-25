import { Router } from 'express';
import { z } from 'zod';
import { Notification } from '../models/notification';
import { authenticateDeveloper, AuthRequest } from '../middleware/auth';
import { ERROR_CODES } from '@nullstack/shared';
import { notificationScheduler } from '../scheduler';
import { randomBytes } from 'crypto';

const router = Router();

// Validation schemas
const createNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
  imageUrl: z.string().url().optional(),
  targetType: z.enum(['broadcast', 'segment', 'players']),
  targetSegmentId: z.string().optional(),
  targetPlayerIds: z.array(z.string()).optional(),
  scheduledFor: z.string().datetime().optional(),
});

// POST /api/v1/notifications - Create notification (developer)
router.post('/', authenticateDeveloper, async (req: AuthRequest, res) => {
  try {
    const validatedData = createNotificationSchema.parse(req.body);

    // Validate target type requirements
    if (validatedData.targetType === 'segment' && !validatedData.targetSegmentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'targetSegmentId required for segment targeting',
        },
      });
    }

    if (validatedData.targetType === 'players' && (!validatedData.targetPlayerIds || validatedData.targetPlayerIds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'targetPlayerIds required for player targeting',
        },
      });
    }

    const notificationId = randomBytes(16).toString('hex');
    const scheduledFor = validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined;

    const notification = new Notification({
      titleId: req.user!.titleId,
      notificationId,
      title: validatedData.title,
      message: validatedData.message,
      data: validatedData.data,
      imageUrl: validatedData.imageUrl,
      targetType: validatedData.targetType,
      targetSegmentId: validatedData.targetSegmentId,
      targetPlayerIds: validatedData.targetPlayerIds,
      scheduledFor,
      status: scheduledFor ? 'scheduled' : 'draft',
      createdBy: req.user!.developerId || 'system',
    });

    await notification.save();

    res.status(201).json({
      success: true,
      data: {
        notificationId: notification.notificationId,
        status: notification.status,
        scheduledFor: notification.scheduledFor,
        createdAt: notification.createdAt,
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

// GET /api/v1/notifications - List notifications
router.get('/', authenticateDeveloper, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;

    const query: any = { titleId: req.user!.titleId };
    if (status) {
      query.status = status;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications: notifications.map(n => ({
          notificationId: n.notificationId,
          title: n.title,
          message: n.message,
          targetType: n.targetType,
          status: n.status,
          sentCount: n.sentCount,
          failedCount: n.failedCount,
          deliveredCount: n.deliveredCount,
          scheduledFor: n.scheduledFor,
          createdAt: n.createdAt,
          sentAt: n.sentAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    throw error;
  }
});

// GET /api/v1/notifications/:id - Get notification details
router.get('/:id', authenticateDeveloper, async (req: AuthRequest, res) => {
  try {
    const notification = await Notification.findOne({
      notificationId: req.params.id,
      titleId: req.user!.titleId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Notification not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        notificationId: notification.notificationId,
        title: notification.title,
        message: notification.message,
        data: notification.data instanceof Map
          ? Object.fromEntries(notification.data)
          : notification.data,
        imageUrl: notification.imageUrl,
        targetType: notification.targetType,
        targetSegmentId: notification.targetSegmentId,
        targetPlayerIds: notification.targetPlayerIds,
        status: notification.status,
        sentCount: notification.sentCount,
        failedCount: notification.failedCount,
        deliveredCount: notification.deliveredCount,
        scheduledFor: notification.scheduledFor,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        sentAt: notification.sentAt,
        errorMessage: notification.errorMessage,
      },
    });
  } catch (error) {
    throw error;
  }
});

// POST /api/v1/notifications/:id/send - Send notification immediately
router.post('/:id/send', authenticateDeveloper, async (req: AuthRequest, res) => {
  try {
    const notification = await Notification.findOne({
      notificationId: req.params.id,
      titleId: req.user!.titleId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Notification not found',
        },
      });
    }

    if (notification.status !== 'draft' && notification.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_INPUT,
          message: 'Notification cannot be sent in current status',
        },
      });
    }

    // Update to scheduled and trigger immediate send
    notification.status = 'scheduled';
    notification.scheduledFor = new Date();
    await notification.save();

    // Send immediately
    await notificationScheduler.sendNotification(notification);

    res.json({
      success: true,
      data: {
        notificationId: notification.notificationId,
        status: notification.status,
        sentCount: notification.sentCount,
        failedCount: notification.failedCount,
        sentAt: notification.sentAt,
      },
    });
  } catch (error) {
    throw error;
  }
});

// DELETE /api/v1/notifications/:id - Cancel scheduled notification
router.delete('/:id', authenticateDeveloper, async (req: AuthRequest, res) => {
  try {
    const notification = await Notification.findOne({
      notificationId: req.params.id,
      titleId: req.user!.titleId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Notification not found',
        },
      });
    }

    if (notification.status !== 'draft' && notification.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_INPUT,
          message: 'Only draft or scheduled notifications can be cancelled',
        },
      });
    }

    notification.status = 'cancelled';
    await notification.save();

    res.json({
      success: true,
      data: {
        notificationId: notification.notificationId,
        status: notification.status,
      },
    });
  } catch (error) {
    throw error;
  }
});

export const notificationsRouter = router;
