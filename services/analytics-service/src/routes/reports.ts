import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { Event } from '../models/Event';
import { redisService } from '../services/redis';
import { logger } from '../services/logger';
import { DAUReport, RetentionReport, EventAnalytics, FunnelAnalysis, FunnelStep } from '../types';

const router = Router();

// Validation schemas
const reportQuerySchema = z.object({
  titleId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const eventReportSchema = z.object({
  titleId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['day', 'hour']).default('day'),
});

const funnelQuerySchema = z.object({
  titleId: z.string().min(1),
  steps: z.array(z.object({
    stepName: z.string(),
    eventName: z.string(),
    requiredProperties: z.record(z.any()).optional(),
  })).min(2),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /api/v1/analytics/reports/dau
 * Get Daily Active Users report
 */
router.get('/reports/dau', async (req: Request, res: Response) => {
  try {
    const params = reportQuerySchema.parse(req.query);

    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    const startDate = params.startDate ? new Date(params.startDate) : subDays(endDate, 30);

    const reports: DAUReport[] = [];

    // Check Redis cache first
    const cacheKey = `dau:${params.titleId}:${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}`;
    const cached = await redisService.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
    }

    // Generate report for each day
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Try to get from Redis aggregated data
      const redisKey = `analytics:dau:${params.titleId}:${dateStr}`;
      const aggregated = await redisService.get(redisKey);

      if (aggregated) {
        reports.push(JSON.parse(aggregated));
      } else {
        // Fallback to MongoDB query
        const [activeUsers, sessions] = await Promise.all([
          Event.distinct('playerId', {
            titleId: params.titleId,
            timestamp: { $gte: dayStart, $lte: dayEnd },
            playerId: { $exists: true },
          }),
          Event.distinct('sessionId', {
            titleId: params.titleId,
            timestamp: { $gte: dayStart, $lte: dayEnd },
            sessionId: { $exists: true },
          }),
        ]);

        reports.push({
          date: dateStr,
          activeUsers: activeUsers.length,
          newUsers: 0, // Would need user registration tracking
          returningUsers: activeUsers.length,
          sessions: sessions.length,
          avgSessionDuration: 0, // Would need session end events
        });
      }

      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    // Cache the result for 1 hour
    await redisService.set(cacheKey, JSON.stringify(reports), 3600);

    res.json({
      success: true,
      data: reports,
      cached: false,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Error generating DAU report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate DAU report',
    });
  }
});

/**
 * GET /api/v1/analytics/reports/retention
 * Get retention metrics
 */
router.get('/reports/retention', async (req: Request, res: Response) => {
  try {
    const params = reportQuerySchema.parse(req.query);

    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    const startDate = params.startDate ? new Date(params.startDate) : subDays(endDate, 30);

    // Check cache
    const cacheKey = `retention:${params.titleId}:${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}`;
    const cached = await redisService.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
    }

    const reports: RetentionReport[] = [];

    // For each day in the range, create a cohort
    let cohortDate = new Date(startDate);
    while (cohortDate <= endDate) {
      const cohortDayStart = startOfDay(cohortDate);
      const cohortDayEnd = endOfDay(cohortDate);
      const cohortDateStr = format(cohortDate, 'yyyy-MM-dd');

      // Get users who started on this day
      const cohortUsers = await Event.distinct('playerId', {
        titleId: params.titleId,
        eventName: 'session_start',
        timestamp: { $gte: cohortDayStart, $lte: cohortDayEnd },
        playerId: { $exists: true },
      });

      if (cohortUsers.length === 0) {
        cohortDate = new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000);
        continue;
      }

      // Calculate retention for different days
      const retention = {
        cohortDate: cohortDateStr,
        cohortSize: cohortUsers.length,
        day1: 0,
        day3: 0,
        day7: 0,
        day14: 0,
        day30: 0,
      };

      // Day 1 retention
      const day1Users = await Event.distinct('playerId', {
        titleId: params.titleId,
        playerId: { $in: cohortUsers },
        timestamp: {
          $gte: startOfDay(new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000)),
          $lte: endOfDay(new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000)),
        },
      });
      retention.day1 = (day1Users.length / cohortUsers.length) * 100;

      // Day 7 retention
      if (new Date(cohortDate.getTime() + 7 * 24 * 60 * 60 * 1000) <= new Date()) {
        const day7Users = await Event.distinct('playerId', {
          titleId: params.titleId,
          playerId: { $in: cohortUsers },
          timestamp: {
            $gte: startOfDay(new Date(cohortDate.getTime() + 7 * 24 * 60 * 60 * 1000)),
            $lte: endOfDay(new Date(cohortDate.getTime() + 7 * 24 * 60 * 60 * 1000)),
          },
        });
        retention.day7 = (day7Users.length / cohortUsers.length) * 100;
      }

      // Day 30 retention
      if (new Date(cohortDate.getTime() + 30 * 24 * 60 * 60 * 1000) <= new Date()) {
        const day30Users = await Event.distinct('playerId', {
          titleId: params.titleId,
          playerId: { $in: cohortUsers },
          timestamp: {
            $gte: startOfDay(new Date(cohortDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
            $lte: endOfDay(new Date(cohortDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
          },
        });
        retention.day30 = (day30Users.length / cohortUsers.length) * 100;
      }

      reports.push(retention);
      cohortDate = new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000);
    }

    // Cache for 6 hours
    await redisService.set(cacheKey, JSON.stringify(reports), 21600);

    res.json({
      success: true,
      data: reports,
      cached: false,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Error generating retention report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate retention report',
    });
  }
});

/**
 * GET /api/v1/analytics/reports/events/:eventName
 * Get analytics for a specific event
 */
router.get('/reports/events/:eventName', async (req: Request, res: Response) => {
  try {
    const { eventName } = req.params;
    const params = eventReportSchema.parse(req.query);

    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    const startDate = params.startDate ? new Date(params.startDate) : subDays(endDate, 7);

    // Check cache
    const cacheKey = `event:${params.titleId}:${eventName}:${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}`;
    const cached = await redisService.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
    }

    // Get event statistics
    const [totalCount, uniqueUsers, timeline] = await Promise.all([
      Event.countDocuments({
        titleId: params.titleId,
        eventName,
        timestamp: { $gte: startDate, $lte: endDate },
      }),
      Event.distinct('playerId', {
        titleId: params.titleId,
        eventName,
        timestamp: { $gte: startDate, $lte: endDate },
        playerId: { $exists: true },
      }),
      Event.aggregate([
        {
          $match: {
            titleId: params.titleId,
            eventName,
            timestamp: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: params.groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m-%d-%H',
                date: '$timestamp',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const report: EventAnalytics = {
      eventName,
      totalCount,
      uniqueUsers: uniqueUsers.length,
      avgPerUser: uniqueUsers.length > 0 ? totalCount / uniqueUsers.length : 0,
      topValues: [],
      timeline: timeline.map(t => ({
        date: t._id,
        count: t.count,
      })),
    };

    // Cache for 1 hour
    await redisService.set(cacheKey, JSON.stringify(report), 3600);

    res.json({
      success: true,
      data: report,
      cached: false,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Error generating event report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate event report',
    });
  }
});

/**
 * GET /api/v1/analytics/reports/funnel
 * Funnel analysis
 */
router.get('/reports/funnel', async (req: Request, res: Response) => {
  try {
    const params = funnelQuerySchema.parse(req.query);

    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    const startDate = params.startDate ? new Date(params.startDate) : subDays(endDate, 7);

    const steps = params.steps as FunnelStep[];

    // Get all users who completed the first step
    const firstStepUsers = await Event.distinct('playerId', {
      titleId: params.titleId,
      eventName: steps[0].eventName,
      timestamp: { $gte: startDate, $lte: endDate },
      playerId: { $exists: true },
    });

    const totalUsers = firstStepUsers.length;
    const funnelResults = [];

    let previousStepUsers = firstStepUsers;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (i === 0) {
        funnelResults.push({
          stepName: step.stepName,
          users: totalUsers,
          dropoff: 0,
          conversionRate: 100,
        });
        continue;
      }

      // Find users from previous step who completed this step
      const stepUsers = await Event.distinct('playerId', {
        titleId: params.titleId,
        eventName: step.eventName,
        playerId: { $in: previousStepUsers },
        timestamp: { $gte: startDate, $lte: endDate },
      });

      const stepUserCount = stepUsers.length;
      const dropoff = previousStepUsers.length - stepUserCount;
      const conversionRate = (stepUserCount / totalUsers) * 100;

      funnelResults.push({
        stepName: step.stepName,
        users: stepUserCount,
        dropoff,
        conversionRate,
      });

      previousStepUsers = stepUsers;
    }

    const analysis: FunnelAnalysis = {
      totalUsers,
      steps: funnelResults,
    };

    res.json({
      success: true,
      data: analysis,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Error generating funnel analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate funnel analysis',
    });
  }
});

export default router;
