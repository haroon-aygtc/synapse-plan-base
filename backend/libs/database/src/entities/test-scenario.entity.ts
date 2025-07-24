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

export interface TestScenarioStep {
  id: string;
  name: string;
  type: string;
  input: any;
  expectedOutput: any;
  timeout?: number;
  retries?: number;
}

export interface TestScenarioAssertion {
  id: string;
  type: 'equals' | 'contains' | 'matches' | 'custom';
  field: string;
  expected: any;
  actual?: any;
  passed?: boolean;
  message?: string;
}

@Entity('test_scenarios')
@Index(['sandboxId', 'organizationId'])
@Index(['organizationId', 'userId'])
export class TestScenario extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'jsonb' })
  steps: TestScenarioStep[];

  @Column({ type: 'jsonb' })
  assertions: TestScenarioAssertion[];

  @Column({ type: 'jsonb', nullable: true })
  inputData?: any;

  @Column({ type: 'jsonb', nullable: true })
  expectedOutput?: any;

  @Column({ type: 'jsonb', nullable: true })
  configuration?: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'uuid' })
  @Index()
  sandboxId: string;

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
  @ManyToOne(() => TestingSandbox, (sandbox) => sandbox.testScenarios, {
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
