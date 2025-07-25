import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Notification } from './notification.entity';
import { NotificationType, ExecutionStatus } from '@shared/enums';

@Entity('notification_deliveries')
@Index(['notificationId', 'type'])
@Index(['status', 'createdAt'])
@Index(['deliveredAt'])
@Index(['nextRetryAt'])
export class NotificationDelivery extends BaseEntity {
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ type: 'varchar', length: 500 })
  recipient: string;

  @Column({ type: 'jsonb', nullable: true })
  deliveryData: {
    email?: {
      messageId?: string;
      subject?: string;
      fromAddress?: string;
      toAddresses?: string[];
      ccAddresses?: string[];
      bccAddresses?: string[];
    };
    sms?: {
      messageId?: string;
      fromNumber?: string;
      toNumber?: string;
      segments?: number;
    };
    webhook?: {
      url?: string;
      method?: string;
      statusCode?: number;
      responseTime?: number;
      requestHeaders?: Record<string, string>;
      responseHeaders?: Record<string, string>;
    };
    push?: {
      messageId?: string;
      deviceTokens?: string[];
      badge?: number;
      sound?: string;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  providerResponse: Record<string, any>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerId: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  errorCode: string;

  @Column({ type: 'int', nullable: true })
  responseTime: number; // milliseconds

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  cost: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ type: 'uuid' })
  notificationId: string;

  @ManyToOne(() => Notification, (notification) => notification.deliveries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'notificationId' })
  notification: Notification;

  // Helper methods
  isDelivered(): boolean {
    return this.status === ExecutionStatus.COMPLETED && !!this.deliveredAt;
  }

  isFailed(): boolean {
    return this.status === ExecutionStatus.FAILED;
  }

  isPending(): boolean {
    return this.status === ExecutionStatus.PENDING;
  }

  isRunning(): boolean {
    return this.status === ExecutionStatus.RUNNING;
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries && this.isFailed();
  }

  markAsSent(): void {
    this.status = ExecutionStatus.RUNNING;
    this.sentAt = new Date();
  }

  markAsDelivered(providerResponse?: any): void {
    this.status = ExecutionStatus.COMPLETED;
    this.deliveredAt = new Date();
    if (providerResponse) {
      this.providerResponse = providerResponse;
    }
  }

  markAsFailed(error: string, errorCode?: string, providerResponse?: any): void {
    this.status = ExecutionStatus.FAILED;
    this.failedAt = new Date();
    this.errorMessage = error;
    this.errorCode = errorCode || 'DELIVERY_FAILED';
    this.retryCount++;

    if (providerResponse) {
      this.providerResponse = providerResponse;
    }
  }

  getDeliveryTime(): number | null {
    if (this.sentAt && this.deliveredAt) {
      return this.deliveredAt.getTime() - this.sentAt.getTime();
    }
    return null;
  }

  getRetryDelay(): number | null {
    if (this.nextRetryAt) {
      return Math.max(0, this.nextRetryAt.getTime() - Date.now());
    }
    return null;
  }
}
