import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Notification,
  NotificationDelivery,
  NotificationPreference,
} from '@database/entities';
import {
  NotificationType,
  ExecutionStatus,
  NotificationPriority,
} from '@shared/enums';
import { NotificationDeliveryService } from './notification-delivery.service';
import { WebSocketService } from '../websocket/websocket.service';

interface BatchedNotification {
  userId: string;
  organizationId: string;
  type: NotificationType;
  notifications: Notification[];
  preference: NotificationPreference;
}

@Injectable()
export class NotificationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private readonly batchingQueues = new Map<string, Notification[]>();
  private readonly batchingTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationDelivery)
    private readonly deliveryRepository: Repository<NotificationDelivery>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly webSocketService: WebSocketService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.logger.log('Notification Scheduler Service initialized');
    this.processScheduledNotifications();
    this.retryFailedDeliveries();
  }

  // Process scheduled notifications every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    try {
      const scheduledNotifications = await this.notificationRepository.find({
        where: {
          status: ExecutionStatus.PENDING,
          scheduledFor: LessThan(new Date()),
        },
        relations: ['user', 'organization', 'template'],
        take: 100, // Process in batches
      });

      if (scheduledNotifications.length === 0) {
        return;
      }

      this.logger.debug(
        `Processing ${scheduledNotifications.length} scheduled notifications`,
      );

      for (const notification of scheduledNotifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      this.logger.error(
        `Error processing scheduled notifications: ${error.message}`,
        error.stack,
      );
    }
  }

  // Retry failed deliveries every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedDeliveries(): Promise<void> {
    try {
      const failedDeliveries = await this.deliveryRepository.find({
        where: {
          status: ExecutionStatus.FAILED,
          nextRetryAt: LessThan(new Date()),
        },
        relations: ['notification', 'notification.user', 'notification.organization'],
        take: 50, // Process in smaller batches for retries
      });

      if (failedDeliveries.length === 0) {
        return;
      }

      this.logger.debug(
        `Retrying ${failedDeliveries.length} failed deliveries`,
      );

      for (const delivery of failedDeliveries) {
        if (delivery.canRetry()) {
          await this.retryDelivery(delivery);
        } else {
          this.logger.warn(
            `Delivery ${delivery.id} exceeded max retries, marking as permanently failed`,
          );
          await this.markDeliveryAsPermanentlyFailed(delivery);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error retrying failed deliveries: ${error.message}`,
        error.stack,
      );
    }
  }

  // Clean up old notifications every day at 2 AM
  @Cron('0 2 * * *')
  async cleanupOldNotifications(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep notifications for 30 days

      const result = await this.notificationRepository.delete({
        createdAt: LessThan(cutoffDate),
        status: In([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED]),
      });

      this.logger.log(
        `Cleaned up ${result.affected} old notifications older than 30 days`,
      );
    } catch (error) {
      this.logger.error(
        `Error cleaning up old notifications: ${error.message}`,
        error.stack,
      );
    }
  }

  async scheduleNotification(
    notification: Notification,
    scheduledFor?: Date,
  ): Promise<void> {
    if (scheduledFor) {
      notification.scheduledFor = scheduledFor;
      await this.notificationRepository.save(notification);
      this.logger.debug(
        `Notification ${notification.id} scheduled for ${scheduledFor.toISOString()}`,
      );
    } else {
      await this.processNotification(notification);
    }
  }

  private async processNotification(notification: Notification): Promise<void> {
    try {
      // Get user preferences for this notification type
      const preferences = await this.preferenceRepository.find({
        where: {
          userId: notification.userId,
          organizationId: notification.organizationId,
          eventType: notification.eventType || 'general',
          isEnabled: true,
        },
      });

      if (preferences.length === 0) {
        this.logger.debug(
          `No enabled preferences found for notification ${notification.id}`,
        );
        notification.status = ExecutionStatus.COMPLETED;
        await this.notificationRepository.save(notification);
        return;
      }

      // Filter preferences based on notification filters
      const validPreferences = preferences.filter((pref) =>
        pref.matchesFilters({
          priority: notification.priority,
          sourceModule: notification.sourceModule,
          title: notification.title,
          message: notification.message,
        }),
      );

      if (validPreferences.length === 0) {
        this.logger.debug(
          `Notification ${notification.id} filtered out by user preferences`,
        );
        notification.status = ExecutionStatus.COMPLETED;
        await this.notificationRepository.save(notification);
        return;
      }

      // Process each valid preference
      for (const preference of validPreferences) {
        await this.processNotificationForPreference(notification, preference);
      }

      // Send real-time update for in-app notifications
      if (validPreferences.some((p) => p.type === NotificationType.IN_APP)) {
        await this.sendRealTimeNotification(notification);
      }

      notification.status = ExecutionStatus.RUNNING;
      await this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(
        `Error processing notification ${notification.id}: ${error.message}`,
        error.stack,
      );
      notification.status = ExecutionStatus.FAILED;
      notification.errorMessage = error.message;
      await this.notificationRepository.save(notification);
    }
  }

  private async processNotificationForPreference(
    notification: Notification,
    preference: NotificationPreference,
  ): Promise<void> {
    // Check quiet hours
    if (preference.isInQuietHours()) {
      this.logger.debug(
        `Notification ${notification.id} delayed due to quiet hours`,
      );
      await this.scheduleAfterQuietHours(notification, preference);
      return;
    }

    // Handle batching
    if (preference.shouldBatch()) {
      await this.addToBatch(notification, preference);
      return;
    }

    // Send immediately
    await this.sendNotification(notification, preference);
  }

  private async addToBatch(
    notification: Notification,
    preference: NotificationPreference,
  ): Promise<void> {
    const batchKey = `${preference.userId}-${preference.type}-${preference.organizationId}`;
    
    if (!this.batchingQueues.has(batchKey)) {
      this.batchingQueues.set(batchKey, []);
    }

    const queue = this.batchingQueues.get(batchKey);
    queue.push(notification);

    // Clear existing timer if any
    if (this.batchingTimers.has(batchKey)) {
      clearTimeout(this.batchingTimers.get(batchKey));
    }

    // Set new timer or send if batch is full
    if (queue.length >= preference.getMaxBatchSize()) {
      await this.sendBatch(batchKey, preference);
    } else {
      const timer = setTimeout(
        () => this.sendBatch(batchKey, preference),
        preference.getBatchWindow() * 60 * 1000, // Convert minutes to milliseconds
      );
      this.batchingTimers.set(batchKey, timer);
    }
  }

  private async sendBatch(
    batchKey: string,
    preference: NotificationPreference,
  ): Promise<void> {
    const queue = this.batchingQueues.get(batchKey);
    if (!queue || queue.length === 0) {
      return;
    }

    try {
      // Create batched notification
      const batchedNotification: BatchedNotification = {
        userId: preference.userId,
        organizationId: preference.organizationId,
        type: preference.type,
        notifications: [...queue],
        preference,
      };

      await this.deliveryService.sendBatchedNotification(batchedNotification);

      // Mark individual notifications as sent
      for (const notification of queue) {
        notification.markAsSent();
        await this.notificationRepository.save(notification);
      }

      this.logger.debug(
        `Sent batch of ${queue.length} notifications for ${batchKey}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending batch for ${batchKey}: ${error.message}`,
        error.stack,
      );

      // Mark notifications as failed
      for (const notification of queue) {
        notification.markAsFailed(error.message);
        await this.notificationRepository.save(notification);
      }
    } finally {
      // Clean up
      this.batchingQueues.delete(batchKey);
      if (this.batchingTimers.has(batchKey)) {
        clearTimeout(this.batchingTimers.get(batchKey));
        this.batchingTimers.delete(batchKey);
      }
    }
  }

  private async sendNotification(
    notification: Notification,
    preference: NotificationPreference,
  ): Promise<void> {
    try {
      const delivery = await this.deliveryService.createDelivery(
        notification,
        preference,
      );

      await this.deliveryService.sendNotification(delivery.id);

      this.logger.debug(
        `Sent notification ${notification.id} via ${preference.type}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending notification ${notification.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async retryDelivery(delivery: NotificationDelivery): Promise<void> {
    try {
      await this.deliveryService.retryFailedDeliveries(delivery.id);
      this.logger.debug(`Retried delivery ${delivery.id}`);
    } catch (error) {
      this.logger.error(
        `Error retrying delivery ${delivery.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async markDeliveryAsPermanentlyFailed(
    delivery: NotificationDelivery,
  ): Promise<void> {
    delivery.markAsFailed(
      'Maximum retry attempts exceeded',
      'MAX_RETRIES_EXCEEDED',
    );
    delivery.nextRetryAt = null;
    await this.deliveryRepository.save(delivery);

    // Emit event for monitoring
    this.eventEmitter.emit('notification.delivery.permanently_failed', {
      deliveryId: delivery.id,
      notificationId: delivery.notificationId,
      type: delivery.type,
      recipient: delivery.recipient,
    });
  }

  private async scheduleAfterQuietHours(
    notification: Notification,
    preference: NotificationPreference,
  ): Promise<void> {
    const quietHours = preference.settings?.quietHours;
    if (!quietHours) return;

    const now = new Date();
    const userDate = new Date(
      now.toLocaleString('en-US', { timeZone: quietHours.timezone }),
    );

    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
    const endTime = new Date(userDate);
    endTime.setHours(endHour, endMin, 0, 0);

    // If end time is tomorrow (quiet hours span midnight)
    if (endTime <= userDate) {
      endTime.setDate(endTime.getDate() + 1);
    }

    notification.scheduledFor = endTime;
    await this.notificationRepository.save(notification);

    this.logger.debug(
      `Notification ${notification.id} rescheduled after quiet hours to ${endTime.toISOString()}`,
    );
  }

  private async sendRealTimeNotification(
    notification: Notification,
  ): Promise<void> {
    try {
      await this.webSocketService.sendSystemNotification(
        notification.organizationId,
        {
          type: this.mapPriorityToNotificationType(notification.priority),
          title: notification.title,
          message: notification.message,
          timestamp: new Date(),
        },
      );

      // Also send to specific user
      await this.webSocketService.broadcastToUser(
        notification.userId,
        'notification_received',
        {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          data: notification.data,
          createdAt: notification.createdAt,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error sending real-time notification: ${error.message}`,
        error.stack,
      );
    }
  }

  private mapPriorityToNotificationType(
    priority: NotificationPriority,
  ): 'info' | 'warning' | 'error' | 'success' {
    switch (priority) {
      case NotificationPriority.CRITICAL:
        return 'error';
      case NotificationPriority.HIGH:
        return 'warning';
      case NotificationPriority.LOW:
        return 'success';
      default:
        return 'info';
    }
  }

  // Public methods for external use
  async getBatchingStats(): Promise<{
    totalQueues: number;
    totalPendingNotifications: number;
    queueDetails: Array<{
      key: string;
      count: number;
      oldestNotification: Date;
    }>;
  }> {
    const queueDetails = [];
    let totalPendingNotifications = 0;

    for (const [key, queue] of this.batchingQueues.entries()) {
      const oldestNotification = queue.reduce((oldest, notification) => {
        return notification.createdAt < oldest ? notification.createdAt : oldest;
      }, queue[0]?.createdAt || new Date());

      queueDetails.push({
        key,
        count: queue.length,
        oldestNotification,
      });

      totalPendingNotifications += queue.length;
    }

    return {
      totalQueues: this.batchingQueues.size,
      totalPendingNotifications,
      queueDetails,
    };
  }

  async flushAllBatches(): Promise<void> {
    const promises = [];
    
    for (const [batchKey] of this.batchingQueues.entries()) {
      // We need the preference to send the batch, so we'll get it from the first notification
      const queue = this.batchingQueues.get(batchKey);
      if (queue && queue.length > 0) {
        const firstNotification = queue[0];
        const preference = await this.preferenceRepository.findOne({
          where: {
            userId: firstNotification.userId,
            organizationId: firstNotification.organizationId,
          },
        });
        
        if (preference) {
          promises.push(this.sendBatch(batchKey, preference));
        }
      }
    }

    await Promise.all(promises);
    this.logger.log('Flushed all batched notifications');
  }
}
