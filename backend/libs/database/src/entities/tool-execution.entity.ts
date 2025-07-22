import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tool } from './tool.entity';
import { ExecutionStatus } from '@shared/enums';

@Entity('tool_executions')
@Index(['organizationId', 'createdAt'])
@Index(['toolId', 'status'])
export class ToolExecution extends BaseEntity {
  @Column({ type: 'uuid' })
  toolId: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'jsonb' })
  input: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output?: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  cost?: number;

  @Column({ type: 'integer', nullable: true })
  executionTimeMs?: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Tool, (tool) => tool.executions)
  @JoinColumn({ name: 'toolId' })
  tool: Tool;
}
