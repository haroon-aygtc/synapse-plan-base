import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Agent } from './agent.entity';
import { ExecutionStatus } from '@shared/enums';

@Entity('agent_test_results')
@Index(['organizationId', 'createdAt'])
@Index(['agentId', 'testType'])
export class AgentTestResult extends BaseEntity {
  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'varchar', length: 100 })
  testType: string; // 'unit', 'integration', 'performance', 'ab_test'

  @Column({ type: 'varchar', length: 255 })
  testName: string;

  @Column({ type: 'jsonb' })
  testInput: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  expectedOutput?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  actualOutput?: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ type: 'boolean', default: false })
  passed: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score?: number;

  @Column({ type: 'jsonb', nullable: true })
  metrics?: {
    responseTime: number;
    tokenUsage: number;
    cost: number;
    accuracy?: number;
    relevance?: number;
    coherence?: number;
  };

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Agent, (agent) => agent.testResults)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;
}
