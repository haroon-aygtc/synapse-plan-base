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
import { TestScenario } from './test-scenario.entity';
import { TestExecution } from './test-execution.entity';
import { MockData } from './mock-data.entity';
import { DebugSession } from './debug-session.entity';
import { SandboxRun } from './sandbox-run.entity';

export interface SandboxResourceLimits {
  memory: string;
  cpu: string;
  timeout: number;
  networkAccess: boolean;
  allowedPorts: number[];
}

export interface SandboxIsolationConfig {
  filesystem: {
    readOnly: boolean;
    allowedPaths: string[];
  };
  network: {
    allowedDomains: string[];
    blockedPorts: number[];
  };
  environment: {
    allowedEnvVars: string[];
  };
}

export interface ContainerInfo {
  containerId: string;
  status: string;
  createdAt: Date;
  ports?: number[];
  volumes?: string[];
}

@Entity('testing_sandboxes')
@Index(['organizationId', 'userId'])
@Index(['organizationId', 'status'])
@Index(['organizationId', 'type'])
export class TestingSandbox extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'varchar', length: 50, default: 'initializing' })
  status: string;

  @Column({ type: 'jsonb' })
  resourceLimits: SandboxResourceLimits;

  @Column({ type: 'jsonb' })
  isolationConfig: SandboxIsolationConfig;

  @Column({ type: 'jsonb', nullable: true })
  containerInfo?: ContainerInfo;

  @Column({ type: 'jsonb', nullable: true })
  configuration?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  environment?: Record<string, any>;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToMany(() => TestScenario, (scenario) => scenario.sandbox, {
    cascade: true,
  })
  testScenarios: TestScenario[];

  @OneToMany(() => TestExecution, (execution) => execution.sandbox, {
    cascade: true,
  })
  testExecutions: TestExecution[];

  @OneToMany(() => MockData, (mockData) => mockData.sandbox, {
    cascade: true,
  })
  mockData: MockData[];

  @OneToMany(() => DebugSession, (session) => session.sandbox, {
    cascade: true,
  })
  debugSessions: DebugSession[];

  @OneToMany(() => SandboxRun, (run) => run.sandbox, {
    cascade: true,
  })
  sandboxRuns: SandboxRun[];
}
