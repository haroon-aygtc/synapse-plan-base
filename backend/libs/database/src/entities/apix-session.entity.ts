import { Entity, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { APXSecurityLevel, APXPermissionLevel } from '@shared/enums';
import { APXExecution } from './apix-execution.entity';

@Entity('apix_sessions')
@Index(['userId', 'organizationId'])
@Index(['sessionId'], { unique: true })
@Index(['expiresAt'])
export class APXSession extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  sessionId: string;

  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  organizationId: string;

  @Column({ type: 'enum', enum: APXSecurityLevel, default: APXSecurityLevel.PUBLIC })
  securityLevel: APXSecurityLevel;

  @Column({ type: 'enum', enum: APXPermissionLevel, default: APXPermissionLevel.READ })
  permissions: APXPermissionLevel[];

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastActivityAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, any>;

  @ManyToOne(() => User, (user) => user.apixSessions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, (organization) => organization.apixSessions)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToMany(() => APXExecution, (execution) => execution.session)
  executions: APXExecution[];
}
