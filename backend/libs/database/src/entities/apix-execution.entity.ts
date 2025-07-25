import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { APXSession } from './apix-session.entity';
import { APXMessageType, APXExecutionState, APXStreamState } from '@shared/enums';

@Entity('apix_executions')
@Index(['organizationId', 'executionType'])
@Index(['sessionId'])
@Index(['executionId'], { unique: true })
@Index(['state'])
export class APXExecution extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  executionId: string;

  @Column({ type: 'enum', enum: APXMessageType })
  executionType: APXMessageType;

  @Column({ type: 'enum', enum: APXExecutionState, default: APXExecutionState.PENDING })
  state: APXExecutionState;

  @Column({ type: 'enum', enum: APXStreamState, default: APXStreamState.INITIALIZING })
  streamState: APXStreamState;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  sessionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resourceId?: string; // agent_id, tool_id, workflow_id, etc.

  @Column({ type: 'jsonb' })
  inputPayload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  outputPayload?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails?: {
    error_type: string;
    error_code: string;
    error_message: string;
    error_details?: Record<string, any>;
    retry_possible: boolean;
    suggested_action?: string;
  };

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt?: Date;

  @Column({ type: 'integer', nullable: true })
  executionTimeMs?: number;

  @Column({ type: 'integer', default: 0 })
  tokenCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  cost: number;

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics?: {
    processing_time_ms: number;
    queue_time_ms: number;
    network_latency_ms?: number;
    memory_usage_bytes: number;
    cpu_usage_percent: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  streamingData?: {
    chunks_sent: number;
    total_chunks: number;
    compression_enabled: boolean;
    encryption_enabled: boolean;
    buffer_size: number;
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  correlationId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  parentExecutionId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  nextRetryAt?: Date;

  @ManyToOne(() => User, (user) => user.apixExecutions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, (organization) => organization.apixExecutions)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => APXSession, (session) => session.executions)
  @JoinColumn({ name: 'sessionId', referencedColumnName: 'sessionId' })
  session: APXSession;
}
