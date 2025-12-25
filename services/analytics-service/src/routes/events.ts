import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Event } from '../models/Event';
import { rabbitMQService } from '../services/rabbitmq';
import { logger } from '../services/logger';
import { AnalyticsEvent, BatchEventRequest, EventQueryParams } from '../types';

const router = Router();

// Validation schemas
const eventSchema = z.object({
  titleId: z.string().min(1),
  playerId: z.string().optional(),
  sessionId: z.string().optional(),
  eventName: z.string().min(1),
  eventData: z.record(z.any()).default({}),
  timestamp: z.string().datetime().optional(),
  platform: z.string().optional(),
  version: z.string().optional(),
  country: z.string().optional(),
  deviceType: z.string().optional(),
});

const batchEventSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
});

const queryParamsSchema = z.object({
  titleId: z.string().min(1),
  eventName: z.string().optional(),
  playerId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().transform(Number).default('100'),
  offset: z.string().transform(Number).default('0'),
});

/**
 * POST /api/v1/analytics/events
 * Submit a single analytics event from game client
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    const validatedData = eventSchema.parse(req.body);

    const event: AnalyticsEvent = {
      eventId: uuidv4(),
      ...validatedData,
      timestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
    };

    // Publish to RabbitMQ for async processing
    await rabbitMQService.publishEvent(event);

    logger.info('Event submitted', {
      eventId: event.eventId,
      titleId: event.titleId,
      eventName: event.eventName,
    });

    res.status(202).json({
      success: true,
      message: 'Event accepted for processing',
      eventId: event.eventId,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Error submitting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit event',
    });
  }
});

/**
 * POST /api/v1/analytics/events/batch
 * Submit multiple events in a single request
 */
router.post('/events/batch', async (req: Request, res: Response) => {
  try {
    const validatedData = batchEventSchema.parse(req.body);

    const events: AnalyticsEvent[] = validatedData.events.map(event => ({
      eventId: uuidv4(),
      ...event,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    }));

    // Publish batch to RabbitMQ
    await rabbitMQService.publishBatch(events);

    logger.info('Batch events submitted', {
      count: events.length,
      titleId: events[0]?.titleId,
    });

    res.status(202).json({
      success: true,
      message: 'Events accepted for processing',
      count: events.length,
      eventIds: events.map(e => e.eventId),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Error submitting batch events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit batch events',
    });
  }
});

/**
 * GET /api/v1/analytics/events
 * Query events (for developers)
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const params = queryParamsSchema.parse(req.query);

    // Build query
    const query: any = { titleId: params.titleId };

    if (params.eventName) {
      query.eventName = params.eventName;
    }

    if (params.playerId) {
      query.playerId = params.playerId;
    }

    if (params.startDate || params.endDate) {
      query.timestamp = {};
      if (params.startDate) {
        query.timestamp.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        query.timestamp.$lte = new Date(params.endDate);
      }
    }

    // Execute query with pagination
    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ timestamp: -1 })
        .limit(params.limit)
        .skip(params.offset)
        .lean(),
      Event.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          total,
          limit: params.limit,
          offset: params.offset,
          hasMore: total > params.offset + params.limit,
        },
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Error querying events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query events',
    });
  }
});

export default router;
