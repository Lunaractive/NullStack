import * as admin from 'firebase-admin';

export interface FCMMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface FCMBatchResult {
  successCount: number;
  failureCount: number;
  failedTokens: string[];
}

class FCMProvider {
  private initialized: boolean = false;

  initialize(serviceAccountPath?: string): void {
    if (this.initialized) {
      return;
    }

    try {
      const serviceAccount = serviceAccountPath
        ? require(serviceAccountPath)
        : process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : null;

      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.initialized = true;
        console.log('FCM initialized successfully');
      } else {
        console.warn('FCM service account not configured');
      }
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
    }
  }

  async sendToDevice(message: FCMMessage): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('FCM not initialized');
    }

    try {
      const fcmMessage: admin.messaging.Message = {
        token: message.token,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      await admin.messaging().send(fcmMessage);
      return true;
    } catch (error: any) {
      console.error('FCM send error:', error);

      // Check if token is invalid
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        throw new Error('INVALID_TOKEN');
      }

      throw error;
    }
  }

  async sendToMultipleDevices(messages: FCMMessage[]): Promise<FCMBatchResult> {
    if (!this.initialized) {
      throw new Error('FCM not initialized');
    }

    const result: FCMBatchResult = {
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
    };

    // FCM allows batch sending up to 500 messages
    const batchSize = 500;
    const batches: FCMMessage[][] = [];

    for (let i = 0; i < messages.length; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const fcmMessages: admin.messaging.Message[] = batch.map(msg => ({
        token: msg.token,
        notification: {
          title: msg.title,
          body: msg.body,
          imageUrl: msg.imageUrl,
        },
        data: msg.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      }));

      try {
        const response = await admin.messaging().sendEach(fcmMessages);
        result.successCount += response.successCount;
        result.failureCount += response.failureCount;

        // Track failed tokens
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            result.failedTokens.push(batch[idx].token);
          }
        });
      } catch (error) {
        console.error('FCM batch send error:', error);
        result.failureCount += batch.length;
        result.failedTokens.push(...batch.map(m => m.token));
      }
    }

    return result;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const fcmProvider = new FCMProvider();
