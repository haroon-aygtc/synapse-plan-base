import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, NotificationDelivery } from '@database/entities';
import { AgentEventType, NotificationType, ExecutionStatus, EventTargetType } from '@shared/enums';
import { EmailDeliveryProvider } from './providers/email-delivery.provider';
import { SmsDeliveryProvider } from './providers/sms-delivery.provider';
import { WebhookDeliveryProvider } from './providers/webhook-delivery.provider';
import { PushDeliveryProvider } from './providers/push-delivery.provider';
import { WebSocketService } from '../websocket/websocket.service';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationDelivery)
    private readonly deliveryRepository: Repository<NotificationDelivery>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly webSocketService: WebSocketService,
    private readonly emailProvider: EmailDeliveryProvider,
    private readonly smsProvider: SmsDeliveryProvider,
    private readonly webhookProvider: WebhookDeliveryProvider,
    private readonly pushProvider: PushDeliveryProvider
  ) {}

  async processNotification(notification: Notification): Promise<void> {
    try {
      this.logger.debug(`Processing notification ${notification.id} of type ${notification.type}`);

      // Update notification status
      notification.status = ExecutionStatus.RUNNING;
      await this.notificationRepository.save(notification);

      // Create delivery records based on notification type
      const deliveries = await this.createDeliveryRecords(notification);

      // Process each delivery
      const deliveryPromises = deliveries.map((delivery) => this.processDelivery(delivery));

      const results = await Promise.allSettled(deliveryPromises);

      // Check overall notification status
      const hasSuccessfulDelivery = results.some((result) => result.status === 'fulfilled');
      const allFailed = results.every((result) => result.status === 'rejected');

      if (hasSuccessfulDelivery) {
        notification.markAsSent();
      } else if (allFailed) {
        notification.markAsFailed('All delivery attempts failed');
      }

      await this.notificationRepository.save(notification);

      // Send real-time update
      await this.webSocketService.publishEvent(AgentEventType.NOTIFICATION_SENT, {
        targetType: EventTargetType.USER,
        targetId: notification.userId,
        data: {
          type: 'notification_processed',
          notificationId: notification.id,
          status: notification.status,
          deliveryCount: deliveries.length,
        },
      });

      // Emit completion event
      this.eventEmitter.emit(AgentEventType.NOTIFICATION_SENT, {
        notificationId: notification.id,
        userId: notification.userId,
        organizationId: notification.organizationId,
        status: notification.status,
        deliveryResults: results,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Failed to process notification ${notification.id}: ${errorMessage}`,
        errorStack
      );

      notification.markAsFailed(errorMessage);
      await this.notificationRepository.save(notification);

      this.eventEmitter.emit(AgentEventType.NOTIFICATION_FAILED, {
        notificationId: notification.id,
        userId: notification.userId,
        organizationId: notification.organizationId,
        error: errorMessage,
      });
    }
  }

  async scheduleDelivery(delivery: NotificationDelivery): Promise<void> {
    // This would integrate with a job queue system like Bull
    // For now, we'll process immediately if retry time has passed
    if (!delivery.nextRetryAt || delivery.nextRetryAt <= new Date()) {
      await this.processDelivery(delivery);
    }
  }

  private async createDeliveryRecords(notification: Notification): Promise<NotificationDelivery[]> {
    const deliveries: NotificationDelivery[] = [];

    // Create delivery record for the notification type
    const delivery = this.deliveryRepository.create({
      notificationId: notification.id,
      type: notification.type,
      recipient: notification.userId,
      status: ExecutionStatus.PENDING,
      retryCount: 0,
      maxRetries: notification.maxRetries || 3,
      deliveryData: this.buildDeliveryData(notification),
    });

    deliveries.push(delivery);

    // If notification has delivery config, create additional delivery records
    if (notification.deliveryConfig) {
      if (notification.deliveryConfig.email && notification.type !== NotificationType.EMAIL) {
        const emailDelivery = this.deliveryRepository.create({
          notificationId: notification.id,
          type: NotificationType.EMAIL,
          recipient: notification.deliveryConfig.email.to.join(','),
          status: ExecutionStatus.PENDING,
          retryCount: 0,
          maxRetries: notification.maxRetries || 3,
          deliveryData: {
            email: {
              toAddresses: notification.deliveryConfig.email.to,
              ccAddresses: notification.deliveryConfig.email.cc,
              bccAddresses: notification.deliveryConfig.email.bcc,
            },
          },
        });
        deliveries.push(emailDelivery);
      }

      if (notification.deliveryConfig.sms && notification.type !== NotificationType.SMS) {
        const smsDelivery = this.deliveryRepository.create({
          notificationId: notification.id,
          type: NotificationType.SMS,
          recipient: notification.deliveryConfig.sms.to.join(','),
          status: ExecutionStatus.PENDING,
          retryCount: 0,
          maxRetries: notification.maxRetries || 3,
          deliveryData: {
            sms: {
              toNumber: notification.deliveryConfig.sms.to[0], // SMS typically to one number
            },
          },
        });
        deliveries.push(smsDelivery);
      }

      if (notification.deliveryConfig.webhook && notification.type !== NotificationType.WEBHOOK) {
        const webhookDelivery = this.deliveryRepository.create({
          notificationId: notification.id,
          type: NotificationType.WEBHOOK,
          recipient: notification.deliveryConfig.webhook.url,
          status: ExecutionStatus.PENDING,
          retryCount: 0,
          maxRetries: notification.maxRetries || 3,
          deliveryData: {
            webhook: {
              url: notification.deliveryConfig.webhook.url,
              method: notification.deliveryConfig.webhook.method,
              requestHeaders: notification.deliveryConfig.webhook.headers,
            },
          },
        });
        deliveries.push(webhookDelivery);
      }

      if (notification.deliveryConfig.push && notification.type !== NotificationType.PUSH) {
        const pushDelivery = this.deliveryRepository.create({
          notificationId: notification.id,
          type: NotificationType.PUSH,
          recipient: notification.deliveryConfig.push.tokens.join(','),
          status: ExecutionStatus.PENDING,
          retryCount: 0,
          maxRetries: notification.maxRetries || 3,
          deliveryData: {
            push: {
              deviceTokens: notification.deliveryConfig.push.tokens,
              badge: notification.deliveryConfig.push.badge,
              sound: notification.deliveryConfig.push.sound,
            },
          },
        });
        deliveries.push(pushDelivery);
      }
    }

    return this.deliveryRepository.save(deliveries);
  }

  private buildDeliveryData(notification: Notification): any {
    switch (notification.type) {
      case NotificationType.EMAIL:
        return {
          email: {
            subject: notification.title,
            toAddresses: notification.deliveryConfig?.email?.to || [notification.userId],
          },
        };
      case NotificationType.SMS:
        return {
          sms: {
            toNumber: notification.deliveryConfig?.sms?.to?.[0] || notification.userId,
          },
        };
      case NotificationType.WEBHOOK:
        return {
          webhook: {
            url: notification.deliveryConfig?.webhook?.url || '',
            method: notification.deliveryConfig?.webhook?.method || 'POST',
          },
        };
      case NotificationType.PUSH:
        return {
          push: {
            deviceTokens: notification.deliveryConfig?.push?.tokens || [],
          },
        };
      case NotificationType.IN_APP:
        return {};
      default:
        return {};
    }
  }

  async processDelivery(delivery: NotificationDelivery): Promise<void> {
    const startTime = Date.now();

    try {
      delivery.status = ExecutionStatus.RUNNING;
      await this.deliveryRepository.save(delivery);

      let result: any;

      switch (delivery.type) {
        case NotificationType.EMAIL:
          result = await this.emailProvider.sendEmail(delivery);
          break;
        case NotificationType.SMS:
          result = await this.smsProvider.sendSms(delivery);
          break;
        case NotificationType.WEBHOOK:
          result = await this.webhookProvider.sendWebhook(delivery);
          break;
        case NotificationType.PUSH:
          result = await this.pushProvider.sendPush(delivery);
          break;
        case NotificationType.IN_APP:
          // In-app notifications are delivered via WebSocket
          await this.webSocketService.publishEvent(AgentEventType.NOTIFICATION_SENT, {
            targetType: EventTargetType.USER,
            targetId: delivery.recipient,
            data: {
              type: 'in_app_notification',
              notificationId: delivery.notificationId,
              title: delivery.notification?.title,
              message: delivery.notification?.message,
              priority: delivery.notification?.priority,
            },
          });
          result = { success: true };
          break;
        default:
          throw new Error(`Unsupported delivery type: ${delivery.type}`);
      }

      if (result.success) {
        delivery.markAsDelivered(result);
        delivery.responseTime = Date.now() - startTime;
      } else {
        throw new Error(result.error || 'Delivery failed');
      }

      await this.deliveryRepository.save(delivery);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = error instanceof Error && 'code' in error ? (error as any).code : undefined;
      const errorResponse = error instanceof Error && 'response' in error ? (error as any).response : undefined;
      
      delivery.responseTime = Date.now() - startTime;
      delivery.markAsFailed(errorMessage, errorCode, errorResponse);  

      this.logger.error(
        `Failed to deliver notification ${delivery.notificationId} via ${delivery.type}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );

      // Schedule retry if possible
      if (delivery.canRetry()) {
        const retryDelay = Math.pow(2, delivery.retryCount) * 1000; // Exponential backoff
        delivery.nextRetryAt = new Date(Date.now() + retryDelay);
        await this.deliveryRepository.save(delivery);
      } else {
        // Mark as permanently failed - don't set nextRetryAt
        await this.deliveryRepository.save(delivery);
      }
    }
  }
}
