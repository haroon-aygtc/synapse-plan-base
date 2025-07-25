import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { SandboxRun } from './sandbox-run.entity';
import { Organization } from './organization.entity';

export enum SandboxEventType {
  RUN_STARTED = 'run_started',
  RUN_COMPLETED = 'run_completed',
  RUN_FAILED = 'run_failed',
  AGENT_EXECUTION = 'agent_execution',
  TOOL_EXECUTION = 'tool_execution',
  WORKFLOW_STEP = 'workflow_step',
  SESSION_UPDATE = 'session_update',
  PROVIDER_CALL = 'provider_call',
  MEMORY_UPDATE = 'memory_update',
  ERROR_OCCURRED = 'error_occurred',
  DEBUG_BREAKPOINT = 'debug_breakpoint',
  PERFORMANCE_METRIC = 'performance_metric',
  COST_UPDATE = 'cost_update',
  HITL_REQUEST = 'hitl_request',
  RAG_INJECTION = 'rag_injection',
}

export interface SandboxEventPayload {
  type: SandboxEventType;
  moduleType?: 'agent' | 'tool' | 'workflow' | 'session' | 'provider';
  moduleId?: string;
  data: any;
  metadata?: {
    executionTime?: number;
    memoryUsage?: number;
    tokensUsed?: number;
    cost?: number;
    error?: string;
    stackTrace?: string;
    sessionId?: string;
    userId?: string;
  };
}

@Entity('sandbox_events')
@Index(['runId', 'organizationId'])
@Index(['organizationId', 'type'])
@Index(['organizationId', 'timestamp'])
export class SandboxEvent extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SandboxEventType,
  })
  type: SandboxEventType;

  @Column({ type: 'jsonb' })
  payload: SandboxEventPayload;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'uuid' })
  @Index()
  runId: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => SandboxRun, (run) => run.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'runId' })
  sandboxRun: SandboxRun;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
}
