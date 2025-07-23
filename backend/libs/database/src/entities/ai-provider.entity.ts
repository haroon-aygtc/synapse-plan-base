import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { AIProviderExecution } from './ai-provider-execution.entity';
import { AIProviderMetrics } from './ai-provider-metrics.entity';

export enum ProviderType {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  MISTRAL = 'mistral',
  GROQ = 'groq',
  OPENROUTER = 'openrouter',
}

export enum ProviderStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  rateLimits?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  models?: string[];
  customHeaders?: Record<string, string>;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    model?: string;
    executionType?: string;
    costThreshold?: number;
    performanceThreshold?: number;
    organizationId?: string;
    userId?: string;
  };
  targetProvider: string;
  fallbackProviders?: string[];
  isActive: boolean;
}

@Entity('ai_providers')
@Index(['organizationId', 'type'])
@Index(['organizationId', 'status'])
export class AIProvider extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: ProviderType })
  type: ProviderType;

  @Column({
    type: 'enum',
    enum: ProviderStatus,
    default: ProviderStatus.INACTIVE,
  })
  status: ProviderStatus;

  @Column({ type: 'jsonb' })
  config: ProviderConfig;

  @Column({ type: 'jsonb', nullable: true })
  routingRules?: RoutingRule[];

  @Column({ type: 'integer', default: 100 })
  priority: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 1.0 })
  costMultiplier: number;

  @Column({ type: 'jsonb', nullable: true })
  healthCheck?: {
    lastCheck: Date;
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    errorRate: number;
    uptime: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  metrics?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    totalCost: number;
    lastUpdated: Date;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Organization, (organization) => organization.aiProviders)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.aiProviders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => AIProviderExecution, (execution) => execution.provider)
  executions: AIProviderExecution[];

  @OneToMany(() => AIProviderMetrics, (metrics) => metrics.provider)
  metricsHistory: AIProviderMetrics[];
}
