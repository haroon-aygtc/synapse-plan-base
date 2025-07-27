import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, NotificationDelivery, NotificationPreference } from '@database/entities';
import {
  NotificationType,
  ExecutionStatus,
  NotificationPriority,
  AgentEventType,
  EventTargetType,
} from '@shared/enums';
import { NotificationDeliveryService } from './notification-delivery.service';
import { WebSocketService } from '../websocket/websocket.service';

// Notification scheduler service interfaces could be defined here if needed

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
    private readonly eventEmitter: EventEmitter2
  ) {}

  onModuleInit() {
    this.logger.log('Notification Scheduler Service initialized');
    // Delay initialization to ensure database is ready
    setTimeout(async () => {
      try {
        await this.processScheduledNotifications();
        await this.retryFailedDeliveries();
      } catch (error) {
        this.logger.warn('Failed to initialize notification scheduler, will retry later', error);
      }
    }, 5000); // Wait 5 seconds for database to be ready
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

      this.logger.debug(`Processing ${scheduledNotifications.length} scheduled notifications`);

      for (const notification of scheduledNotifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      // Check if it's a metadata error and log appropriately
      if (error instanceof Error && error.message && error.message.includes('No metadata for')) {
        this.logger.debug('Database not ready yet, skipping notification processing');
        return;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error processing scheduled notifications: ${errorMessage}`, errorStack);
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

      this.logger.debug(`Retrying ${failedDeliveries.length} failed deliveries`);

      for (const delivery of failedDeliveries) {
        if (delivery.canRetry()) {
          await this.retryDelivery(delivery);
        } else {
          this.logger.warn(
            `Delivery ${delivery.id} exceeded max retries, marking as permanently failed`
          );
          await this.markDeliveryAsPermanentlyFailed(delivery);
        }
      }
    } catch (error) {
      // Check if it's a metadata error and log appropriately
      if (error.message && error.message.includes('No metadata for')) {
        this.logger.debug('Database not ready yet, skipping delivery retries');
        return;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error retrying failed deliveries: ${errorMessage}`, errorStack);
    }
  }

  // Clean up old notifications every day at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.notificationRepository.delete({
        createdAt: LessThan(thirtyDaysAgo),
        status: In([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED]),
      });

      this.logger.log(`Cleaned up ${result.affected} old notifications older than 30 days`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error cleaning up old notifications: ${errorMessage}`, errorStack);
    }
  }

  async scheduleNotification(notification: Notification, scheduledFor?: Date): Promise<void> {
    if (scheduledFor) {
      notification.scheduledFor = scheduledFor;
      notification.status = ExecutionStatus.PENDING;
      await this.notificationRepository.save(notification);
    } else {
      // Process immediately
      await this.processNotification(notification);
    }
  }

  private async processNotification(notification: Notification): Promise<void> {
    try {
      // Get user preferences
      const preference = await this.preferenceRepository.findOne({
        where: { userId: notification.userId },
      });

             if (!preference) {
         // Use default preferences
         const defaultPreference = this.preferenceRepository.create({
           eventType: 'general',
           type: NotificationType.IN_APP,
           isEnabled: true,
           userId: notification.userId,
           organizationId: notification.organizationId,
           settings: {
             frequency: 'immediate',
             quietHours: {
               enabled: false,
               startTime: '22:00',
               endTime: '08:00',
               timezone: 'UTC',
             },
             batching: {
               enabled: false,
               maxBatchSize: 10,
               batchWindow: 5,
             },
             filters: {
               priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
             },
           },
         });
         await this.processNotificationForPreference(notification, defaultPreference);
      } else {
        await this.processNotificationForPreference(notification, preference);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Error processing notification ${notification.id}: ${errorMessage}`,
        errorStack
      );
      notification.status = ExecutionStatus.FAILED;
      notification.errorMessage = errorMessage;
      await this.notificationRepository.save(notification);
    }
  }

  private async processNotificationForPreference(
    notification: Notification,
    preference: NotificationPreference
  ): Promise<void> {
    // Check if notification matches filters
    if (!preference.matchesFilters({
      priority: notification.priority,
      sourceModule: notification.sourceModule,
      title: notification.title,
      message: notification.message,
    })) {
      this.logger.debug(`Notification ${notification.id} filtered out by preferences, skipping`);
      return;
    }

    // Check quiet hours
    if (preference.isInQuietHours()) {
      await this.scheduleAfterQuietHours(notification, preference);
      return;
    }

    // Handle batching
    if (preference.shouldBatch() && notification.priority < NotificationPriority.HIGH) {
      await this.addToBatch(notification, preference);
    } else {
      await this.sendNotification(notification, preference);
    }
  }

  private async addToBatch(
    notification: Notification,
    preference: NotificationPreference
  ): Promise<void> {
    const batchKey = `${notification.userId}-${notification.type}-${notification.priority}`;
    
    if (!this.batchingQueues.has(batchKey)) {
      this.batchingQueues.set(batchKey, []);
    }

    const queue = this.batchingQueues.get(batchKey);
    if (!queue) {
      throw new Error(`Failed to create batch queue for key: ${batchKey}`);
    }
    
    queue.push(notification);

    // Clear existing timer if any
    if (this.batchingTimers.has(batchKey)) {
      clearTimeout(this.batchingTimers.get(batchKey)!);
      this.batchingTimers.delete(batchKey);
    }

    // Set new timer or send if batch is full
    if (queue.length >= preference.getMaxBatchSize()) {
      await this.sendBatch(batchKey, preference);
    } else {
              const timer = setTimeout(
          () => this.sendBatch(batchKey, preference),
          preference.getBatchWindow() * 60 * 1000
        );
      this.batchingTimers.set(batchKey, timer);
    }
  }

  private async sendBatch(batchKey: string, preference: NotificationPreference): Promise<void> {
    const queue = this.batchingQueues.get(batchKey);
    if (!queue || queue.length === 0) {
      return;
    }

    try {
      // Create a batched notification
      const batchedNotification = this.notificationRepository.create({
        title: `You have ${queue.length} new notifications`,
        message: `You have ${queue.length} new notifications waiting for you.`,
        type: NotificationType.IN_APP,
        priority: NotificationPriority.MEDIUM,
        userId: queue[0].userId,
        organizationId: queue[0].organizationId,
        data: {
          batchedNotifications: queue.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            priority: n.priority,
            createdAt: n.createdAt,
          })),
        },
      });

      await this.sendNotification(batchedNotification, preference);
      this.logger.debug(`Sent batch of ${queue.length} notifications for ${batchKey}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error sending batch for ${batchKey}: ${errorMessage}`, errorStack);

      // Mark notifications as failed
      for (const notification of queue) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        notification.markAsFailed(errorMsg);
        await this.notificationRepository.save(notification);
      }
    } finally {
      // Clean up
      this.batchingQueues.delete(batchKey);
      if (this.batchingTimers.has(batchKey)) {
        clearTimeout(this.batchingTimers.get(batchKey)!);
        this.batchingTimers.delete(batchKey);
      }
    }
  }

  private async sendNotification(
    notification: Notification,
    preference: NotificationPreference
  ): Promise<void> {
    try {
      await this.deliveryService.processNotification(notification);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Error sending notification ${notification.id}: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  private async retryDelivery(delivery: NotificationDelivery): Promise<void> {
    try {
      await this.deliveryService.processDelivery(delivery);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error retrying delivery ${delivery.id}: ${errorMessage}`, errorStack);
    }
  }

  private async markDeliveryAsPermanentlyFailed(delivery: NotificationDelivery): Promise<void> {
    delivery.markAsFailed('Maximum retry attempts exceeded', 'MAX_RETRIES_EXCEEDED');
    // Don't set nextRetryAt to avoid type issues
    await this.deliveryRepository.save(delivery);

    // Emit event for monitoring
    this.eventEmitter.emit(AgentEventType.NOTIFICATION_FAILED, {
      deliveryId: delivery.id,
      notificationId: delivery.notificationId,
      reason: 'MAX_RETRIES_EXCEEDED',
    });
  }

  private async scheduleAfterQuietHours(
    notification: Notification,
    preference: NotificationPreference
  ): Promise<void> {
    const nextQuietHoursEnd = this.getNextQuietHoursEnd(preference);
    notification.scheduledFor = nextQuietHoursEnd;
    notification.status = ExecutionStatus.PENDING;
    await this.notificationRepository.save(notification);

    this.logger.debug(
      `Scheduled notification ${notification.id} for after quiet hours: ${nextQuietHoursEnd}`
    );
  }

  private async sendRealTimeNotification(notification: Notification): Promise<void> {
    try {
      // Send to organization
      await this.webSocketService.publishEvent(AgentEventType.NOTIFICATION_SENT, {
        targetType: EventTargetType.TENANT,
        targetId: notification.organizationId,
        data: {
          type: 'notification_created',
          notification: {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            type: notification.type,
            createdAt: notification.createdAt,
          },
        },
      });

      // Also send to specific user
      await this.webSocketService.publishEvent(AgentEventType.NOTIFICATION_SENT, {
        targetType: EventTargetType.USER,
        targetId: notification.userId,
        data: {
          type: 'notification_created',
          notification: {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            type: notification.type,
            createdAt: notification.createdAt,
          },
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error sending real-time notification: ${errorMessage}`, errorStack);
    }
  }

  private mapPriorityToNotificationType(
    priority: NotificationPriority
  ): 'info' | 'warning' | 'error' | 'success' {
    switch (priority) {
      case NotificationPriority.LOW:
        return 'info';
      case NotificationPriority.MEDIUM:
        return 'info';
      case NotificationPriority.HIGH:
        return 'warning';
      case NotificationPriority.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }

  async getBatchingStats(): Promise<{
    totalQueues: number;
    totalPendingNotifications: number;
    queueDetails: Array<{
      key: string;
      count: number;
      oldestNotification: Date;
    }>;
  }> {
    const queueDetails = Array.from(this.batchingQueues.entries()).map(([key, queue]) => ({
      key,
      count: queue.length,
      oldestNotification: queue[0]?.createdAt || new Date(),
    }));

    return {
      totalQueues: this.batchingQueues.size,
      totalPendingNotifications: Array.from(this.batchingQueues.values()).reduce(
        (sum, queue) => sum + queue.length,
        0
      ),
      queueDetails,
    };
  }

  async flushAllBatches(): Promise<void> {
    const batchKeys = Array.from(this.batchingQueues.keys());
    
    for (const batchKey of batchKeys) {
      const preference = await this.preferenceRepository.findOne({
        where: { userId: batchKey.split('-')[0] },
      });
      
      if (preference) {
        await this.sendBatch(batchKey, preference);
      }
    }
  }

  private isInQuietHours(preference: NotificationPreference): boolean {
    return preference.isInQuietHours();
  }

  private getNextQuietHoursEnd(preference: NotificationPreference): Date {
    const now = new Date();
    const endTime = preference.settings?.quietHours?.endTime || '08:00';
    const timezone = preference.settings?.quietHours?.timezone || 'UTC';
    
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const nextEnd = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    nextEnd.setHours(endHour, endMinute, 0, 0);
    
    if (nextEnd <= now) {
      nextEnd.setDate(nextEnd.getDate() + 1);
    }
    
    return nextEnd;
  }
}
