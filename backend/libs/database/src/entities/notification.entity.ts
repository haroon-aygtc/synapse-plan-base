import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { NotificationDelivery } from './notification-delivery.entity';
import { NotificationTemplate } from './notification-template.entity';
import {
  NotificationType,
  NotificationPriority,
  ExecutionStatus,
} from '@shared/enums';

@Entity('notifications')
@Index(['organizationId', 'status'])
@Index(['userId', 'createdAt'])
@Index(['type', 'priority'])
@Index(['scheduledFor'])
export class Notification extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.IN_APP,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  eventType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sourceModule: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  correlationId: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledFor: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  deliveryConfig: {
    email?: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      replyTo?: string;
    };
    sms?: {
      to: string[];
    };
    webhook?: {
      url: string;
      method: string;
      headers?: Record<string, string>;
    };
    push?: {
      tokens: string[];
      badge?: number;
      sound?: string;
    };
  };

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  templateId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => NotificationTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: NotificationTemplate;

  @OneToMany(() => NotificationDelivery, (delivery) => delivery.notification)
  deliveries: NotificationDelivery[];

  // Helper methods
  isRead(): boolean {
    return !!this.readAt;
  }

  isSent(): boolean {
    return this.status === ExecutionStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === ExecutionStatus.FAILED;
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries && this.isFailed();
  }

  markAsRead(): void {
    if (!this.readAt) {
      this.readAt = new Date();
    }
  }

  markAsSent(): void {
    this.status = ExecutionStatus.COMPLETED;
    this.sentAt = new Date();
  }

  markAsFailed(error: string): void {
    this.status = ExecutionStatus.FAILED;
    this.errorMessage = error;
    this.retryCount++;
  }
}
