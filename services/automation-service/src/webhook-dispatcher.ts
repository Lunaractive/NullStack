import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { config } from './config';
import logger from './utils/logger';
import database from './database';

interface Webhook {
  id: string;
  url: string;
  secret: string;
  headers: Record<string, string>;
  retry_count: number;
  timeout: number;
}

interface WebhookEvent {
  eventType: string;
  payload: any;
  timestamp: string;
}

export class WebhookDispatcher {
  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Dispatch a webhook event with retry logic
   */
  async dispatch(webhook: Webhook, event: WebhookEvent): Promise<void> {
    const deliveryId = crypto.randomUUID();
    const payloadString = JSON.stringify(event.payload);
    const signature = this.generateSignature(payloadString, webhook.secret);

    logger.info('Dispatching webhook', {
      webhookId: webhook.id,
      deliveryId,
      eventType: event.eventType,
    });

    // Log webhook delivery attempt
    await database.query(
      `INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, status, attempt_count)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [deliveryId, webhook.id, event.eventType, event.payload, 'pending', 0]
    );

    let attempt = 0;
    let lastError: string | null = null;

    while (attempt < webhook.retry_count) {
      attempt++;

      try {
        const response = await axios.post(webhook.url, event.payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-NullStack-Event': event.eventType,
            'X-NullStack-Signature': signature,
            'X-NullStack-Delivery': deliveryId,
            'X-NullStack-Timestamp': event.timestamp,
            'User-Agent': 'NullStack-Webhooks/1.0',
            ...webhook.headers,
          },
          timeout: webhook.timeout,
          validateStatus: (status) => status >= 200 && status < 300,
        });

        // Success
        await database.query(
          `UPDATE webhook_deliveries
           SET status = $1, status_code = $2, response_body = $3,
               attempt_count = $4, delivered_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [
            'delivered',
            response.status,
            JSON.stringify(response.data).substring(0, 10000),
            attempt,
            deliveryId,
          ]
        );

        logger.info('Webhook delivered successfully', {
          webhookId: webhook.id,
          deliveryId,
          attempt,
          statusCode: response.status,
        });

        return;
      } catch (error: any) {
        const axiosError = error as AxiosError;
        lastError = axiosError.message;

        logger.warn('Webhook delivery attempt failed', {
          webhookId: webhook.id,
          deliveryId,
          attempt,
          error: lastError,
          statusCode: axiosError.response?.status,
        });

        // If this is not the last attempt, wait before retrying
        if (attempt < webhook.retry_count) {
          const delay = config.webhook.retryDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    await database.query(
      `UPDATE webhook_deliveries
       SET status = $1, error_message = $2, attempt_count = $3
       WHERE id = $4`,
      ['failed', lastError, attempt, deliveryId]
    );

    logger.error('Webhook delivery failed after all retries', {
      webhookId: webhook.id,
      deliveryId,
      attempts: attempt,
      error: lastError,
    });
  }

  /**
   * Find all webhooks subscribed to a specific event
   */
  async findWebhooksForEvent(
    eventType: string,
    projectId: string
  ): Promise<Webhook[]> {
    const result = await database.query(
      `SELECT id, url, secret, headers, retry_count, timeout
       FROM webhooks
       WHERE project_id = $1
         AND is_active = true
         AND $2 = ANY(events)`,
      [projectId, eventType]
    );

    return result.rows;
  }

  /**
   * Dispatch event to all subscribed webhooks
   */
  async dispatchToSubscribers(
    eventType: string,
    projectId: string,
    payload: any
  ): Promise<void> {
    const webhooks = await this.findWebhooksForEvent(eventType, projectId);

    if (webhooks.length === 0) {
      logger.debug('No webhooks found for event', { eventType, projectId });
      return;
    }

    const event: WebhookEvent = {
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    };

    logger.info('Dispatching to multiple webhooks', {
      eventType,
      projectId,
      count: webhooks.length,
    });

    // Dispatch to all webhooks in parallel
    const promises = webhooks.map((webhook) =>
      this.dispatch(webhook, event).catch((error) => {
        logger.error('Failed to dispatch webhook', {
          webhookId: webhook.id,
          error: error.message,
        });
      })
    );

    await Promise.all(promises);
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(webhookId: string): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
  }> {
    const result = await database.query(
      'SELECT id, url, secret, headers, timeout FROM webhooks WHERE id = $1',
      [webhookId]
    );

    if (result.rows.length === 0) {
      throw new Error('Webhook not found');
    }

    const webhook = result.rows[0];
    const testPayload = {
      event: 'webhook.test',
      message: 'This is a test webhook delivery from NullStack',
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = this.generateSignature(payloadString, webhook.secret);

    try {
      const response = await axios.post(webhook.url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-NullStack-Event': 'webhook.test',
          'X-NullStack-Signature': signature,
          'X-NullStack-Delivery': crypto.randomUUID(),
          'X-NullStack-Timestamp': new Date().toISOString(),
          'User-Agent': 'NullStack-Webhooks/1.0',
          ...webhook.headers,
        },
        timeout: webhook.timeout,
      });

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error: any) {
      const axiosError = error as AxiosError;
      return {
        success: false,
        statusCode: axiosError.response?.status,
        error: axiosError.message,
      };
    }
  }
}

export const webhookDispatcher = new WebhookDispatcher();
export default webhookDispatcher;
