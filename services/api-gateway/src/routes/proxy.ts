/**
 * Proxy Routes
 * Creates proxy middleware for all microservices
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { services, ServiceConfig } from '../config/services';
import { logger } from '../utils/logger';
import { authRateLimiter, apiRateLimiter } from '../middleware/rate-limiter';

const router = Router();

/**
 * Create proxy middleware for a service
 */
const createServiceProxy = (service: ServiceConfig) => {
  const proxyOptions: Options = {
    target: service.target,
    changeOrigin: true,
    pathRewrite: {
      [`^${service.pathPrefix}`]: '', // Remove the prefix when forwarding
    },
    timeout: service.timeout || 5000,
    proxyTimeout: service.timeout || 5000,
    onProxyReq: (proxyReq, req, res) => {
      // Add custom headers
      proxyReq.setHeader('X-Forwarded-By', 'api-gateway');
      proxyReq.setHeader('X-Gateway-Version', '1.0.0');

      // Forward request ID
      const requestId = req.headers['x-request-id'];
      if (requestId) {
        proxyReq.setHeader('X-Request-ID', requestId as string);
      }

      // Log proxied request
      logger.debug(`Proxying request to ${service.name}:`, {
        method: req.method,
        path: req.path,
        target: service.target,
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add service identifier header
      proxyRes.headers['X-Service-Name'] = service.name;

      logger.debug(`Received response from ${service.name}:`, {
        statusCode: proxyRes.statusCode,
        path: req.path,
      });
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${service.name}:`, {
        error: err.message,
        path: req.path,
        target: service.target,
      });

      const response = res as Response;
      if (!response.headersSent) {
        response.status(503).json({
          error: 'Service Unavailable',
          message: `The ${service.name} is temporarily unavailable`,
          service: service.name,
        });
      }
    },
  };

  return createProxyMiddleware(proxyOptions);
};

/**
 * Setup routes for all services
 */

// Auth Service - with stricter rate limiting
router.use(
  services.auth.pathPrefix,
  authRateLimiter,
  createServiceProxy(services.auth)
);

// Title Service
router.use(
  services.title.pathPrefix,
  apiRateLimiter,
  createServiceProxy(services.title)
);

// Player Service
router.use(
  services.player.pathPrefix,
  apiRateLimiter,
  createServiceProxy(services.player)
);

// Economy Service
router.use(
  services.economy.pathPrefix,
  apiRateLimiter,
  createServiceProxy(services.economy)
);

// CloudScript Service
router.use(
  services.cloudscript.pathPrefix,
  apiRateLimiter,
  createServiceProxy(services.cloudscript)
);

// Matchmaking Service
router.use(
  services.matchmaking.pathPrefix,
  apiRateLimiter,
  createServiceProxy(services.matchmaking)
);

// Analytics Service
router.use(
  services.analytics.pathPrefix,
  apiRateLimiter,
  createServiceProxy(services.analytics)
);

// Catch-all for unknown routes
router.use('*', (req: Request, res: Response) => {
  logger.warn(`Unknown route accessed: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl,
  });
});

export default router;
