// @ts-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';

@Entity('sessions')
@Index(['userId', 'organizationId'])
@Index(['sessionToken'], { unique: true })
@Index(['expiresAt'])
@Index(['isActive'])
export class Session extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  sessionToken: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'jsonb' })
  context: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastAccessedAt?: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userAgent?: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceId?: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions?: Record<string, any>;

  @Column({ type: 'integer', default: 0 })
  accessCount: number;

  @Column({ type: 'bigint', default: 0 })
  memoryUsage: number;

  @Column({ type: 'bigint', nullable: true })
  memoryLimit?: number;

  @Column({ type: 'jsonb', nullable: true })
  crossModuleData?: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  workflowId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  agentId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  toolId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  knowledgeId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hitlRequestId?: string;

  @Column({ type: 'jsonb', nullable: true })
  executionState?: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isRecoverable: boolean;

  @Column({ type: 'jsonb', nullable: true })
  recoveryData?: Record<string, any>;

  @ManyToOne(() => User, (user) => user.sessions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, (organization) => organization.sessions)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
}
