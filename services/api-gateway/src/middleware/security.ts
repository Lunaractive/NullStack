/**
 * Security Middleware
 * Additional security measures for the API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * API Key validation middleware
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  // Skip validation if no API keys are configured
  if (validApiKeys.length === 0) {
    return next();
  }

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    logger.warn('Invalid API key attempt:', {
      ip: req.ip,
      path: req.path,
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
    });
  }

  next();
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxSize) {
      logger.warn('Request too large:', {
        size: contentLength,
        maxSize,
        ip: req.ip,
        path: req.path,
      });

      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body must not exceed ${maxSize} bytes`,
      });
    }

    next();
  };
};

/**
 * Sanitize headers to prevent injection attacks
 */
export const sanitizeHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const dangerousHeaders = ['x-forwarded-host', 'x-forwarded-server'];

  dangerousHeaders.forEach((header) => {
    if (req.headers[header]) {
      delete req.headers[header];
    }
  });

  next();
};

/**
 * Block suspicious user agents
 */
export const blockSuspiciousUserAgents = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  const suspiciousPatterns = [
    'nikto',
    'sqlmap',
    'masscan',
    'nmap',
    'dirbuster',
  ];

  for (const pattern of suspiciousPatterns) {
    if (userAgent.includes(pattern)) {
      logger.warn('Suspicious user agent blocked:', {
        userAgent,
        ip: req.ip,
        path: req.path,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied',
      });
    }
  }

  next();
};

/**
 * Add security headers to response
 */
export const addSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};
