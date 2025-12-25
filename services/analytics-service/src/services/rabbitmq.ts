import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
import { logger } from './logger';

export class RabbitMQService {
  private static instance: RabbitMQService;
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly QUEUE_NAME = 'analytics_events';
  private readonly EXCHANGE_NAME = 'analytics';

  private constructor() {}

  static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }

    try {
      const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://nullstack:nullstack_dev_password@localhost:5672';

      this.connection = await amqp.connect(rabbitUrl);
      this.channel = await this.connection.createChannel();

      // Create exchange
      await this.channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });

      // Create queue
      await this.channel.assertQueue(this.QUEUE_NAME, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 hours
          'x-max-length': 1000000, // Max 1M messages
        },
      });

      // Bind queue to exchange
      await this.channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, 'events.*');

      // Set prefetch for consumer
      await this.channel.prefetch(10);

      logger.info('Connected to RabbitMQ');

      this.connection.on('error', (error) => {
        logger.error('RabbitMQ connection error:', error);
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.connection = null;
        this.channel = null;
      });

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.channel = null;
      this.connection = null;
      logger.info('Disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error disconnecting from RabbitMQ:', error);
      throw error;
    }
  }

  async publishEvent(event: any, routingKey: string = 'events.track'): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    try {
      const message = Buffer.from(JSON.stringify(event));
      this.channel.publish(this.EXCHANGE_NAME, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
      });

      logger.debug(`Published event to ${routingKey}`, { eventName: event.eventName });
    } catch (error) {
      logger.error('Error publishing event to RabbitMQ:', error);
      throw error;
    }
  }

  async publishBatch(events: any[]): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    try {
      for (const event of events) {
        await this.publishEvent(event);
      }
      logger.debug(`Published batch of ${events.length} events`);
    } catch (error) {
      logger.error('Error publishing batch to RabbitMQ:', error);
      throw error;
    }
  }

  async consume(callback: (message: ConsumeMessage) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    try {
      await this.channel.consume(
        this.QUEUE_NAME,
        async (msg) => {
          if (!msg) return;

          try {
            await callback(msg);
            this.channel?.ack(msg);
          } catch (error) {
            logger.error('Error processing message:', error);
            // Reject and requeue the message
            this.channel?.nack(msg, false, true);
          }
        },
        { noAck: false }
      );

      logger.info('Started consuming messages from queue');
    } catch (error) {
      logger.error('Error setting up consumer:', error);
      throw error;
    }
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }
    return this.channel;
  }
}

export const rabbitMQService = RabbitMQService.getInstance();
