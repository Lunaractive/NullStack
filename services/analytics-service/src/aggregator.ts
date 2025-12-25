import { ConsumeMessage } from 'amqplib';
import { format, startOfDay, endOfDay } from 'date-fns';
import { mongoService } from './services/mongodb';
import { redisService } from './services/redis';
import { rabbitMQService } from './services/rabbitmq';
import { logger } from './services/logger';
import { Event } from './models/Event';
import { AnalyticsEvent } from './types';

/**
 * Analytics Aggregator Worker
 * Consumes events from RabbitMQ and processes them:
 * 1. Stores raw events in MongoDB
 * 2. Updates real-time counters in Redis
 * 3. Aggregates metrics for reports
 */
class AnalyticsAggregator {
  private isRunning = false;

  async start(): Promise<void> {
    logger.info('Starting Analytics Aggregator...');

    try {
      // Connect to all services
      await Promise.all([
        mongoService.connect(),
        redisService.connect(),
        rabbitMQService.connect(),
      ]);

      // Start consuming messages
      await rabbitMQService.consume(this.processMessage.bind(this));

      this.isRunning = true;
      logger.info('Analytics Aggregator started successfully');

      // Schedule periodic aggregation tasks
      this.scheduleAggregationTasks();

    } catch (error) {
      logger.error('Failed to start Analytics Aggregator:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping Analytics Aggregator...');

    this.isRunning = false;

    try {
      await Promise.all([
        mongoService.disconnect(),
        redisService.disconnect(),
        rabbitMQService.disconnect(),
      ]);

      logger.info('Analytics Aggregator stopped');
    } catch (error) {
      logger.error('Error stopping Analytics Aggregator:', error);
      throw error;
    }
  }

  /**
   * Process a single message from RabbitMQ
   */
  private async processMessage(msg: ConsumeMessage): Promise<void> {
    try {
      const event: AnalyticsEvent = JSON.parse(msg.content.toString());

      logger.debug('Processing event', {
        eventId: event.eventId,
        eventName: event.eventName,
        titleId: event.titleId,
      });

      // Process the event
      await Promise.all([
        this.storeEvent(event),
        this.updateRealTimeMetrics(event),
        this.updateAggregatedMetrics(event),
      ]);

      logger.debug('Event processed successfully', { eventId: event.eventId });

    } catch (error) {
      logger.error('Error processing message:', error);
      throw error; // Will cause the message to be requeued
    }
  }

  /**
   * Store raw event in MongoDB
   */
  private async storeEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const eventDoc = new Event({
        ...event,
        timestamp: event.timestamp || new Date(),
      });

      await eventDoc.save();

      logger.debug('Event stored in MongoDB', { eventId: event.eventId });
    } catch (error) {
      logger.error('Error storing event in MongoDB:', error);
      throw error;
    }
  }

  /**
   * Update real-time metrics in Redis
   */
  private async updateRealTimeMetrics(event: AnalyticsEvent): Promise<void> {
    try {
      const date = format(event.timestamp || new Date(), 'yyyy-MM-dd');
      const hour = format(event.timestamp || new Date(), 'yyyy-MM-dd-HH');

      // Update event counters
      const eventCountKey = `analytics:events:${event.titleId}:${event.eventName}:${date}`;
      await redisService.incrementCounter(eventCountKey);
      await redisService.setExpire(eventCountKey, 90 * 24 * 60 * 60); // 90 days TTL

      const eventCountHourKey = `analytics:events:${event.titleId}:${event.eventName}:${hour}`;
      await redisService.incrementCounter(eventCountHourKey);
      await redisService.setExpire(eventCountHourKey, 7 * 24 * 60 * 60); // 7 days TTL

      // Update unique players
      if (event.playerId) {
        const dauKey = `analytics:dau:${event.titleId}:${date}`;
        await redisService.addToSet(dauKey, event.playerId);
        await redisService.setExpire(dauKey, 90 * 24 * 60 * 60); // 90 days TTL

        const playerEventKey = `analytics:player:${event.titleId}:${event.playerId}:${event.eventName}:${date}`;
        await redisService.incrementCounter(playerEventKey);
        await redisService.setExpire(playerEventKey, 30 * 24 * 60 * 60); // 30 days TTL
      }

      // Update session tracking
      if (event.sessionId) {
        const sessionKey = `analytics:sessions:${event.titleId}:${date}`;
        await redisService.addToSet(sessionKey, event.sessionId);
        await redisService.setExpire(sessionKey, 90 * 24 * 60 * 60); // 90 days TTL

        // Track session start/end for duration calculation
        if (event.eventName === 'session_start') {
          const sessionStartKey = `session:start:${event.sessionId}`;
          await redisService.set(sessionStartKey, new Date().toISOString(), 24 * 60 * 60);
        } else if (event.eventName === 'session_end') {
          const sessionStartKey = `session:start:${event.sessionId}`;
          const startTime = await redisService.get(sessionStartKey);

          if (startTime) {
            const duration = new Date().getTime() - new Date(startTime).getTime();
            const sessionDurationKey = `analytics:session_duration:${event.titleId}:${date}`;
            await redisService.incrementHashField(sessionDurationKey, 'total', duration);
            await redisService.incrementHashField(sessionDurationKey, 'count', 1);
            await redisService.setExpire(sessionDurationKey, 90 * 24 * 60 * 60);
          }
        }
      }

      // Track platform distribution
      if (event.platform) {
        const platformKey = `analytics:platform:${event.titleId}:${date}`;
        await redisService.incrementHashField(platformKey, event.platform);
        await redisService.setExpire(platformKey, 90 * 24 * 60 * 60);
      }

      // Track country distribution
      if (event.country) {
        const countryKey = `analytics:country:${event.titleId}:${date}`;
        await redisService.incrementHashField(countryKey, event.country);
        await redisService.setExpire(countryKey, 90 * 24 * 60 * 60);
      }

      logger.debug('Real-time metrics updated', {
        eventId: event.eventId,
        titleId: event.titleId,
      });

    } catch (error) {
      logger.error('Error updating real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Update aggregated metrics in Redis
   */
  private async updateAggregatedMetrics(event: AnalyticsEvent): Promise<void> {
    try {
      const date = format(event.timestamp || new Date(), 'yyyy-MM-dd');

      // Check if we need to aggregate for this date
      const aggregationKey = `analytics:aggregated:${event.titleId}:${date}`;
      const aggregated = await redisService.get(aggregationKey);

      if (!aggregated) {
        // Mark as aggregated
        await redisService.set(aggregationKey, '1', 24 * 60 * 60);

        // Trigger aggregation job (this would be done periodically in production)
        await this.aggregateDailyMetrics(event.titleId, date);
      }

    } catch (error) {
      logger.error('Error updating aggregated metrics:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Aggregate daily metrics for a specific title and date
   */
  private async aggregateDailyMetrics(titleId: string, dateStr: string): Promise<void> {
    try {
      logger.info('Aggregating daily metrics', { titleId, date: dateStr });

      const date = new Date(dateStr);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      // Get DAU
      const dauKey = `analytics:dau:${titleId}:${dateStr}`;
      const activeUsers = await redisService.getSetSize(dauKey);

      // Get session count
      const sessionKey = `analytics:sessions:${titleId}:${dateStr}`;
      const sessionCount = await redisService.getSetSize(sessionKey);

      // Get session duration
      const sessionDurationKey = `analytics:session_duration:${titleId}:${dateStr}`;
      const sessionDurations = await redisService.getHash(sessionDurationKey);
      const avgSessionDuration = sessionDurations.count
        ? parseInt(sessionDurations.total) / parseInt(sessionDurations.count)
        : 0;

      // Store aggregated report
      const reportKey = `analytics:dau:${titleId}:${dateStr}`;
      const report = {
        date: dateStr,
        activeUsers,
        newUsers: 0, // Would need additional tracking
        returningUsers: activeUsers,
        sessions: sessionCount,
        avgSessionDuration: Math.round(avgSessionDuration / 1000), // Convert to seconds
      };

      await redisService.set(reportKey, JSON.stringify(report), 90 * 24 * 60 * 60);

      logger.info('Daily metrics aggregated', { titleId, date: dateStr, activeUsers });

    } catch (error) {
      logger.error('Error aggregating daily metrics:', error);
    }
  }

  /**
   * Schedule periodic aggregation tasks
   */
  private scheduleAggregationTasks(): void {
    // Run aggregation every hour for the previous day
    setInterval(async () => {
      try {
        const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

        // Get all unique title IDs from recent events
        const titleIds = await Event.distinct('titleId', {
          timestamp: {
            $gte: startOfDay(new Date(yesterday)),
            $lte: endOfDay(new Date(yesterday)),
          },
        });

        for (const titleId of titleIds) {
          await this.aggregateDailyMetrics(titleId, yesterday);
        }

        logger.info('Completed scheduled aggregation', { date: yesterday, titles: titleIds.length });
      } catch (error) {
        logger.error('Error in scheduled aggregation:', error);
      }
    }, 60 * 60 * 1000); // Every hour

    logger.info('Scheduled aggregation tasks');
  }
}

// Main execution
const aggregator = new AnalyticsAggregator();

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await aggregator.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await aggregator.stop();
  process.exit(0);
});

// Start the aggregator
aggregator.start().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});

export default aggregator;
