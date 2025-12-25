/**
 * CORS Middleware Configuration
 * Handles Cross-Origin Resource Sharing for the API Gateway
 */

import cors, { CorsOptions } from 'cors';
import { logger } from '../utils/logger';

// Allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  // Default allowed origins for development
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080',
  ];

  // In production, only use specified origins
  if (process.env.NODE_ENV === 'production') {
    return origins.length > 0 ? origins : [];
  }

  // In development, merge with defaults
  return [...new Set([...origins, ...defaultOrigins])];
};

const allowedOrigins = getAllowedOrigins();

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'X-Forwarded-For',
    'X-Real-IP',
    'X-Title-ID',
    'X-Player-ID',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions);

// Log CORS configuration on startup
logger.info('CORS Configuration:', {
  allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : ['None specified'],
  environment: process.env.NODE_ENV || 'development',
});
