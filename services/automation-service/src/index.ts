import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './utils/logger';
import database from './database';
import rabbitmq from './messaging/rabbitmq';
import taskScheduler from './task-scheduler';
import eventHandler from './event-handler';

// Import routes
import webhooksRouter from './routes/webhooks';
import scheduledTasksRouter from './routes/scheduled-tasks';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  const schedulerStatus = taskScheduler.getStatus();
  const rabbitmqStatus = rabbitmq.getConnectionStatus();

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'connected',
      rabbitmq: rabbitmqStatus ? 'connected' : 'disconnected',
      taskScheduler: schedulerStatus.initialized ? 'running' : 'stopped',
    },
    tasks: {
      scheduled: schedulerStatus.taskCount,
    },
  };

  const statusCode = health.services.rabbitmq === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes
app.use('/api/v1/webhooks', webhooksRouter);
app.use('/api/v1/tasks', scheduledTasksRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(err.status || 500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await database.initialize();

    // Connect to RabbitMQ
    logger.info('Connecting to RabbitMQ...');
    await rabbitmq.connect();

    // Bind to event routing keys
    const eventRoutingKeys = [
      'project.*',
      'deployment.*',
      'function.*',
      'database.*',
      'storage.*',
      'user.*',
      'api.*',
    ];

    await rabbitmq.bindQueue(eventRoutingKeys);

    // Subscribe to events
    await rabbitmq.subscribe(async (event) => {
      await eventHandler.handleEvent(event);
    });

    // Initialize task scheduler
    logger.info('Initializing task scheduler...');
    await taskScheduler.initialize();

    logger.info('All services initialized successfully');
  } catch (error: any) {
    logger.error('Failed to initialize services', { error: error.message });
    throw error;
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');

  // Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Shutdown services
  try {
    taskScheduler.shutdown();
    await rabbitmq.close();
    await database.close();
    logger.info('All services shut down successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

// Start server
const server = app.listen(config.port, async () => {
  logger.info(`Automation service started`, {
    port: config.port,
    env: config.nodeEnv,
  });

  try {
    await initializeServices();
  } catch (error: any) {
    logger.error('Failed to start services', { error: error.message });
    process.exit(1);
  }
});

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled promise rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  shutdown();
});

export default app;
