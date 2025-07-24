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
import { ExecutionStatus } from '@shared/enums';

export interface TestExecutionMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkCalls: number;
}

export interface TestExecutionTrace {
  timestamp: Date;
  level: string;
  message: string;
  data?: any;
  stackTrace?: string;
}

@Entity('test_executions')
@Index(['sandboxId', 'organizationId'])
@Index(['organizationId', 'userId'])
@Index(['organizationId', 'status'])
@Index(['organizationId', 'testType'])
export class TestExecution extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  testType: string;

  @Column({ type: 'jsonb' })
  testData: any;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ type: 'jsonb', nullable: true })
  output?: any;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'jsonb', nullable: true })
  metrics?: TestExecutionMetrics;

  @Column({ type: 'jsonb', nullable: true })
  traces?: TestExecutionTrace[];

  @Column({ type: 'jsonb', nullable: true })
  configuration?: Record<string, any>;

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
  @ManyToOne(() => TestingSandbox, (sandbox) => sandbox.testExecutions, {
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
