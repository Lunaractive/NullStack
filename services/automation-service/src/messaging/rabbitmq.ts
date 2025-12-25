import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';
import { config } from '../config';
import logger from '../utils/logger';

export type MessageHandler = (message: any) => Promise<void>;

class RabbitMQClient {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      const conn: any = await amqp.connect(config.rabbitmq.url);
      this.connection = conn;

      const ch = await conn.createChannel();
      this.channel = ch;

      // Assert exchange
      await ch.assertExchange(config.rabbitmq.exchange, 'topic', {
        durable: true,
      });

      // Assert queue
      await ch.assertQueue(config.rabbitmq.queue, {
        durable: true,
      });

      conn.on('error', (err: any) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        this.isConnected = false;
      });

      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      });

      this.isConnected = true;
      logger.info('Connected to RabbitMQ');
    } catch (error: any) {
      logger.error('Failed to connect to RabbitMQ', { error: error.message });
      // Retry connection after 5 seconds
      setTimeout(() => this.connect(), 5000);
      throw error;
    }
  }

  async bindQueue(routingKeys: string[]): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    for (const routingKey of routingKeys) {
      await this.channel.bindQueue(
        config.rabbitmq.queue,
        config.rabbitmq.exchange,
        routingKey
      );
      logger.info('Bound queue to routing key', { routingKey });
    }
  }

  async subscribe(handler: MessageHandler): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    await this.channel.consume(
      config.rabbitmq.queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          logger.debug('Received message', {
            routingKey: msg.fields.routingKey,
            content,
          });

          await handler(content);
          this.channel?.ack(msg);
        } catch (error: any) {
          logger.error('Error processing message', {
            error: error.message,
            routingKey: msg.fields.routingKey,
          });
          // Reject and requeue the message
          this.channel?.nack(msg, false, true);
        }
      },
      { noAck: false }
    );

    logger.info('Subscribed to RabbitMQ queue', { queue: config.rabbitmq.queue });
  }

  async publish(routingKey: string, message: any): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    const content = Buffer.from(JSON.stringify(message));
    this.channel.publish(config.rabbitmq.exchange, routingKey, content, {
      persistent: true,
    });

    logger.debug('Published message', { routingKey, message });
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await (this.connection as any).close();
    }
    this.isConnected = false;
    logger.info('RabbitMQ connection closed');
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const rabbitmq = new RabbitMQClient();
export default rabbitmq;
