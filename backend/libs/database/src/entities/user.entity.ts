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
import { Agent } from './agent.entity';
import { Tool } from './tool.entity';
import { Workflow } from './workflow.entity';
import { Session } from './session.entity';
import { APXSession } from './apix-session.entity';
import { APXExecution } from './apix-execution.entity';
import { UserRole } from '@shared/interfaces';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['organizationId', 'email'], { unique: true })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.DEVELOPER,
  })
  role: UserRole;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  permissions?: string[];

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  passwordResetExpiresAt?: Date;

  @ManyToOne(() => Organization, (organization) => organization.users)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToMany(() => Agent, (agent) => agent.user)
  agents: Agent[];

  @OneToMany(() => Tool, (tool) => tool.user)
  tools: Tool[];

  @OneToMany(() => Workflow, (workflow) => workflow.user)
  workflows: Workflow[];

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => APXSession, (session) => session.user)
  apixSessions: APXSession[];

  @OneToMany(() => APXExecution, (execution) => execution.user)
  apixExecutions: APXExecution[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
