import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

export class RedisService {
  private static instance: RedisService;
  private client: RedisClientType | null = null;

  private constructor() {}

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async connect(): Promise<void> {
    if (this.client?.isOpen) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://:nullstack_dev_password@localhost:6379';

      this.client = createClient({
        url: redisUrl,
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      logger.warn('Analytics service will continue without Redis caching');
      this.client = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      logger.info('Disconnected from Redis');
    }
  }

  getClient(): RedisClientType {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  // Analytics-specific methods

  async incrementCounter(key: string, amount: number = 1): Promise<number> {
    const client = this.getClient();
    return await client.incrBy(key, amount);
  }

  async addToSet(key: string, member: string): Promise<number> {
    const client = this.getClient();
    return await client.sAdd(key, member);
  }

  async getSetSize(key: string): Promise<number> {
    const client = this.getClient();
    return await client.sCard(key);
  }

  async incrementHashField(key: string, field: string, amount: number = 1): Promise<number> {
    const client = this.getClient();
    return await client.hIncrBy(key, field, amount);
  }

  async getHash(key: string): Promise<Record<string, string>> {
    const client = this.getClient();
    return await client.hGetAll(key);
  }

  async setExpire(key: string, seconds: number): Promise<boolean> {
    const client = this.getClient();
    return await client.expire(key, seconds);
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  async set(key: string, value: string, expirationSeconds?: number): Promise<void> {
    const client = this.getClient();
    if (expirationSeconds) {
      await client.setEx(key, expirationSeconds, value);
    } else {
      await client.set(key, value);
    }
  }

  async delete(key: string): Promise<number> {
    const client = this.getClient();
    return await client.del(key);
  }
}

export const redisService = RedisService.getInstance();
