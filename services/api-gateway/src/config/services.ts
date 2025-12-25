/**
 * Service Configuration
 * Defines all microservice endpoints and routing configuration
 */

export interface ServiceConfig {
  name: string;
  target: string;
  pathPrefix: string;
  healthCheck?: string;
  timeout?: number;
  retries?: number;
  circuitBreaker?: {
    threshold: number;
    timeout: number;
  };
}

export const services: Record<string, ServiceConfig> = {
  auth: {
    name: 'auth-service',
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    pathPrefix: '/api/v1/auth',
    healthCheck: '/health',
    timeout: 5000,
    retries: 3,
    circuitBreaker: {
      threshold: 5,
      timeout: 60000,
    },
  },
  title: {
    name: 'title-service',
    target: process.env.TITLE_SERVICE_URL || 'http://title-service:3002',
    pathPrefix: '/api/v1/titles',
    healthCheck: '/health',
    timeout: 5000,
    retries: 3,
    circuitBreaker: {
      threshold: 5,
      timeout: 60000,
    },
  },
  player: {
    name: 'player-service',
    target: process.env.PLAYER_SERVICE_URL || 'http://player-service:3003',
    pathPrefix: '/api/v1/player',
    healthCheck: '/health',
    timeout: 5000,
    retries: 3,
    circuitBreaker: {
      threshold: 5,
      timeout: 60000,
    },
  },
  economy: {
    name: 'economy-service',
    target: process.env.ECONOMY_SERVICE_URL || 'http://economy-service:3004',
    pathPrefix: '/api/v1/economy',
    healthCheck: '/health',
    timeout: 5000,
    retries: 3,
    circuitBreaker: {
      threshold: 5,
      timeout: 60000,
    },
  },
  cloudscript: {
    name: 'cloudscript-service',
    target: process.env.CLOUDSCRIPT_SERVICE_URL || 'http://cloudscript-service:3005',
    pathPrefix: '/api/v1/cloudscript',
    healthCheck: '/health',
    timeout: 10000, // Longer timeout for script execution
    retries: 2,
    circuitBreaker: {
      threshold: 5,
      timeout: 60000,
    },
  },
  matchmaking: {
    name: 'matchmaking-service',
    target: process.env.MATCHMAKING_SERVICE_URL || 'http://matchmaking-service:3006',
    pathPrefix: '/api/v1/matchmaking',
    healthCheck: '/health',
    timeout: 5000,
    retries: 3,
    circuitBreaker: {
      threshold: 5,
      timeout: 60000,
    },
  },
  analytics: {
    name: 'analytics-service',
    target: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3007',
    pathPrefix: '/api/v1/analytics',
    healthCheck: '/health',
    timeout: 5000,
    retries: 3,
    circuitBreaker: {
      threshold: 5,
      timeout: 60000,
    },
  },
};

export const getServiceConfig = (serviceName: string): ServiceConfig | undefined => {
  return services[serviceName];
};

export const getAllServices = (): ServiceConfig[] => {
  return Object.values(services);
};
