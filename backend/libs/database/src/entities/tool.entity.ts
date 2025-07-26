import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { ToolExecution } from './tool-execution.entity';

@Entity('tools')
@Index(['organizationId', 'name'])
export class Tool extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb' })
  schema: Record<string, any>;

  @Column({ type: 'varchar', length: 500 })
  endpoint: string;

  @Column({ type: 'varchar', length: 10, default: 'POST' })
  method: string;

  @Column({ type: 'jsonb', nullable: true })
  headers?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  authentication?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  version?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  iconUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  documentationUrl?: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  costPerExecution?: number;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ type: 'boolean', default: false })
  requiresAI: boolean;

  @Column({ type: 'jsonb', nullable: true })
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit?: number;
  };

  @Column({ type: 'integer', default: 30000 })
  timeout: number;

  @Column({ type: 'jsonb', nullable: true })
  retryConfig?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @ManyToOne(() => Organization, (organization) => organization.tools)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.tools)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => ToolExecution, (execution) => execution.tool)
  executions: ToolExecution[];
}
