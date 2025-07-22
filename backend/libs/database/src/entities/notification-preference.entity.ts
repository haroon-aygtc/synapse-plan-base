import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { NotificationType } from '@shared/enums';

@Entity('notification_preferences')
@Index(['userId', 'organizationId'])
@Index(['eventType', 'isEnabled'])
@Unique(['userId', 'organizationId', 'eventType', 'type'])
export class NotificationPreference extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
    quietHours?: {
      enabled: boolean;
      startTime: string; // HH:mm format
      endTime: string; // HH:mm format
      timezone: string;
    };
    batching?: {
      enabled: boolean;
      maxBatchSize: number;
      batchWindow: number; // minutes
    };
    filters?: {
      priority?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
      sources?: string[];
      keywords?: string[];
    };
    delivery?: {
      email?: {
        address?: string;
        format?: 'text' | 'html';
      };
      sms?: {
        number?: string;
      };
      webhook?: {
        url?: string;
        secret?: string;
      };
      push?: {
        deviceTokens?: string[];
      };
    };
  };

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // Helper methods
  isInQuietHours(date: Date = new Date()): boolean {
    if (!this.settings?.quietHours?.enabled) {
      return false;
    }

    const { startTime, endTime, timezone } = this.settings.quietHours;

    // Convert to user's timezone
    const userDate = new Date(
      date.toLocaleString('en-US', { timeZone: timezone }),
    );
    const currentTime = userDate.getHours() * 60 + userDate.getMinutes();

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      return currentTime >= startMinutes && currentTime <= endMinutes;
    } else {
      // Quiet hours span midnight
      return currentTime >= startMinutes || currentTime <= endMinutes;
    }
  }

  shouldBatch(): boolean {
    return this.settings?.batching?.enabled === true;
  }

  getBatchWindow(): number {
    return this.settings?.batching?.batchWindow || 60; // Default 1 hour
  }

  getMaxBatchSize(): number {
    return this.settings?.batching?.maxBatchSize || 10;
  }

  matchesFilters(notification: {
    priority: string;
    sourceModule?: string;
    title: string;
    message: string;
  }): boolean {
    const filters = this.settings?.filters;
    if (!filters) return true;

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(notification.priority as any)) {
        return false;
      }
    }

    // Source filter
    if (filters.sources && filters.sources.length > 0) {
      if (
        !notification.sourceModule ||
        !filters.sources.includes(notification.sourceModule)
      ) {
        return false;
      }
    }

    // Keyword filter
    if (filters.keywords && filters.keywords.length > 0) {
      const content =
        `${notification.title} ${notification.message}`.toLowerCase();
      const hasKeyword = filters.keywords.some((keyword) =>
        content.includes(keyword.toLowerCase()),
      );
      if (!hasKeyword) {
        return false;
      }
    }

    return true;
  }

  getDeliveryAddress(): string | null {
    switch (this.type) {
      case NotificationType.EMAIL:
        return (
          this.settings?.delivery?.email?.address || this.user?.email || null
        );
      case NotificationType.SMS:
        return this.settings?.delivery?.sms?.number || null;
      case NotificationType.WEBHOOK:
        return this.settings?.delivery?.webhook?.url || null;
      default:
        return null;
    }
  }
}
