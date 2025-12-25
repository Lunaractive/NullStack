import express, { Response } from 'express';
import crypto from 'crypto';
import { AuthRequest, authenticateToken, requireDeveloperRole } from '../middleware/auth';
import {
  validateRequest,
  createWebhookSchema,
  updateWebhookSchema,
} from '../middleware/validation';
import database from '../database';
import webhookDispatcher from '../webhook-dispatcher';
import logger from '../utils/logger';

const router = express.Router();

/**
 * POST /api/v1/webhooks - Create a new webhook (developer only)
 */
router.post(
  '/',
  authenticateToken,
  requireDeveloperRole,
  validateRequest(createWebhookSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, url, events, headers, retryCount, timeout } = req.body;
      const { userId, projectId } = req.user!;

      // Generate a secret for HMAC signatures
      const secret = crypto.randomBytes(32).toString('hex');

      const result = await database.query(
        `INSERT INTO webhooks (project_id, user_id, name, url, events, secret, headers, retry_count, timeout)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          projectId,
          userId,
          name,
          url,
          events,
          secret,
          headers || {},
          retryCount || 3,
          timeout || 30000,
        ]
      );

      const webhook = result.rows[0];

      logger.info('Webhook created', {
        webhookId: webhook.id,
        projectId,
        userId,
        events,
      });

      res.status(201).json({
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,
        headers: webhook.headers,
        retryCount: webhook.retry_count,
        timeout: webhook.timeout,
        isActive: webhook.is_active,
        createdAt: webhook.created_at,
        updatedAt: webhook.updated_at,
      });
    } catch (error: any) {
      logger.error('Failed to create webhook', { error: error.message });
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  }
);

/**
 * GET /api/v1/webhooks - List all webhooks for the project
 */
router.get(
  '/',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.user!;
      const { page = 1, limit = 20 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const result = await database.query(
        `SELECT id, name, url, events, headers, retry_count, timeout, is_active,
                created_at, updated_at
         FROM webhooks
         WHERE project_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [projectId, limit, offset]
      );

      const countResult = await database.query(
        'SELECT COUNT(*) FROM webhooks WHERE project_id = $1',
        [projectId]
      );

      res.json({
        webhooks: result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          url: row.url,
          events: row.events,
          headers: row.headers,
          retryCount: row.retry_count,
          timeout: row.timeout,
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
        },
      });
    } catch (error: any) {
      logger.error('Failed to list webhooks', { error: error.message });
      res.status(500).json({ error: 'Failed to list webhooks' });
    }
  }
);

/**
 * GET /api/v1/webhooks/:id - Get webhook details
 */
router.get(
  '/:id',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { projectId } = req.user!;

      const result = await database.query(
        `SELECT id, name, url, events, secret, headers, retry_count, timeout,
                is_active, created_at, updated_at
         FROM webhooks
         WHERE id = $1 AND project_id = $2`,
        [id, projectId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      const webhook = result.rows[0];

      res.json({
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,
        headers: webhook.headers,
        retryCount: webhook.retry_count,
        timeout: webhook.timeout,
        isActive: webhook.is_active,
        createdAt: webhook.created_at,
        updatedAt: webhook.updated_at,
      });
    } catch (error: any) {
      logger.error('Failed to get webhook', { error: error.message });
      res.status(500).json({ error: 'Failed to get webhook' });
    }
  }
);

/**
 * PUT /api/v1/webhooks/:id - Update a webhook
 */
router.put(
  '/:id',
  authenticateToken,
  requireDeveloperRole,
  validateRequest(updateWebhookSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { projectId } = req.user!;
      const updates = req.body;

      // Check if webhook exists
      const checkResult = await database.query(
        'SELECT id FROM webhooks WHERE id = $1 AND project_id = $2',
        [id, projectId]
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      if (updates.url !== undefined) {
        updateFields.push(`url = $${paramCount++}`);
        values.push(updates.url);
      }
      if (updates.events !== undefined) {
        updateFields.push(`events = $${paramCount++}`);
        values.push(updates.events);
      }
      if (updates.headers !== undefined) {
        updateFields.push(`headers = $${paramCount++}`);
        values.push(updates.headers);
      }
      if (updates.retryCount !== undefined) {
        updateFields.push(`retry_count = $${paramCount++}`);
        values.push(updates.retryCount);
      }
      if (updates.timeout !== undefined) {
        updateFields.push(`timeout = $${paramCount++}`);
        values.push(updates.timeout);
      }
      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(updates.isActive);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(id, projectId);

      const result = await database.query(
        `UPDATE webhooks
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount++} AND project_id = $${paramCount++}
         RETURNING *`,
        values
      );

      const webhook = result.rows[0];

      logger.info('Webhook updated', {
        webhookId: id,
        projectId,
        updates: Object.keys(updates),
      });

      res.json({
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        headers: webhook.headers,
        retryCount: webhook.retry_count,
        timeout: webhook.timeout,
        isActive: webhook.is_active,
        createdAt: webhook.created_at,
        updatedAt: webhook.updated_at,
      });
    } catch (error: any) {
      logger.error('Failed to update webhook', { error: error.message });
      res.status(500).json({ error: 'Failed to update webhook' });
    }
  }
);

/**
 * DELETE /api/v1/webhooks/:id - Delete a webhook
 */
router.delete(
  '/:id',
  authenticateToken,
  requireDeveloperRole,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { projectId } = req.user!;

      const result = await database.query(
        'DELETE FROM webhooks WHERE id = $1 AND project_id = $2 RETURNING id',
        [id, projectId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      logger.info('Webhook deleted', { webhookId: id, projectId });

      res.json({ message: 'Webhook deleted successfully' });
    } catch (error: any) {
      logger.error('Failed to delete webhook', { error: error.message });
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  }
);

/**
 * POST /api/v1/webhooks/:id/test - Test a webhook
 */
router.post(
  '/:id/test',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { projectId } = req.user!;

      // Verify webhook belongs to project
      const checkResult = await database.query(
        'SELECT id FROM webhooks WHERE id = $1 AND project_id = $2',
        [id, projectId]
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      const result = await webhookDispatcher.testWebhook(id);

      logger.info('Webhook tested', {
        webhookId: id,
        projectId,
        success: result.success,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to test webhook', { error: error.message });
      res.status(500).json({ error: 'Failed to test webhook' });
    }
  }
);

/**
 * GET /api/v1/webhooks/:id/deliveries - Get webhook delivery history
 */
router.get(
  '/:id/deliveries',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { projectId } = req.user!;
      const { page = 1, limit = 50 } = req.query;

      // Verify webhook belongs to project
      const checkResult = await database.query(
        'SELECT id FROM webhooks WHERE id = $1 AND project_id = $2',
        [id, projectId]
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      const offset = (Number(page) - 1) * Number(limit);

      const result = await database.query(
        `SELECT id, event_type, status, status_code, error_message,
                attempt_count, delivered_at, created_at
         FROM webhook_deliveries
         WHERE webhook_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      );

      const countResult = await database.query(
        'SELECT COUNT(*) FROM webhook_deliveries WHERE webhook_id = $1',
        [id]
      );

      res.json({
        deliveries: result.rows.map((row: any) => ({
          id: row.id,
          eventType: row.event_type,
          status: row.status,
          statusCode: row.status_code,
          errorMessage: row.error_message,
          attemptCount: row.attempt_count,
          deliveredAt: row.delivered_at,
          createdAt: row.created_at,
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
        },
      });
    } catch (error: any) {
      logger.error('Failed to get webhook deliveries', { error: error.message });
      res.status(500).json({ error: 'Failed to get webhook deliveries' });
    }
  }
);

export default router;
