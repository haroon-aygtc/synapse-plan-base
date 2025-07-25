import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, NotificationDelivery } from '@database/entities';
import { NotificationType, ExecutionStatus, EventType, EventTargetType } from '@shared/enums';
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
      await this.webSocketService.publishEvent(EventType.NOTIFICATION_SENT, {
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
      this.eventEmitter.emit(EventType.NOTIFICATION_SENT, {
        notificationId: notification.id,
        userId: notification.userId,
        organizationId: notification.organizationId,
        status: notification.status,
        deliveryResults: results,
      });
    } catch (error) {
      this.logger.error(
        `Failed to process notification ${notification.id}: ${error.message}`,
        error.stack
      );

      notification.markAsFailed(error.message);
      await this.notificationRepository.save(notification);

      this.eventEmitter.emit(EventType.NOTIFICATION_FAILED, {
        notificationId: notification.id,
        userId: notification.userId,
        organizationId: notification.organizationId,
        error: error.message,
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

    switch (notification.type) {
      case NotificationType.EMAIL:
        if (notification.deliveryConfig?.email) {
          const emailDelivery = this.deliveryRepository.create({
            notificationId: notification.id,
            type: NotificationType.EMAIL,
            recipient: notification.deliveryConfig.email.to.join(', '),
            status: ExecutionStatus.PENDING,
            deliveryData: {
              email: {
                subject: notification.title,
                toAddresses: notification.deliveryConfig.email.to,
                ccAddresses: notification.deliveryConfig.email.cc,
                bccAddresses: notification.deliveryConfig.email.bcc,
              },
            },
          });
          deliveries.push(emailDelivery);
        }
        break;

      case NotificationType.SMS:
        if (notification.deliveryConfig?.sms) {
          for (const phoneNumber of notification.deliveryConfig.sms.to) {
            const smsDelivery = this.deliveryRepository.create({
              notificationId: notification.id,
              type: NotificationType.SMS,
              recipient: phoneNumber,
              status: ExecutionStatus.PENDING,
              deliveryData: {
                sms: {
                  toNumber: phoneNumber,
                },
              },
            });
            deliveries.push(smsDelivery);
          }
        }
        break;

      case NotificationType.WEBHOOK:
        if (notification.deliveryConfig?.webhook) {
          const webhookDelivery = this.deliveryRepository.create({
            notificationId: notification.id,
            type: NotificationType.WEBHOOK,
            recipient: notification.deliveryConfig.webhook.url,
            status: ExecutionStatus.PENDING,
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
        break;

      case NotificationType.PUSH:
        if (notification.deliveryConfig?.push) {
          const pushDelivery = this.deliveryRepository.create({
            notificationId: notification.id,
            type: NotificationType.PUSH,
            recipient: notification.deliveryConfig.push.tokens.join(', '),
            status: ExecutionStatus.PENDING,
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
        break;

      case NotificationType.IN_APP:
        // In-app notifications are delivered via WebSocket
        await this.webSocketService.publishEvent(EventType.NOTIFICATION_SENT, {
          targetType: EventTargetType.USER,
          targetId: notification.userId,
          data: {
            type: 'new_notification',
            notification: {
              id: notification.id,
              title: notification.title,
              message: notification.message,
              priority: notification.priority,
              createdAt: notification.createdAt,
              data: notification.data,
            },
          },
        });

        // Create a delivery record for tracking
        const inAppDelivery = this.deliveryRepository.create({
          notificationId: notification.id,
          type: NotificationType.IN_APP,
          recipient: notification.userId,
          status: ExecutionStatus.COMPLETED,
          deliveredAt: new Date(),
        });
        deliveries.push(inAppDelivery);
        break;
    }

    return this.deliveryRepository.save(deliveries);
  }

  private async processDelivery(delivery: NotificationDelivery): Promise<void> {
    const startTime = Date.now();

    try {
      delivery.markAsSent();
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
          // Already handled in createDeliveryRecords
          result = { success: true };
          break;
        default:
          throw new Error(`Unsupported delivery type: ${delivery.type}`);
      }

      delivery.responseTime = Date.now() - startTime;
      delivery.markAsDelivered(result);

      this.logger.debug(
        `Successfully delivered notification ${delivery.notificationId} via ${delivery.type}`
      );
    } catch (error) {
      delivery.responseTime = Date.now() - startTime;
      delivery.markAsFailed(error.message, error.code, error.response);

      this.logger.error(
        `Failed to deliver notification ${delivery.notificationId} via ${delivery.type}: ${error.message}`,
        error.stack
      );

      // Schedule retry if possible
      if (delivery.canRetry()) {
        this.logger.debug(
          `Scheduling retry ${delivery.retryCount}/${delivery.maxRetries} for delivery ${delivery.id}`
        );
      }
    } finally {
      await this.deliveryRepository.save(delivery);
    }
  }
}
