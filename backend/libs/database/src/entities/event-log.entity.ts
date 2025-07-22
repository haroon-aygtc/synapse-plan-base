import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { EventType } from '@shared/enums';

@Entity('event_logs')
@Index(['organizationId', 'eventType', 'timestamp'])
@Index(['sourceModule', 'targetModule', 'timestamp'])
@Index(['correlationId'])
export class EventLog extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  eventId: string;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  eventType: EventType;

  @Column({ type: 'varchar', length: 100 })
  sourceModule: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetModule?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  correlationId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  parentEventId?: string;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  timestamp: Date;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processedAt?: Date;

  @Column({ type: 'text', nullable: true })
  error?: string;
}
