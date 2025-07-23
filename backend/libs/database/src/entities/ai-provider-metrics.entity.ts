import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { AIProvider } from './ai-provider.entity';
import { ExecutionType } from './ai-provider-execution.entity';

@Entity('ai_provider_metrics')
@Index(['organizationId', 'providerId', 'timestamp'])
@Index(['organizationId', 'executionType', 'timestamp'])
@Index(['timestamp'])
export class AIProviderMetrics extends BaseEntity {
  @Column({ type: 'uuid' })
  providerId: string;

  @Column({ type: 'enum', enum: ExecutionType, nullable: true })
  executionType?: ExecutionType;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'integer', default: 0 })
  totalRequests: number;

  @Column({ type: 'integer', default: 0 })
  successfulRequests: number;

  @Column({ type: 'integer', default: 0 })
  failedRequests: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageResponseTime: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  p95ResponseTime: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  p99ResponseTime: number;

  @Column({ type: 'integer', default: 0 })
  totalTokensUsed: number;

  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 })
  totalCost: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  errorRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  throughput: number;

  @Column({ type: 'jsonb', nullable: true })
  modelBreakdown?: Record<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
      avgResponseTime: number;
    }
  >;

  @Column({ type: 'jsonb', nullable: true })
  additionalMetrics?: Record<string, any>;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => AIProvider, (provider) => provider.metricsHistory)
  @JoinColumn({ name: 'providerId' })
  provider: AIProvider;
}
