import cron from 'node-cron';
import axios from 'axios';
import logger from './utils/logger';
import database from './database';

interface ScheduledTask {
  id: string;
  project_id: string;
  name: string;
  cron_expression: string;
  function_name: string;
  parameters: any;
  timezone: string;
}

export class TaskScheduler {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;

  /**
   * Initialize the task scheduler and load all active tasks
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Task scheduler already initialized');
      return;
    }

    try {
      const result = await database.query(
        'SELECT * FROM scheduled_tasks WHERE is_active = true'
      );

      for (const task of result.rows) {
        await this.scheduleTask(task);
      }

      this.isInitialized = true;
      logger.info('Task scheduler initialized', {
        taskCount: result.rows.length,
      });
    } catch (error: any) {
      logger.error('Failed to initialize task scheduler', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Schedule a task with cron
   */
  async scheduleTask(task: ScheduledTask): Promise<void> {
    // Unschedule existing task if it exists
    if (this.scheduledJobs.has(task.id)) {
      this.unscheduleTask(task.id);
    }

    try {
      // Validate cron expression
      if (!cron.validate(task.cron_expression)) {
        throw new Error(`Invalid cron expression: ${task.cron_expression}`);
      }

      const job = cron.schedule(
        task.cron_expression,
        async () => {
          await this.executeTask(task);
        },
        {
          scheduled: true,
          timezone: task.timezone || 'UTC',
        }
      );

      this.scheduledJobs.set(task.id, job);

      // Calculate next run time
      await this.updateNextRunTime(task.id);

      logger.info('Task scheduled', {
        taskId: task.id,
        taskName: task.name,
        cronExpression: task.cron_expression,
        timezone: task.timezone,
      });
    } catch (error: any) {
      logger.error('Failed to schedule task', {
        taskId: task.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Unschedule a task
   */
  unscheduleTask(taskId: string): void {
    const job = this.scheduledJobs.get(taskId);
    if (job) {
      job.stop();
      this.scheduledJobs.delete(taskId);
      logger.info('Task unscheduled', { taskId });
    }
  }

  /**
   * Execute a scheduled task
   */
  async executeTask(task: ScheduledTask): Promise<void> {
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    logger.info('Executing scheduled task', {
      taskId: task.id,
      executionId,
      functionName: task.function_name,
    });

    // Create execution record
    await database.query(
      `INSERT INTO task_executions (id, task_id, status, started_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [executionId, task.id, 'running']
    );

    try {
      // Call the CloudScript function via the runtime service
      const response = await axios.post(
        `http://runtime-service:3002/api/v1/execute`,
        {
          projectId: task.project_id,
          functionName: task.function_name,
          parameters: task.parameters,
          context: {
            source: 'scheduled_task',
            taskId: task.id,
            executionId,
          },
        },
        {
          timeout: 300000, // 5 minutes
        }
      );

      const duration = Date.now() - startTime;

      // Update execution record with success
      await database.query(
        `UPDATE task_executions
         SET status = $1, output = $2, duration_ms = $3, completed_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        ['completed', response.data, duration, executionId]
      );

      // Update task last run time
      await database.query(
        `UPDATE scheduled_tasks
         SET last_run_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [task.id]
      );

      // Update next run time
      await this.updateNextRunTime(task.id);

      logger.info('Task executed successfully', {
        taskId: task.id,
        executionId,
        duration,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Update execution record with failure
      await database.query(
        `UPDATE task_executions
         SET status = $1, error_message = $2, duration_ms = $3, completed_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        ['failed', error.message, duration, executionId]
      );

      logger.error('Task execution failed', {
        taskId: task.id,
        executionId,
        error: error.message,
      });
    }
  }

  /**
   * Manually trigger a task execution
   */
  async triggerTask(taskId: string): Promise<string> {
    const result = await database.query(
      'SELECT * FROM scheduled_tasks WHERE id = $1',
      [taskId]
    );

    if (result.rows.length === 0) {
      throw new Error('Task not found');
    }

    const task = result.rows[0];

    // Execute the task immediately
    this.executeTask(task).catch((error) => {
      logger.error('Manual task execution failed', {
        taskId,
        error: error.message,
      });
    });

    return 'Task execution triggered';
  }

  /**
   * Update next run time for a task
   */
  private async updateNextRunTime(taskId: string): Promise<void> {
    // This is a simplified implementation
    // In production, you would calculate the actual next run time based on cron expression
    const result = await database.query(
      'SELECT cron_expression FROM scheduled_tasks WHERE id = $1',
      [taskId]
    );

    if (result.rows.length > 0) {
      // For now, just set it to null - a proper implementation would parse the cron
      // expression and calculate the next execution time
      await database.query(
        `UPDATE scheduled_tasks
         SET next_run_at = NULL
         WHERE id = $1`,
        [taskId]
      );
    }
  }

  /**
   * Reload all tasks (used when tasks are updated)
   */
  async reloadTasks(): Promise<void> {
    // Stop all existing jobs
    for (const [taskId, job] of this.scheduledJobs.entries()) {
      job.stop();
      this.scheduledJobs.delete(taskId);
    }

    // Reload from database
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Reload a specific task
   */
  async reloadTask(taskId: string): Promise<void> {
    const result = await database.query(
      'SELECT * FROM scheduled_tasks WHERE id = $1 AND is_active = true',
      [taskId]
    );

    if (result.rows.length > 0) {
      await this.scheduleTask(result.rows[0]);
    } else {
      // Task is no longer active or doesn't exist, unschedule it
      this.unscheduleTask(taskId);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { initialized: boolean; taskCount: number } {
    return {
      initialized: this.isInitialized,
      taskCount: this.scheduledJobs.size,
    };
  }

  /**
   * Shutdown the scheduler
   */
  shutdown(): void {
    for (const [taskId, job] of this.scheduledJobs.entries()) {
      job.stop();
      this.scheduledJobs.delete(taskId);
    }
    this.isInitialized = false;
    logger.info('Task scheduler shutdown');
  }
}

export const taskScheduler = new TaskScheduler();
export default taskScheduler;
