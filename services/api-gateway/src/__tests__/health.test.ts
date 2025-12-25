/**
 * Health Check Tests
 */

import request from 'supertest';
import app from '../index';

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 OK with basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 OK for liveness probe', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'alive');
    });
  });

  describe('GET /', () => {
    it('should return gateway information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('name', 'NullStack API Gateway');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('services');
    });
  });
});

describe('Metrics Endpoints', () => {
  describe('GET /metrics', () => {
    it('should return metrics data', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('requests');
      expect(response.body).toHaveProperty('latency');
    });
  });
});

describe('Error Handling', () => {
  describe('GET /nonexistent', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('path', '/nonexistent');
    });
  });
});
