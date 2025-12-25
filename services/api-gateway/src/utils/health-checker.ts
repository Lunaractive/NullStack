/**
 * Health Checker Utility
 * Monitors health of all downstream microservices
 */

import axios, { AxiosError } from 'axios';
import { logger } from './logger';
import { ServiceConfig, getAllServices } from '../config/services';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  lastCheck: Date;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  services: ServiceHealth[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
  };
}

// Cache for health check results
const healthCache = new Map<string, ServiceHealth>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Check health of a single service
 */
export const checkServiceHealth = async (service: ServiceConfig): Promise<ServiceHealth> => {
  const startTime = Date.now();
  const healthUrl = `${service.target}${service.healthCheck || '/health'}`;

  try {
    const response = await axios.get(healthUrl, {
      timeout: service.timeout || 5000,
      validateStatus: (status) => status === 200,
    });

    const responseTime = Date.now() - startTime;

    const health: ServiceHealth = {
      name: service.name,
      status: 'healthy',
      responseTime,
      lastCheck: new Date(),
    };

    // Update cache
    healthCache.set(service.name, health);

    return health;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;

    const health: ServiceHealth = {
      name: service.name,
      status: 'unhealthy',
      responseTime,
      error: axiosError.message || 'Unknown error',
      lastCheck: new Date(),
    };

    // Update cache
    healthCache.set(service.name, health);

    logger.warn(`Health check failed for ${service.name}:`, {
      error: axiosError.message,
      url: healthUrl,
    });

    return health;
  }
};

/**
 * Check health of all services
 */
export const checkAllServicesHealth = async (useCache = true): Promise<ServiceHealth[]> => {
  const services = getAllServices();

  // Check if we can use cached results
  if (useCache) {
    const now = Date.now();
    const cachedResults: ServiceHealth[] = [];
    let allCached = true;

    for (const service of services) {
      const cached = healthCache.get(service.name);
      if (cached && (now - cached.lastCheck.getTime()) < CACHE_TTL) {
        cachedResults.push(cached);
      } else {
        allCached = false;
        break;
      }
    }

    if (allCached) {
      return cachedResults;
    }
  }

  // Perform health checks in parallel
  const healthChecks = services.map((service) => checkServiceHealth(service));
  return Promise.all(healthChecks);
};

/**
 * Get overall system health status
 */
export const getSystemHealth = async (useCache = true): Promise<SystemHealth> => {
  const services = await checkAllServicesHealth(useCache);

  const summary = {
    total: services.length,
    healthy: services.filter((s) => s.status === 'healthy').length,
    unhealthy: services.filter((s) => s.status === 'unhealthy').length,
    unknown: services.filter((s) => s.status === 'unknown').length,
  };

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (summary.unhealthy === 0) {
    status = 'healthy';
  } else if (summary.healthy > 0) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    timestamp: new Date(),
    uptime: process.uptime(),
    services,
    summary,
  };
};

/**
 * Get cached health status for a specific service
 */
export const getCachedServiceHealth = (serviceName: string): ServiceHealth | undefined => {
  return healthCache.get(serviceName);
};

/**
 * Clear health cache
 */
export const clearHealthCache = (): void => {
  healthCache.clear();
  logger.debug('Health cache cleared');
};

// Periodic health check (every 60 seconds)
if (process.env.ENABLE_PERIODIC_HEALTH_CHECK !== 'false') {
  const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000');
  setInterval(async () => {
    try {
      const health = await getSystemHealth(false);
      if (health.status !== 'healthy') {
        logger.warn('System health degraded:', {
          status: health.status,
          summary: health.summary,
        });
      }
    } catch (error) {
      logger.error('Periodic health check failed:', error);
    }
  }, interval);

  logger.info(`Periodic health check enabled (interval: ${interval}ms)`);
}
