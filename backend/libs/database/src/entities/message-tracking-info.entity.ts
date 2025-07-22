import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Information for tracking WebSocket messages
 */
export interface MessageTrackingInfo {
  messageId: string;
  event: string;
  organizationId: string;
  userId?: string;
  timestamp: Date;
  payload?: any;
  size?: number;
}

@Entity('message_tracking')
@Index(['organizationId', 'event', 'timestamp'])
@Index(['userId', 'timestamp'])
export class MessageTrackingEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  messageId: string;

  @Column({ type: 'varchar', length: 255 })
  event: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: any;

  @Column({ type: 'integer', nullable: true })
  size?: number;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  timestamp: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  targetType?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  targetId?: string;

  @Column({ type: 'boolean', default: true })
  delivered: boolean;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;
}
