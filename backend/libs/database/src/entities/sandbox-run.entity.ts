import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { TestingSandbox } from './testing-sandbox.entity';
import { SandboxEvent } from './sandbox-event.entity';
import { ExecutionStatus } from '@shared/enums';

export interface SandboxRunMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkCalls: number;
  tokensUsed?: number;
  cost?: number;
  apiCalls: number;
  errorCount: number;
}

export interface SandboxRunTrace {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  stackTrace?: string;
  moduleType?: 'agent' | 'tool' | 'workflow' | 'session' | 'provider';
  moduleId?: string;
}

export interface SandboxRunConfig {
  targetType: 'agent' | 'tool' | 'workflow' | 'integration';
  targetId: string;
  input: any;
  configuration?: Record<string, any>;
  mockData?: Record<string, any>;
  testCredentials?: Record<string, any>;
  isolationLevel: 'strict' | 'moderate' | 'minimal';
  enableRealTimeUpdates: boolean;
  enableDebugMode: boolean;
  timeout: number;
}

@Entity('sandbox_runs')
@Index(['sandboxId', 'organizationId'])
@Index(['organizationId', 'userId'])
@Index(['organizationId', 'status'])
@Index(['organizationId', 'targetType'])
export class SandboxRun extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb' })
  config: SandboxRunConfig;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ type: 'jsonb', nullable: true })
  input?: any;

  @Column({ type: 'jsonb', nullable: true })
  output?: any;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'jsonb', nullable: true })
  metrics?: SandboxRunMetrics;

  @Column({ type: 'jsonb', nullable: true })
  traces?: SandboxRunTrace[];

  @Column({ type: 'jsonb', nullable: true })
  sessionState?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  providerMetrics?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  debugInfo?: Record<string, any>;

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
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => TestingSandbox, (sandbox) => sandbox.sandboxRuns, {
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

  @OneToMany(() => SandboxEvent, (event) => event.sandboxRun, {
    cascade: true,
  })
  events: SandboxEvent[];
}
