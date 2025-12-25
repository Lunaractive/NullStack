import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { mongoService } from './services/mongodb';
import { redisService } from './services/redis';
import { rabbitMQService } from './services/rabbitmq';
import { logger } from './services/logger';
import eventsRouter from './routes/events';
import reportsRouter from './routes/reports';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3005;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/analytics/events', rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Higher limit for event submission
}));

app.use('/api/v1/analytics/reports', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'analytics-service',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      dependencies: {
        mongodb: 'unknown',
        redis: 'unknown',
        rabbitmq: 'unknown',
      },
    };

    // Check MongoDB
    try {
      const mongoConnection = mongoService.getConnection();
      health.dependencies.mongodb = mongoConnection.readyState === 1 ? 'ok' : 'disconnected';
    } catch (error) {
      health.dependencies.mongodb = 'error';
    }

    // Check Redis
    try {
      const redisClient = redisService.getClient();
      health.dependencies.redis = redisClient.isOpen ? 'ok' : 'disconnected';
    } catch (error) {
      health.dependencies.redis = 'error';
    }

    // Check RabbitMQ
    try {
      const rabbitChannel = rabbitMQService.getChannel();
      health.dependencies.rabbitmq = rabbitChannel ? 'ok' : 'disconnected';
    } catch (error) {
      health.dependencies.rabbitmq = 'error';
    }

    const allHealthy = Object.values(health.dependencies).every(status => status === 'ok');
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// API routes
app.use('/api/v1/analytics', eventsRouter);
app.use('/api/v1/analytics', reportsRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path,
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

/**
 * Initialize all services and start the server
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting Analytics Service...');

    // Connect to databases and message queue
    await Promise.all([
      mongoService.connect(),
      redisService.connect(),
      rabbitMQService.connect(),
    ]);

    logger.info('All services connected successfully');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Analytics Service listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');

  try {
    await Promise.all([
      mongoService.disconnect(),
      redisService.disconnect(),
      rabbitMQService.disconnect(),
    ]);

    logger.info('All connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection:', reason);
  shutdown();
});

// Start the server
startServer();

export default app;
