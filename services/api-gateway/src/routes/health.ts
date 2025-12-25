/**
 * Health Check Routes
 * Endpoints for monitoring service health
 */

import { Router, Request, Response } from 'express';
import { getSystemHealth, clearHealthCache } from '../utils/health-checker';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic health status of the API Gateway
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API Gateway is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Returns detailed health status including all microservices
 *     tags: [Health]
 *     parameters:
 *       - in: query
 *         name: cache
 *         schema:
 *           type: boolean
 *         description: Use cached health data (default true)
 *     responses:
 *       200:
 *         description: Detailed health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [healthy, unhealthy, unknown]
 *                       responseTime:
 *                         type: number
 *                       error:
 *                         type: string
 *                       lastCheck:
 *                         type: string
 *                         format: date-time
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     healthy:
 *                       type: number
 *                     unhealthy:
 *                       type: number
 *                     unknown:
 *                       type: number
 *       503:
 *         description: System is unhealthy
 */
router.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const useCache = req.query.cache !== 'false';
    const health = await getSystemHealth(useCache);

    // Return 503 if system is unhealthy
    const statusCode = health.status === 'unhealthy' ? 503 : 200;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Failed to perform health check',
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Kubernetes liveness probe endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Kubernetes readiness probe endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready to accept traffic
 *       503:
 *         description: Service is not ready
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const health = await getSystemHealth(true);

    // Service is ready if at least 50% of services are healthy
    const readyThreshold = 0.5;
    const healthyRatio = health.summary.healthy / health.summary.total;

    if (healthyRatio >= readyThreshold) {
      res.status(200).json({
        status: 'ready',
        healthyServices: health.summary.healthy,
        totalServices: health.summary.total,
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        healthyServices: health.summary.healthy,
        totalServices: health.summary.total,
      });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      error: 'Failed to perform readiness check',
    });
  }
});

/**
 * @swagger
 * /health/cache/clear:
 *   post:
 *     summary: Clear health cache
 *     description: Clears the health check cache (admin only)
 *     tags: [Health]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/health/cache/clear', (req: Request, res: Response) => {
  // Simple API key check (should be replaced with proper authentication)
  const apiKey = req.headers['x-api-key'];
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!adminApiKey || apiKey !== adminApiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required',
    });
  }

  clearHealthCache();
  logger.info('Health cache cleared by admin');

  res.status(200).json({
    status: 'success',
    message: 'Health cache cleared',
  });
});

export default router;
