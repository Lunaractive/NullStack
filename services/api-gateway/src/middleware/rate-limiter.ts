/**
 * Rate Limiter Middleware
 * Implements rate limiting to prevent abuse and ensure fair usage
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Custom key generator based on IP and API key
const keyGenerator = (req: Request): string => {
  // Use API key if present, otherwise use IP
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return `apikey:${apiKey}`;
  }

  // Get real IP from various headers (for proxy scenarios)
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';

  return `ip:${ip}`;
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response): void => {
  const key = keyGenerator(req);
  logger.warn(`Rate limit exceeded for ${key} on ${req.method} ${req.path}`);

  res.status(429).json({
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

// Skip successful requests in rate limit count (optional)
const skipSuccessfulRequests = (req: Request, res: Response): boolean => {
  // Don't count successful requests (200-299) for certain endpoints
  return res.statusCode >= 200 && res.statusCode < 300;
};

// Global rate limiter - applies to all requests
export const globalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.GLOBAL_RATE_LIMIT || '1000'), // 1000 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator,
  handler: rateLimitHandler,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/metrics';
  },
});

// Auth endpoint rate limiter - stricter limits for authentication
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT || '100'), // 100 requests per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
});

// Strict rate limiter for sensitive operations (login, registration)
export const strictRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.STRICT_RATE_LIMIT || '20'), // 20 requests per 15 minutes
  message: 'Too many attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
});

// WebSocket connection rate limiter
export const websocketRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.WS_RATE_LIMIT || '10'), // 10 connections per minute
  message: 'Too many WebSocket connection attempts.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
});

// API endpoint rate limiter - moderate limits for general API usage
export const apiRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT || '500'), // 500 requests per 15 minutes
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
});

logger.info('Rate limiter configured:', {
  global: `${process.env.GLOBAL_RATE_LIMIT || '1000'} requests per 15 minutes`,
  auth: `${process.env.AUTH_RATE_LIMIT || '100'} requests per 15 minutes`,
  strict: `${process.env.STRICT_RATE_LIMIT || '20'} requests per 15 minutes`,
  api: `${process.env.API_RATE_LIMIT || '500'} requests per 15 minutes`,
  websocket: `${process.env.WS_RATE_LIMIT || '10'} connections per minute`,
});
