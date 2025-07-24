import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { TestingSandbox } from './testing-sandbox.entity';

export interface DebugBreakpoint {
  id: string;
  moduleId: string;
  line: number;
  condition?: string;
  enabled: boolean;
}

export interface DebugWatchExpression {
  id: string;
  expression: string;
  value?: any;
  enabled: boolean;
}

export interface DebugConfiguration {
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  stepByStep: boolean;
  variableInspection: boolean;
  callStackTracking: boolean;
  performanceProfiling: boolean;
  breakpoints: DebugBreakpoint[];
  watchExpressions: DebugWatchExpression[];
  additionalSettings?: Record<string, any>;
}

export interface DebugLog {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  message: string;
  data?: any;
  stackTrace?: string;
}

@Entity('debug_sessions')
@Index(['sandboxId', 'organizationId'])
@Index(['organizationId', 'userId'])
@Index(['organizationId', 'sessionType'])
export class DebugSession extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100 })
  sessionType: string;

  @Column({ type: 'varchar', length: 255 })
  targetModuleId: string;

  @Column({ type: 'jsonb' })
  configuration: DebugConfiguration;

  @Column({ type: 'jsonb', nullable: true })
  initialInput?: any;

  @Column({ type: 'integer', nullable: true })
  timeout?: number;

  @Column({ type: 'varchar', length: 50, default: 'created' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  currentState?: any;

  @Column({ type: 'jsonb', nullable: true })
  debugLogs?: DebugLog[];

  @Column({ type: 'uuid' })
  @Index()
  sandboxId: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => TestingSandbox, (sandbox) => sandbox.debugSessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sandboxId' })
  sandbox: TestingSandbox;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
}
