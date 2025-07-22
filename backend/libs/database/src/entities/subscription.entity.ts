import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('subscriptions')
@Index(['organizationId', 'eventType'])
@Index(['userId', 'eventType'])
@Index(['connectionId'])
export class Subscription extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  connectionId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  eventType: string;

  @Column({ type: 'varchar', length: 50, default: 'tenant' })
  targetType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  targetId?: string;

  @Column({ type: 'jsonb', nullable: true })
  filters?: any;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  subscribedAt: Date;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastActivity: Date;

  @Column({ type: 'integer', default: 0 })
  messageCount: number;
}
