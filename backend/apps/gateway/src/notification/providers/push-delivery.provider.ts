import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationDelivery } from '@database/entities';
import * as admin from 'firebase-admin';

@Injectable()
export class PushDeliveryProvider {
  private readonly logger = new Logger(PushDeliveryProvider.name);
  private firebaseApp: admin.app.App;

  constructor(private readonly configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      const serviceAccountKey = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_KEY');
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');

      if (!serviceAccountKey || !projectId) {
        this.logger.warn(
          'Firebase credentials not configured. Push notifications will be disabled.'
        );
        return;
      }

      const serviceAccount = JSON.parse(serviceAccountKey);

      this.firebaseApp = admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId,
        },
        'synapseai-notifications'
      );

      this.logger.log('Firebase push notification provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase:', error);
    }
  }

  async sendPush(delivery: NotificationDelivery): Promise<any> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized. Please check your configuration.');
    }

    try {
      const { notification } = delivery;
      const pushData = delivery.deliveryData?.push;

      if (!pushData?.deviceTokens?.length) {
        throw new Error('No push notification device tokens specified');
      }

      const message = this.buildPushMessage(notification, pushData);

      let result;
      if (pushData.deviceTokens.length === 1) {
        // Send to single device
        result = await admin.messaging(this.firebaseApp).send({
          ...message,
          token: pushData.deviceTokens[0],
        });

        return {
          success: true,
          messageId: result,
          deliveredTokens: 1,
          failedTokens: 0,
        };
      } else {
        // Send to multiple devices
        result = await admin.messaging(this.firebaseApp).sendEachForMulticast({
          ...message,
          tokens: pushData.deviceTokens,
        });

        this.logger.debug(
          `Push notification sent: ${result.successCount} successful, ${result.failureCount} failed`
        );

        // Handle failed tokens
        const failedTokens: Array<{
          token: string;
          error?: string;
          errorCode?: string;
        }> = [];
        if (result.responses && pushData.deviceTokens) {
          result.responses.forEach((response, index) => {
            if (!response.success && pushData.deviceTokens) {
              failedTokens.push({
                token: pushData.deviceTokens[index],
                error: response.error?.message,
                errorCode: response.error?.code,
              });
            }
          });
        }

        return {
          success: result.successCount > 0,
          messageId: result.responses?.[0]?.messageId,
          deliveredTokens: result.successCount,
          failedTokens: result.failureCount,
          failedTokenDetails: failedTokens,
          multicastId: (result as any).multicastId,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send push notification: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  private buildPushMessage(notification: any, pushData: any): admin.messaging.Message {
    const message: admin.messaging.Message = {
      condition: `'synapseai-notifications' in topics`,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: {
        notificationId: notification.id,
        type: notification.type,
        priority: notification.priority,
        eventType: notification.eventType || '',
        sourceModule: notification.sourceModule || '',
        correlationId: notification.correlationId || '',
        organizationId: notification.organizationId,
        userId: notification.userId,
        createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
        ...(notification.data && typeof notification.data === 'object'
          ? this.flattenObjectForData(notification.data)
          : {}),
      },
      android: {
        priority: this.mapPriorityToAndroid(notification.priority),
        notification: {
          channelId: 'synapseai-notifications',
          priority: this.mapPriorityToAndroid(notification.priority),
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
          icon: 'ic_notification',
          color: '#007bff',
          tag: notification.eventType || 'general',
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.message,
            },
            badge: pushData.badge || 1,
            sound: pushData.sound || 'default',
            category: pushData.category || 'GENERAL',
            'thread-id': notification.eventType || 'general',
            'mutable-content': 1,
          },
        },
        headers: {
          'apns-priority': this.mapPriorityToApns(notification.priority),
          'apns-push-type': 'alert',
        },
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.message,
          icon: '/icons/notification-icon.png',
          badge: '/icons/badge-icon.png',
          tag: notification.eventType || 'general',
          requireInteraction: notification.priority === 'CRITICAL',
          actions: [
            {
              action: 'view',
              title: 'View',
              icon: '/icons/view-icon.png',
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
              icon: '/icons/dismiss-icon.png',
            },
          ],
        },
        fcmOptions: {
          link: `${this.configService.get<string>('APP_URL', 'https://app.synapseai.com')}/notifications/${notification.id}`,
        },
      },
    };

    return message;
  }

  private flattenObjectForData(obj: any, prefix = ''): Record<string, string> {
    const flattened: Record<string, string> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(flattened, this.flattenObjectForData(value, newKey));
        } else {
          flattened[newKey] = String(value);
        }
      }
    }

    return flattened;
  }

  private mapPriorityToAndroid(priority: string): 'high' | 'default' {
    switch (priority) {
      case 'CRITICAL':
      case 'HIGH':
        return 'high';
      default:
        return 'default';
    }
  }

  private mapPriorityToApns(priority: string): '5' | '10' {
    switch (priority) {
      case 'CRITICAL':
      case 'HIGH':
        return '10';
      default:
        return '5';
    }
  }

  async validateDeviceTokens(tokens: string[]): Promise<{
    validTokens: string[];
    invalidTokens: string[];
  }> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    const validTokens: string[] = [];
    const invalidTokens: string[] = [];

    // Test each token by sending a dry-run message
    for (const token of tokens) {
      try {
        await admin.messaging(this.firebaseApp).send(
          {
            token,
            notification: {
              title: 'Test',
              body: 'Test message',
            },
          },
          true
        ); // dry-run mode

        validTokens.push(token);
      } catch (error) {
        invalidTokens.push(token);
        this.logger.debug(`Invalid token detected: ${token}`);
      }
    }

    return { validTokens, invalidTokens };
  }

  async sendBatchPush(deliveries: NotificationDelivery[]): Promise<Array<{
    deliveryId: string;
    success: boolean;
    result?: any;
    error?: string;
  }>> {
    const results: Array<{
      deliveryId: string;
      success: boolean;
      result?: any;
      error?: string;
    }> = [];
    const batchSize = 500; // Firebase FCM batch limit

    for (let i = 0; i < deliveries.length; i += batchSize) {
      const batch = deliveries.slice(i, i + batchSize);

      const batchPromises = batch.map(async (delivery) => {
        try {
          const result = await this.sendPush(delivery);
          return { deliveryId: delivery.id, success: true, result };
        } catch (error) {
          return {
            deliveryId: delivery.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            deliveryId: 'unknown',
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          });
        }
      });
    }

    return results;
  }

  async testConnection(): Promise<boolean> {
    if (!this.firebaseApp) {
      return false;
    }

    try {
      // Test by getting the app instance
      const app = admin.app('synapseai-notifications');
      return !!app;
    } catch (error) {
      this.logger.error('Push notification connection test failed:', error);
      return false;
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<any> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    try {
      const result = await admin.messaging(this.firebaseApp).subscribeToTopic(tokens, topic);

      this.logger.debug(`Subscribed ${result.successCount} tokens to topic: ${topic}`);

      return {
        success: result.successCount > 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<any> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    try {
      const result = await admin.messaging(this.firebaseApp).unsubscribeFromTopic(tokens, topic);

      this.logger.debug(`Unsubscribed ${result.successCount} tokens from topic: ${topic}`);

      return {
        success: result.successCount > 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic ${topic}:`, error);
      throw error;
    }
  }
}
