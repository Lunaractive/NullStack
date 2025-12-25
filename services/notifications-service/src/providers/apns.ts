import apn from 'apn';

export interface APNSMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
}

export interface APNSBatchResult {
  successCount: number;
  failureCount: number;
  failedTokens: string[];
}

class APNSProvider {
  private provider: apn.Provider | null = null;
  private initialized: boolean = false;

  initialize(options?: {
    keyPath?: string;
    keyId?: string;
    teamId?: string;
    production?: boolean;
  }): void {
    if (this.initialized) {
      return;
    }

    try {
      const keyPath = options?.keyPath || process.env.APNS_KEY_PATH;
      const keyId = options?.keyId || process.env.APNS_KEY_ID;
      const teamId = options?.teamId || process.env.APNS_TEAM_ID;
      const production = options?.production !== undefined
        ? options.production
        : process.env.NODE_ENV === 'production';

      if (!keyPath || !keyId || !teamId) {
        console.warn('APNS not configured: missing credentials');
        return;
      }

      this.provider = new apn.Provider({
        token: {
          key: keyPath,
          keyId: keyId,
          teamId: teamId,
        },
        production: production,
      });

      this.initialized = true;
      console.log('APNS initialized successfully');
    } catch (error) {
      console.error('Failed to initialize APNS:', error);
    }
  }

  async sendToDevice(message: APNSMessage): Promise<boolean> {
    if (!this.initialized || !this.provider) {
      throw new Error('APNS not initialized');
    }

    try {
      const notification = new apn.Notification({
        alert: {
          title: message.title,
          body: message.body,
        },
        topic: process.env.APNS_BUNDLE_ID || '',
        badge: message.badge,
        sound: message.sound || 'default',
        payload: message.data || {},
        pushType: 'alert',
      });

      const result = await this.provider.send(notification, message.token);

      if (result.failed && result.failed.length > 0) {
        const failure = result.failed[0];
        console.error('APNS send failed:', failure.response);

        // Check for invalid token
        if (failure.status === '410' || failure.status === '400') {
          throw new Error('INVALID_TOKEN');
        }

        return false;
      }

      return true;
    } catch (error) {
      console.error('APNS send error:', error);
      throw error;
    }
  }

  async sendToMultipleDevices(messages: APNSMessage[]): Promise<APNSBatchResult> {
    if (!this.initialized || !this.provider) {
      throw new Error('APNS not initialized');
    }

    const result: APNSBatchResult = {
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
    };

    // Send notifications in batches
    const batchSize = 100;
    const batches: APNSMessage[][] = [];

    for (let i = 0; i < messages.length; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(async (msg) => {
        try {
          const notification = new apn.Notification({
            alert: {
              title: msg.title,
              body: msg.body,
            },
            topic: process.env.APNS_BUNDLE_ID || '',
            badge: msg.badge,
            sound: msg.sound || 'default',
            payload: msg.data || {},
            pushType: 'alert',
          });

          const sendResult = await this.provider!.send(notification, msg.token);

          if (sendResult.failed && sendResult.failed.length > 0) {
            result.failureCount++;
            result.failedTokens.push(msg.token);
          } else {
            result.successCount++;
          }
        } catch (error) {
          console.error('APNS send error for token:', msg.token, error);
          result.failureCount++;
          result.failedTokens.push(msg.token);
        }
      });

      await Promise.all(promises);
    }

    return result;
  }

  async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
      this.initialized = false;
      this.provider = null;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const apnsProvider = new APNSProvider();
