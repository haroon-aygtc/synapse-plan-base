import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { AIProvider } from './ai-provider.entity';
import { ExecutionStatus } from '@shared/enums';

export enum ExecutionType {
  AGENT = 'agent',
  TOOL = 'tool',
  WORKFLOW = 'workflow',
  KNOWLEDGE = 'knowledge',
}

@Entity('ai_provider_executions')
@Index(['organizationId', 'providerId'])
@Index(['organizationId', 'executionType'])
@Index(['organizationId', 'status'])
@Index(['createdAt'])
export class AIProviderExecution extends BaseEntity {
  @Column({ type: 'uuid' })
  providerId: string;

  @Column({ type: 'enum', enum: ExecutionType })
  executionType: ExecutionType;

  @Column({ type: 'uuid' })
  resourceId: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column({ type: 'jsonb' })
  input: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output?: Record<string, any>;

  @Column({ type: 'enum', enum: ExecutionStatus })
  status: ExecutionStatus;

  @Column({ type: 'integer', nullable: true })
  tokensUsed?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  cost?: number;

  @Column({ type: 'integer', nullable: true })
  responseTimeMs?: number;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'integer', nullable: true })
  inputTokens?: number;

  @Column({ type: 'integer', nullable: true })
  outputTokens?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  latencyMs?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region?: string;

  @Column({ type: 'boolean', default: false })
  wasRetried?: boolean;

  @Column({ type: 'integer', default: 0 })
  retryCount?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fallbackProvider?: string;

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics?: {
    timeToFirstToken?: number;
    tokensPerSecond?: number;
    compressionRatio?: number;
    cacheHitRate?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  securityMetrics?: {
    encryptionUsed?: boolean;
    auditTrailId?: string;
    complianceFlags?: string[];
  };

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => AIProvider, (provider) => provider.executions)
  @JoinColumn({ name: 'providerId' })
  provider: AIProvider;
}
