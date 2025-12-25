/**
 * NullStack API Gateway
 * Main entry point that routes requests to microservices
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';

// Load environment variables
dotenv.config();

// Import utilities and middleware
import { logger } from './utils/logger';
import { corsMiddleware } from './middleware/cors';
import { globalRateLimiter } from './middleware/rate-limiter';
import {
  httpLogger,
  requestIdMiddleware,
  requestTimingMiddleware,
  errorLogger,
} from './middleware/logger';
import {
  addSecurityHeaders,
  blockSuspiciousUserAgents,
  sanitizeHeaders,
} from './middleware/security';
import { swaggerSpec } from './config/swagger';
import { metricsMiddleware, metricsHandler } from './utils/metrics';
import { circuitBreakerManager } from './utils/circuit-breaker';

// Import routes
import healthRoutes from './routes/health';
import proxyRoutes from './routes/proxy';

// Import WebSocket server
import NullStackWebSocketServer from './websocket/server';

// Initialize Express app
const app: Application = express();
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Apply middleware
 */

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API gateway
  crossOriginEmbedderPolicy: false,
}));

// Compression middleware
app.use(compression());

// CORS middleware
app.use(corsMiddleware);

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request tracking middleware
app.use(requestIdMiddleware);
app.use(requestTimingMiddleware);

// Security middleware
app.use(sanitizeHeaders);
app.use(blockSuspiciousUserAgents);
app.use(addSecurityHeaders);

// HTTP logging middleware
app.use(httpLogger);

// Metrics collection middleware
app.use(metricsMiddleware);

// Rate limiting middleware (global)
app.use(globalRateLimiter);

/**
 * API Documentation
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Gateway root
 *     description: Returns basic information about the API Gateway
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API Gateway information
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'NullStack API Gateway',
    version: '1.0.0',
    description: 'Main entry point for all NullStack microservices',
    endpoints: {
      health: '/health',
      healthDetailed: '/health/detailed',
      metrics: '/metrics',
      docs: '/api-docs',
      websocket: 'ws://localhost:8080/ws',
    },
    services: {
      auth: '/api/v1/auth',
      titles: '/api/v1/titles',
      player: '/api/v1/player',
      economy: '/api/v1/economy',
      cloudscript: '/api/v1/cloudscript',
      matchmaking: '/api/v1/matchmaking',
      analytics: '/api/v1/analytics',
    },
  });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'NullStack API Gateway Docs',
}));

// Serve Swagger spec as JSON
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * Register routes
 */

// Metrics endpoint
app.get('/metrics', metricsHandler);

// Circuit breaker status endpoint
app.get('/circuit-breakers', (req: Request, res: Response) => {
  const stats = circuitBreakerManager.getAllStats();
  res.json(stats);
});

// Health check routes
app.use(healthRoutes);

// Proxy routes to microservices
app.use(proxyRoutes);

/**
 * Error handling middleware
 */

// 404 handler (this should be after all routes)
app.use((req: Request, res: Response) => {
  logger.warn(`404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl,
  });
});

// Error logger
app.use(errorLogger);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = (err as any).statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Don't expose internal errors in production
  const errorResponse = {
    error: statusCode >= 500 ? 'Internal Server Error' : message,
    message: process.env.NODE_ENV === 'production' && statusCode >= 500
      ? 'An unexpected error occurred'
      : message,
    requestId: req.headers['x-request-id'],
  };

  res.status(statusCode).json(errorResponse);
});

/**
 * Start server
 */

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wsServer = new NullStackWebSocketServer(server);

// Start listening
server.listen(PORT, HOST, () => {
  logger.info(`API Gateway started successfully`, {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  });

  logger.info('Available endpoints:', {
    root: `http://${HOST}:${PORT}/`,
    health: `http://${HOST}:${PORT}/health`,
    healthDetailed: `http://${HOST}:${PORT}/health/detailed`,
    metrics: `http://${HOST}:${PORT}/metrics`,
    circuitBreakers: `http://${HOST}:${PORT}/circuit-breakers`,
    docs: `http://${HOST}:${PORT}/api-docs`,
    websocket: `ws://${HOST}:${PORT}/ws`,
  });

  logger.info('Service routes configured:', {
    auth: '/api/v1/auth/*',
    titles: '/api/v1/titles/*',
    player: '/api/v1/player/*',
    economy: '/api/v1/economy/*',
    cloudscript: '/api/v1/cloudscript/*',
    matchmaking: '/api/v1/matchmaking/*',
    analytics: '/api/v1/analytics/*',
  });
});

/**
 * Graceful shutdown handling
 */

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');

    // Shutdown WebSocket server
    wsServer.shutdown();

    // Exit process
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;
