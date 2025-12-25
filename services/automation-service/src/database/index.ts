import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import logger from '../utils/logger';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err.message });
    });
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error: any) {
      logger.error('Database query error', { text, error: error.message });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async initialize(): Promise<void> {
    try {
      await this.createTables();
      logger.info('Database initialized successfully');
    } catch (error: any) {
      logger.error('Database initialization failed', { error: error.message });
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');

      // Webhooks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS webhooks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL,
          user_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          events TEXT[] NOT NULL,
          secret VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          headers JSONB DEFAULT '{}',
          retry_count INTEGER DEFAULT 3,
          timeout INTEGER DEFAULT 30000,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create index on project_id and events
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_webhooks_project_id ON webhooks(project_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);
      `);

      // Webhook delivery logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS webhook_deliveries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
          event_type VARCHAR(255) NOT NULL,
          payload JSONB NOT NULL,
          status VARCHAR(50) NOT NULL,
          status_code INTEGER,
          response_body TEXT,
          error_message TEXT,
          attempt_count INTEGER DEFAULT 1,
          delivered_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
      `);

      // Scheduled tasks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS scheduled_tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL,
          user_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          cron_expression VARCHAR(255) NOT NULL,
          function_name VARCHAR(255) NOT NULL,
          parameters JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          timezone VARCHAR(100) DEFAULT 'UTC',
          last_run_at TIMESTAMP,
          next_run_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_project_id ON scheduled_tasks(project_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at) WHERE is_active = true;
      `);

      // Task execution logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS task_executions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
          status VARCHAR(50) NOT NULL,
          output JSONB,
          error_message TEXT,
          duration_ms INTEGER,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON task_executions(task_id);
      `);

      // Automation rules table
      await client.query(`
        CREATE TABLE IF NOT EXISTS automation_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL,
          user_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          trigger_type VARCHAR(100) NOT NULL,
          trigger_config JSONB NOT NULL,
          action_type VARCHAR(100) NOT NULL,
          action_config JSONB NOT NULL,
          conditions JSONB DEFAULT '[]',
          is_active BOOLEAN DEFAULT true,
          execution_count INTEGER DEFAULT 0,
          last_executed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_automation_rules_project_id ON automation_rules(project_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger_type ON automation_rules(trigger_type) WHERE is_active = true;
      `);

      await client.query('COMMIT');
      logger.info('Database tables created successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}

export const database = new Database();
export default database;
