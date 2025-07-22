import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Agent } from './agent.entity';
import { ExecutionStatus } from '@shared/enums';

@Entity('agent_executions')
@Index(['organizationId', 'createdAt'])
@Index(['agentId', 'status'])
export class AgentExecution extends BaseEntity {
  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'text' })
  input: string;

  @Column({ type: 'text', nullable: true })
  output?: string;

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

  @Column({ type: 'integer', nullable: true })
  tokensUsed?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  cost?: number;

  @Column({ type: 'integer', nullable: true })
  executionTimeMs?: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Agent, (agent) => agent.executions)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;
}
