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

export interface MockDataSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, MockDataSchema>;
  items?: MockDataSchema;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: any[];
}

export interface MockDataRule {
  id: string;
  condition: string;
  action: 'return' | 'modify' | 'delay' | 'error';
  value?: any;
  delay?: number;
  errorCode?: number;
  errorMessage?: string;
}

@Entity('mock_data')
@Index(['sandboxId', 'organizationId'])
@Index(['organizationId', 'userId'])
@Index(['organizationId', 'dataType'])
export class MockData extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100 })
  dataType: string;

  @Column({ type: 'jsonb' })
  schema: MockDataSchema;

  @Column({ type: 'jsonb' })
  data: any;

  @Column({ type: 'jsonb', nullable: true })
  rules?: MockDataRule[];

  @Column({ type: 'jsonb', nullable: true })
  configuration?: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'active' })
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
  @ManyToOne(() => TestingSandbox, (sandbox) => sandbox.mockData, {
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
