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
import { AgentExecution } from './agent-execution.entity';
import { PromptTemplate } from './prompt-template.entity';

@Entity('agents')
@Index(['organizationId', 'name'])
export class Agent extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'varchar', length: 100, default: 'gpt-4' })
  model: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.7 })
  temperature: number;

  @Column({ type: 'integer', default: 2000 })
  maxTokens: number;

  @Column({ type: 'jsonb', nullable: true })
  tools?: string[];

  @Column({ type: 'jsonb', nullable: true })
  knowledgeSources?: string[];

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 50, default: '1.0.0' })
  version: string;

  @Column({ type: 'uuid', nullable: true })
  promptTemplateId?: string;

  @Column({ type: 'jsonb', nullable: true })
  testingConfig?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics?: {
    successRate: number;
    averageResponseTime: number;
    totalExecutions: number;
    errorRate: number;
    lastUpdated: Date;
  };

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Organization, (organization) => organization.agents)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.agents)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => AgentExecution, (execution) => execution.agent)
  executions: AgentExecution[];

  @OneToMany(() => AgentTestResult, (testResult) => testResult.agent)
  testResults: AgentTestResult[];

  @ManyToOne(() => PromptTemplate, (template) => template.agents, {
    nullable: true,
  })
  @JoinColumn({ name: 'promptTemplateId' })
  promptTemplate?: PromptTemplate;
}
