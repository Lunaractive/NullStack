import cron from 'node-cron';
import { Notification } from './models/notification';
import { DeviceToken } from './models/device-token';
import { fcmProvider } from './providers/fcm';
import { apnsProvider } from './providers/apns';

class NotificationScheduler {
  private task: cron.ScheduledTask | null = null;

  start(): void {
    // Run every minute to check for scheduled notifications
    this.task = cron.schedule('* * * * *', async () => {
      await this.processScheduledNotifications();
    });

    console.log('Notification scheduler started');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('Notification scheduler stopped');
    }
  }

  private async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();

      // Find notifications that are scheduled and ready to be sent
      const notifications = await Notification.find({
        status: 'scheduled',
        scheduledFor: { $lte: now },
      }).limit(10); // Process max 10 notifications per minute

      for (const notification of notifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
    }
  }

  async sendNotification(notification: any): Promise<void> {
    try {
      // Update status to sending
      notification.status = 'sending';
      await notification.save();

      let deviceTokens: any[] = [];

      // Get device tokens based on target type
      if (notification.targetType === 'broadcast') {
        deviceTokens = await DeviceToken.find({
          titleId: notification.titleId,
          enabled: true,
        });
      } else if (notification.targetType === 'segment' && notification.targetSegmentId) {
        // For segment targeting, we'd need to query the player service
        // For now, we'll implement basic segment support
        // In production, this would integrate with the player service's segment functionality
        console.log('Segment targeting not fully implemented yet');
        notification.status = 'failed';
        notification.errorMessage = 'Segment targeting not implemented';
        await notification.save();
        return;
      } else if (notification.targetType === 'players' && notification.targetPlayerIds) {
        deviceTokens = await DeviceToken.find({
          titleId: notification.titleId,
          playerId: { $in: notification.targetPlayerIds },
          enabled: true,
        });
      }

      if (deviceTokens.length === 0) {
        notification.status = 'sent';
        notification.sentAt = new Date();
        await notification.save();
        return;
      }

      // Convert data object to string key-value pairs for FCM
      const dataPayload: Record<string, string> = {};
      if (notification.data) {
        const dataMap = notification.data instanceof Map
          ? notification.data
          : new Map(Object.entries(notification.data));

        dataMap.forEach((value, key) => {
          dataPayload[key] = typeof value === 'string' ? value : JSON.stringify(value);
        });
      }

      // Separate tokens by platform
      const iosTokens = deviceTokens.filter(dt => dt.platform === 'ios');
      const androidTokens = deviceTokens.filter(dt => dt.platform === 'android');

      let totalSuccess = 0;
      let totalFailed = 0;
      const failedTokens: string[] = [];

      // Send to Android devices via FCM
      if (androidTokens.length > 0 && fcmProvider.isInitialized()) {
        const fcmMessages = androidTokens.map(dt => ({
          token: dt.token,
          title: notification.title,
          body: notification.message,
          data: dataPayload,
          imageUrl: notification.imageUrl,
        }));

        const fcmResult = await fcmProvider.sendToMultipleDevices(fcmMessages);
        totalSuccess += fcmResult.successCount;
        totalFailed += fcmResult.failureCount;
        failedTokens.push(...fcmResult.failedTokens);
      }

      // Send to iOS devices via APNS
      if (iosTokens.length > 0 && apnsProvider.isInitialized()) {
        const apnsMessages = iosTokens.map(dt => ({
          token: dt.token,
          title: notification.title,
          body: notification.message,
          data: notification.data instanceof Map
            ? Object.fromEntries(notification.data)
            : notification.data,
        }));

        const apnsResult = await apnsProvider.sendToMultipleDevices(apnsMessages);
        totalSuccess += apnsResult.successCount;
        totalFailed += apnsResult.failureCount;
        failedTokens.push(...apnsResult.failedTokens);
      }

      // Disable failed tokens
      if (failedTokens.length > 0) {
        await DeviceToken.updateMany(
          { token: { $in: failedTokens } },
          { $set: { enabled: false } }
        );
      }

      // Update notification status
      notification.status = 'sent';
      notification.sentCount = totalSuccess;
      notification.failedCount = totalFailed;
      notification.deliveredCount = totalSuccess; // In a real implementation, we'd track delivery receipts
      notification.sentAt = new Date();
      await notification.save();

      console.log(`Notification ${notification.notificationId} sent: ${totalSuccess} success, ${totalFailed} failed`);
    } catch (error: any) {
      console.error('Error sending notification:', error);
      notification.status = 'failed';
      notification.errorMessage = error.message;
      await notification.save();
    }
  }
}

export const notificationScheduler = new NotificationScheduler();
