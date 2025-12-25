/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by failing fast when a service is down
 */

import { logger } from './logger';

enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failures exceeded threshold, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export class CircuitBreaker {
  private state: CircuitState;
  private failureCount: number;
  private successCount: number;
  private nextAttempt: number;
  private config: CircuitBreakerConfig;

  constructor(
    private serviceName: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();

    this.config = {
      failureThreshold: config?.failureThreshold || 5,
      successThreshold: config?.successThreshold || 2,
      timeout: config?.timeout || 60000, // 1 minute
      resetTimeout: config?.resetTimeout || 30000, // 30 seconds
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        logger.warn(`Circuit breaker OPEN for ${this.serviceName}, rejecting request`);
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`);
      }

      // Try transitioning to HALF_OPEN
      this.state = CircuitState.HALF_OPEN;
      logger.info(`Circuit breaker transitioning to HALF_OPEN for ${this.serviceName}`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info(`Circuit breaker CLOSED for ${this.serviceName}`);
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;

      logger.error(`Circuit breaker OPEN for ${this.serviceName}`, {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
        nextAttempt: new Date(this.nextAttempt).toISOString(),
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      service: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.state === CircuitState.OPEN
        ? new Date(this.nextAttempt).toISOString()
        : null,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    logger.info(`Circuit breaker manually reset for ${this.serviceName}`);
  }
}

// Circuit breaker manager for all services
class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker>;

  constructor() {
    this.breakers = new Map();
  }

  getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, config));
    }
    return this.breakers.get(serviceName)!;
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  reset(serviceName?: string): void {
    if (serviceName) {
      const breaker = this.breakers.get(serviceName);
      if (breaker) {
        breaker.reset();
      }
    } else {
      // Reset all breakers
      this.breakers.forEach((breaker) => breaker.reset());
    }
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();
