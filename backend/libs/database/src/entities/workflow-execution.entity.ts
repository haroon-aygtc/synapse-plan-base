import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Workflow } from './workflow.entity';
import { ExecutionStatus } from '@shared/enums';

@Entity('workflow_executions')
@Index(['organizationId', 'createdAt'])
@Index(['workflowId', 'status'])
@Index(['status', 'startedAt'])
@Index(['userId', 'status'])
export class WorkflowExecution extends BaseEntity {
  @Column({ type: 'uuid' })
  workflowId!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'jsonb' })
  input!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output?: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status!: ExecutionStatus;

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  stepResults?: Record<string, any>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  currentStep?: string;

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

  // Workflow state management
  @Column({ type: 'jsonb', nullable: true })
  workflowState?: {
    variables: Record<string, any>;
    completedSteps: string[];
    failedSteps: string[];
    pausedAt?: Date;
    resumedAt?: Date;
    retryCount: number;
    lastCheckpoint?: Date;
  };

  // Performance metrics
  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics?: {
    stepExecutionTimes: Record<string, number>;
    bottlenecks: Array<{
      stepId: string;
      executionTime: number;
      reason: string;
    }>;
    totalAgentCalls: number;
    totalToolCalls: number;
    totalHitlRequests: number;
    memoryUsage: number;
    cpuUsage: number;
  };

  // Error handling and recovery
  @Column({ type: 'jsonb', nullable: true })
  errorDetails?: {
    stepId?: string;
    errorType: string;
    errorCode: string;
    stackTrace?: string;
    recoveryAttempts: number;
    lastRecoveryAt?: Date;
    isRecoverable: boolean;
  };

  // HITL integration
  @Column({ type: 'jsonb', nullable: true })
  hitlRequests?: Array<{
    requestId: string;
    stepId: string;
    requestType: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    requestedAt: Date;
    resolvedAt?: Date;
    resolvedBy?: string;
    resolution?: any;
  }>;

  // Agent and tool integration tracking
  @Column({ type: 'jsonb', nullable: true })
  integrationMetrics?: {
    agentExecutions: Array<{
      stepId: string;
      agentId: string;
      executionId: string;
      executionTime: number;
      tokensUsed: number;
      cost: number;
      status: string;
    }>;
    toolExecutions: Array<{
      stepId: string;
      toolId: string;
      executionId: string;
      executionTime: number;
      cost: number;
      status: string;
    }>;
  };

  // Analytics and optimization data
  @Column({ type: 'jsonb', nullable: true })
  analyticsData?: {
    executionPath: string[];
    decisionPoints: Array<{
      stepId: string;
      condition: string;
      result: boolean;
      evaluationTime: number;
    }>;
    parallelExecutions: Array<{
      stepIds: string[];
      startTime: Date;
      endTime: Date;
      efficiency: number;
    }>;
    optimizationSuggestions: Array<{
      type: 'performance' | 'cost' | 'reliability';
      suggestion: string;
      impact: 'low' | 'medium' | 'high';
      estimatedImprovement: string;
    }>;
    successRate: number;
    averageExecutionTime: number;
    bottleneckAnalysis: Array<{
      stepId: string;
      averageTime: number;
      frequency: number;
      impact: 'low' | 'medium' | 'high';
    }>;
    costBreakdown: {
      agentCosts: number;
      toolCosts: number;
      infrastructureCosts: number;
      totalCost: number;
    };
  };

  @ManyToOne(() => Workflow, (workflow) => workflow.executions)
  @JoinColumn({ name: 'workflowId' })
  workflow!: Workflow;
}
