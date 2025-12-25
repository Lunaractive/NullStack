import express, { Response } from 'express';
import { AuthRequest, authenticateToken, requireDeveloperRole } from '../middleware/auth';
import {
  validateRequest,
  createTaskSchema,
  updateTaskSchema,
} from '../middleware/validation';
import database from '../database';
import taskScheduler from '../task-scheduler';
import logger from '../utils/logger';

const router = express.Router();

/**
 * POST /api/v1/tasks - Create a new scheduled task (developer only)
 */
router.post(
  '/',
  authenticateToken,
  requireDeveloperRole,
  validateRequest(createTaskSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        name,
        description,
        cronExpression,
        functionName,
        parameters,
        timezone,
      } = req.body;
      const { userId, projectId } = req.user!;

      const result = await database.query(
        `INSERT INTO scheduled_tasks
         (project_id, user_id, name, description, cron_expression, function_name, parameters, timezone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          projectId,
          userId,
          name,
          description || null,
          cronExpression,
          functionName,
          parameters || {},
          timezone || 'UTC',
        ]
      );

      const task = result.rows[0];

      // Schedule the task
      await taskScheduler.scheduleTask({
        id: task.id,
        project_id: task.project_id,
        name: task.name,
        cron_expression: task.cron_expression,
        function_name: task.function_name,
        parameters: task.parameters,
        timezone: task.timezone,
      });

      logger.info('Scheduled task created', {
        taskId: task.id,
        projectId,
        userId,
        functionName,
      });

      res.status(201).json({
        id: task.id,
        name: task.name,
        description: task.description,
        cronExpression: task.cron_expression,
        functionName: task.function_name,
        parameters: task.parameters,
        timezone: task.timezone,
        isActive: task.is_active,
        lastRunAt: task.last_run_at,
        nextRunAt: task.next_run_at,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      });
    } catch (error: any) {
      logger.error('Failed to create scheduled task', { error: error.message });
      res.status(500).json({ error: 'Failed to create scheduled task' });
    }
  }
);

/**
 * GET /api/v1/tasks - List all scheduled tasks for the project
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
        `SELECT id, name, description, cron_expression, function_name, parameters,
                timezone, is_active, last_run_at, next_run_at, created_at, updated_at
         FROM scheduled_tasks
         WHERE project_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [projectId, limit, offset]
      );

      const countResult = await database.query(
        'SELECT COUNT(*) FROM scheduled_tasks WHERE project_id = $1',
        [projectId]
      );

      res.json({
        tasks: result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          cronExpression: row.cron_expression,
          functionName: row.function_name,
          parameters: row.parameters,
          timezone: row.timezone,
          isActive: row.is_active,
          lastRunAt: row.last_run_at,
          nextRunAt: row.next_run_at,
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
      logger.error('Failed to list scheduled tasks', { error: error.message });
      res.status(500).json({ error: 'Failed to list scheduled tasks' });
    }
  }
);

/**
 * GET /api/v1/tasks/:id - Get scheduled task details
 */
router.get(
  '/:id',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { projectId } = req.user!;

      const result = await database.query(
        `SELECT id, name, description, cron_expression, function_name, parameters,
                timezone, is_active, last_run_at, next_run_at, created_at, updated_at
         FROM scheduled_tasks
         WHERE id = $1 AND project_id = $2`,
        [id, projectId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Scheduled task not found' });
        return;
      }

      const task = result.rows[0];

      res.json({
        id: task.id,
        name: task.name,
        description: task.description,
        cronExpression: task.cron_expression,
        functionName: task.function_name,
        parameters: task.parameters,
        timezone: task.timezone,
        isActive: task.is_active,
        lastRunAt: task.last_run_at,
        nextRunAt: task.next_run_at,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      });
    } catch (error: any) {
      logger.error('Failed to get scheduled task', { error: error.message });
      res.status(500).json({ error: 'Failed to get scheduled task' });
    }
  }
);

/**
 * PUT /api/v1/tasks/:id - Update a scheduled task
 */
router.put(
  '/:id',
  authenticateToken,
  requireDeveloperRole,
  validateRequest(updateTaskSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { projectId } = req.user!;
      const updates = req.body;

      // Check if task exists
      const checkResult = await database.query(
        'SELECT id FROM scheduled_tasks WHERE id = $1 AND project_id = $2',
        [id, projectId]
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Scheduled task not found' });
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
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.cronExpression !== undefined) {
        updateFields.push(`cron_expression = $${paramCount++}`);
        values.push(updates.cronExpression);
      }
      if (updates.functionName !== undefined) {
        updateFields.push(`function_name = $${paramCount++}`);
        values.push(updates.functionName);
      }
      if (updates.parameters !== undefined) {
        updateFields.push(`parameters = $${paramCount++}`);
        values.push(updates.parameters);
      }
      if (updates.timezone !== undefined) {
        updateFields.push(`timezone = $${paramCount++}`);
        values.push(updates.timezone);
      }
      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(updates.isActive);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(id, projectId);

      const result = await database.query(
        `UPDATE scheduled_tasks
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount++} AND project_id = $${paramCount++}
         RETURNING *`,
        values
      );

      const task = result.rows[0];

      // Reload the task in the scheduler
      await taskScheduler.reloadTask(id);

      logger.info('Scheduled task updated', {
        taskId: id,
        projectId,
        updates: Object.keys(updates),
      });

      res.json({
        id: task.id,
        name: task.name,
        description: task.description,
        cronExpression: task.cron_expression,
        functionName: task.function_name,
        parameters: task.parameters,
        timezone: task.timezone,
        isActive: task.is_active,
        lastRunAt: task.last_run_at,
        nextRunAt: task.next_run_at,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      });
    } catch (error: any) {
      logger.error('Failed to update scheduled task', { error: error.message });
      res.status(500).json({ error: 'Failed to update scheduled task' });
    }
  }
);

/**
 * DELETE /api/v1/tasks/:id - Delete a scheduled task
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
        'DELETE FROM scheduled_tasks WHERE id = $1 AND project_id = $2 RETURNING id',
        [id, projectId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Scheduled task not found' });
        return;
      }

      // Unschedule the task
      taskScheduler.unscheduleTask(id);

      logger.info('Scheduled task deleted', { taskId: id, projectId });

      res.json({ message: 'Scheduled task deleted successfully' });
    } catch (error: any) {
      logger.error('Failed to delete scheduled task', { error: error.message });
      res.status(500).json({ error: 'Failed to delete scheduled task' });
    }
  }
);

/**
 * POST /api/v1/tasks/:id/run - Manually trigger a task execution
 */
router.post(
  '/:id/run',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { projectId } = req.user!;

      // Verify task belongs to project
      const checkResult = await database.query(
        'SELECT id FROM scheduled_tasks WHERE id = $1 AND project_id = $2',
        [id, projectId]
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Scheduled task not found' });
        return;
      }

      const message = await taskScheduler.triggerTask(id);

      logger.info('Scheduled task manually triggered', { taskId: id, projectId });

      res.json({ message });
    } catch (error: any) {
      logger.error('Failed to trigger scheduled task', { error: error.message });
      res.status(500).json({ error: 'Failed to trigger scheduled task' });
    }
  }
);

/**
 * GET /api/v1/tasks/:id/executions - Get task execution history
 */
router.get(
  '/:id/executions',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { projectId } = req.user!;
      const { page = 1, limit = 50 } = req.query;

      // Verify task belongs to project
      const checkResult = await database.query(
        'SELECT id FROM scheduled_tasks WHERE id = $1 AND project_id = $2',
        [id, projectId]
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Scheduled task not found' });
        return;
      }

      const offset = (Number(page) - 1) * Number(limit);

      const result = await database.query(
        `SELECT id, status, output, error_message, duration_ms,
                started_at, completed_at
         FROM task_executions
         WHERE task_id = $1
         ORDER BY started_at DESC
         LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      );

      const countResult = await database.query(
        'SELECT COUNT(*) FROM task_executions WHERE task_id = $1',
        [id]
      );

      res.json({
        executions: result.rows.map((row: any) => ({
          id: row.id,
          status: row.status,
          output: row.output,
          errorMessage: row.error_message,
          durationMs: row.duration_ms,
          startedAt: row.started_at,
          completedAt: row.completed_at,
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
        },
      });
    } catch (error: any) {
      logger.error('Failed to get task executions', { error: error.message });
      res.status(500).json({ error: 'Failed to get task executions' });
    }
  }
);

export default router;
