/**
 * Metrics Collection Utility
 * Collects and exposes metrics for monitoring
 */

import { Request, Response } from 'express';

interface Metrics {
  requests: {
    total: number;
    success: number;
    error: number;
    byMethod: Record<string, number>;
    byStatus: Record<number, number>;
  };
  latency: {
    min: number;
    max: number;
    avg: number;
    samples: number[];
  };
  services: Record<string, {
    requests: number;
    errors: number;
    avgLatency: number;
  }>;
}

class MetricsCollector {
  private metrics: Metrics;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byMethod: {},
        byStatus: {},
      },
      latency: {
        min: Infinity,
        max: 0,
        avg: 0,
        samples: [],
      },
      services: {},
    };
  }

  recordRequest(req: Request, res: Response, responseTime: number): void {
    this.metrics.requests.total++;

    // Record by method
    this.metrics.requests.byMethod[req.method] =
      (this.metrics.requests.byMethod[req.method] || 0) + 1;

    // Record by status
    this.metrics.requests.byStatus[res.statusCode] =
      (this.metrics.requests.byStatus[res.statusCode] || 0) + 1;

    // Record success/error
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    // Record latency
    this.recordLatency(responseTime);

    // Record service-specific metrics
    const serviceName = this.extractServiceName(req.path);
    if (serviceName) {
      this.recordServiceMetrics(serviceName, res.statusCode, responseTime);
    }
  }

  private recordLatency(responseTime: number): void {
    this.metrics.latency.samples.push(responseTime);

    // Keep only last 1000 samples
    if (this.metrics.latency.samples.length > 1000) {
      this.metrics.latency.samples.shift();
    }

    // Update min/max
    this.metrics.latency.min = Math.min(this.metrics.latency.min, responseTime);
    this.metrics.latency.max = Math.max(this.metrics.latency.max, responseTime);

    // Calculate average
    const sum = this.metrics.latency.samples.reduce((a, b) => a + b, 0);
    this.metrics.latency.avg = sum / this.metrics.latency.samples.length;
  }

  private recordServiceMetrics(service: string, statusCode: number, responseTime: number): void {
    if (!this.metrics.services[service]) {
      this.metrics.services[service] = {
        requests: 0,
        errors: 0,
        avgLatency: 0,
      };
    }

    const serviceMetrics = this.metrics.services[service];
    serviceMetrics.requests++;

    if (statusCode >= 400) {
      serviceMetrics.errors++;
    }

    // Update average latency
    serviceMetrics.avgLatency =
      (serviceMetrics.avgLatency * (serviceMetrics.requests - 1) + responseTime) /
      serviceMetrics.requests;
  }

  private extractServiceName(path: string): string | null {
    const match = path.match(/^\/api\/v1\/([^/]+)/);
    return match ? match[1] : null;
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;

    return {
      uptime: uptime / 1000, // in seconds
      requests: {
        ...this.metrics.requests,
        rate: this.metrics.requests.total / (uptime / 1000), // requests per second
      },
      latency: {
        min: this.metrics.latency.min === Infinity ? 0 : this.metrics.latency.min,
        max: this.metrics.latency.max,
        avg: Math.round(this.metrics.latency.avg * 100) / 100,
        p50: this.getPercentile(50),
        p95: this.getPercentile(95),
        p99: this.getPercentile(99),
      },
      services: this.metrics.services,
      timestamp: new Date().toISOString(),
    };
  }

  private getPercentile(percentile: number): number {
    if (this.metrics.latency.samples.length === 0) return 0;

    const sorted = [...this.metrics.latency.samples].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[index] * 100) / 100;
  }

  reset(): void {
    this.startTime = Date.now();
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byMethod: {},
        byStatus: {},
      },
      latency: {
        min: Infinity,
        max: 0,
        avg: 0,
        samples: [],
      },
      services: {},
    };
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();

// Middleware to collect metrics
export const metricsMiddleware = (req: Request, res: Response, next: Function): void => {
  const startTime = Date.now();

  // Capture the end of the response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(req, res, responseTime);
  });

  next();
};

// Route handler for metrics endpoint
export const metricsHandler = (req: Request, res: Response): void => {
  const metrics = metricsCollector.getMetrics();
  res.json(metrics);
};
