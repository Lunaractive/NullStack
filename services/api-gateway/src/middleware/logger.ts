/**
 * Request Logger Middleware
 * Logs HTTP requests with detailed information
 */

import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Add request ID to all requests
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Use existing request ID or generate new one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Custom token for morgan to include request ID
morgan.token('request-id', (req: Request) => {
  return req.headers['x-request-id'] as string;
});

// Custom token for response time in ms
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const startTime = (req as any)._startTime;
  if (!startTime) return '0';
  return `${Date.now() - startTime}ms`;
});

// Custom token for user agent
morgan.token('user-agent', (req: Request) => {
  return req.headers['user-agent'] || 'unknown';
});

// Custom token for real IP
morgan.token('real-ip', (req: Request) => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown'
  );
});

// Development format - detailed and colored
const devFormat = ':method :url :status :response-time-ms - :real-ip - :request-id';

// Production format - JSON structured logging
const prodFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time-ms',
  ip: ':real-ip',
  requestId: ':request-id',
  userAgent: ':user-agent',
});

// Create morgan middleware based on environment
export const httpLogger = morgan(
  process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  {
    stream: {
      write: (message: string) => {
        // Parse JSON in production, log as-is in development
        if (process.env.NODE_ENV === 'production') {
          try {
            const log = JSON.parse(message);
            logger.http('HTTP Request', log);
          } catch {
            logger.http(message.trim());
          }
        } else {
          logger.http(message.trim());
        }
      },
    },
    skip: (req: Request) => {
      // Skip logging for health checks and metrics
      return req.path === '/health' || req.path === '/metrics';
    },
  }
);

// Request timing middleware
export const requestTimingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  (req as any)._startTime = Date.now();
  next();
};

// Error logging middleware
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'];
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;

  logger.error('Request error:', {
    requestId,
    method: req.method,
    url: req.url,
    ip,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
  });

  next(err);
};

// Request/Response body logger (use sparingly, only for debugging)
export const bodyLogger = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.LOG_BODIES === 'true' && process.env.NODE_ENV !== 'production') {
    const requestId = req.headers['x-request-id'];

    // Log request body
    if (req.body && Object.keys(req.body).length > 0) {
      logger.debug('Request body:', {
        requestId,
        body: req.body,
      });
    }

    // Capture response body
    const originalSend = res.send;
    res.send = function (data: any): Response {
      logger.debug('Response body:', {
        requestId,
        statusCode: res.statusCode,
        body: data,
      });
      return originalSend.call(this, data);
    };
  }

  next();
};
