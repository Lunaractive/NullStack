import { Router } from 'express';
import { z } from 'zod';
import { redis } from '@nullstack/database';
import { postgres } from '@nullstack/database';
import { ERROR_CODES } from '@nullstack/shared';
import { validateRequest } from '../middleware/validate-request';
import { verifyDeveloperToken, verifyTitleKey, AuthRequest } from '../middleware/auth';

const router = Router();

const createQueueSchema = z.object({
  queueName: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-_]+$/),
  displayName: z.string().min(1).max(100),
  minPlayers: z.number().int().min(2).max(100),
  maxPlayers: z.number().int().min(2).max(100),
  teamConfiguration: z.object({
    teams: z.array(
      z.object({
        teamId: z.string(),
        minPlayers: z.number().int().min(1),
        maxPlayers: z.number().int().min(1),
      })
    ).optional(),
  }).optional(),
  matchingRules: z.object({
    skillMatchingEnabled: z.boolean().optional(),
    skillRange: z.number().min(0).optional(),
    latencyMatchingEnabled: z.boolean().optional(),
    maxLatencyMs: z.number().int().min(0).optional(),
    customAttributeMatching: z.array(
      z.object({
        attributeName: z.string(),
        matchType: z.enum(['exact', 'range', 'difference']),
        maxDifference: z.number().optional(),
      })
    ).optional(),
  }).optional(),
  serverAllocationStrategy: z.enum(['closest', 'balanced', 'custom']).optional(),
  timeoutSeconds: z.number().int().min(10).max(600).optional(),
});

const updateQueueSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  minPlayers: z.number().int().min(2).max(100).optional(),
  maxPlayers: z.number().int().min(2).max(100).optional(),
  teamConfiguration: z.object({
    teams: z.array(
      z.object({
        teamId: z.string(),
        minPlayers: z.number().int().min(1),
        maxPlayers: z.number().int().min(1),
      })
    ).optional(),
  }).optional(),
  matchingRules: z.object({
    skillMatchingEnabled: z.boolean().optional(),
    skillRange: z.number().min(0).optional(),
    latencyMatchingEnabled: z.boolean().optional(),
    maxLatencyMs: z.number().int().min(0).optional(),
    customAttributeMatching: z.array(
      z.object({
        attributeName: z.string(),
        matchType: z.enum(['exact', 'range', 'difference']),
        maxDifference: z.number().optional(),
      })
    ).optional(),
  }).optional(),
  serverAllocationStrategy: z.enum(['closest', 'balanced', 'custom']).optional(),
  timeoutSeconds: z.number().int().min(10).max(600).optional(),
  enabled: z.boolean().optional(),
});

// POST /api/v1/matchmaking/queues - Create queue (developer)
router.post(
  '/queues',
  verifyDeveloperToken,
  validateRequest(createQueueSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { titleId } = req;
      const {
        queueName,
        displayName,
        minPlayers,
        maxPlayers,
        teamConfiguration,
        matchingRules,
        serverAllocationStrategy,
        timeoutSeconds,
      } = req.body;

      if (!titleId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      // Validate min/max players
      if (minPlayers > maxPlayers) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'minPlayers cannot be greater than maxPlayers',
          },
        });
      }

      // Validate team configuration if provided
      if (teamConfiguration?.teams) {
        const totalMinPlayers = teamConfiguration.teams.reduce(
          (sum, team) => sum + team.minPlayers,
          0
        );
        const totalMaxPlayers = teamConfiguration.teams.reduce(
          (sum, team) => sum + team.maxPlayers,
          0
        );

        if (totalMinPlayers > maxPlayers || totalMaxPlayers < minPlayers) {
          return res.status(400).json({
            success: false,
            error: {
              code: ERROR_CODES.VALIDATION_ERROR,
              message: 'Team configuration does not match min/max players',
            },
          });
        }
      }

      // Check if queue already exists
      const existingQueue = await redis.get(`queue:${titleId}:${queueName}`);
      if (existingQueue) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.CONFLICT,
            message: 'Queue already exists',
          },
        });
      }

      const queueConfig = {
        queueName,
        displayName,
        minPlayers,
        maxPlayers,
        teamConfiguration: teamConfiguration || null,
        matchingRules: matchingRules || {
          skillMatchingEnabled: false,
          latencyMatchingEnabled: false,
        },
        serverAllocationStrategy: serverAllocationStrategy || 'closest',
        timeoutSeconds: timeoutSeconds || 300,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store queue configuration in Redis
      await redis.set(`queue:${titleId}:${queueName}`, queueConfig);

      // Also store in PostgreSQL for persistence
      await postgres.query(
        `INSERT INTO matchmaking_queues
         (title_id, queue_name, config)
         VALUES ($1, $2, $3)
         ON CONFLICT (title_id, queue_name)
         DO UPDATE SET config = $3, updated_at = CURRENT_TIMESTAMP`,
        [titleId, queueName, JSON.stringify(queueConfig)]
      );

      res.status(201).json({
        success: true,
        data: queueConfig,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/matchmaking/queues - List queues
router.get(
  '/queues',
  verifyTitleKey,
  async (req: AuthRequest, res, next) => {
    try {
      const { titleId } = req;

      if (!titleId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      // Get all queues for the title from PostgreSQL
      const result = await postgres.query(
        'SELECT queue_name, config FROM matchmaking_queues WHERE title_id = $1 ORDER BY created_at DESC',
        [titleId]
      );

      const queues = result.rows.map(row => ({
        queueName: row.queue_name,
        ...JSON.parse(row.config),
      }));

      // Filter to only return enabled queues unless developer is requesting
      const enabledQueues = req.authType === 'developer'
        ? queues
        : queues.filter(q => q.enabled);

      res.json({
        success: true,
        data: {
          queues: enabledQueues,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/matchmaking/queues/:queueName - Update queue config
router.put(
  '/queues/:queueName',
  verifyDeveloperToken,
  validateRequest(updateQueueSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { queueName } = req.params;
      const { titleId } = req;

      if (!titleId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      // Get existing queue
      const existingQueue = await redis.get(`queue:${titleId}:${queueName}`);
      if (!existingQueue) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Queue not found',
          },
        });
      }

      // Merge updates with existing config
      const updatedConfig = {
        ...existingQueue,
        ...req.body,
        queueName,
        updatedAt: new Date().toISOString(),
      };

      // Validate min/max players if updated
      const minPlayers = updatedConfig.minPlayers;
      const maxPlayers = updatedConfig.maxPlayers;

      if (minPlayers > maxPlayers) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'minPlayers cannot be greater than maxPlayers',
          },
        });
      }

      // Update in Redis
      await redis.set(`queue:${titleId}:${queueName}`, updatedConfig);

      // Update in PostgreSQL
      await postgres.query(
        `UPDATE matchmaking_queues
         SET config = $1, updated_at = CURRENT_TIMESTAMP
         WHERE title_id = $2 AND queue_name = $3`,
        [JSON.stringify(updatedConfig), titleId, queueName]
      );

      res.json({
        success: true,
        data: updatedConfig,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/matchmaking/queues/:queueName - Delete queue
router.delete(
  '/queues/:queueName',
  verifyDeveloperToken,
  async (req: AuthRequest, res, next) => {
    try {
      const { queueName } = req.params;
      const { titleId } = req;

      if (!titleId) {
        return res.status(401).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Unauthorized',
          },
        });
      }

      // Check if queue exists
      const existingQueue = await redis.get(`queue:${titleId}:${queueName}`);
      if (!existingQueue) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Queue not found',
          },
        });
      }

      // Delete from Redis
      await redis.delete(`queue:${titleId}:${queueName}`);

      // Clear waiting tickets for this queue
      await redis.delete(`waiting:${titleId}:${queueName}`);

      // Delete from PostgreSQL
      await postgres.query(
        'DELETE FROM matchmaking_queues WHERE title_id = $1 AND queue_name = $2',
        [titleId, queueName]
      );

      res.json({
        success: true,
        data: {
          message: 'Queue deleted successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const queuesRouter = router;
