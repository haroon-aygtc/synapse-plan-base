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
import { User } from './user.entity';
import { WorkflowExecution } from './workflow-execution.entity';

@Entity('workflows')
@Index(['organizationId', 'name'])
export class Workflow extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb' })
  definition: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: '1.0.0' })
  version: string;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Organization, (organization) => organization.workflows)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.workflows)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => WorkflowExecution, (execution) => execution.workflow)
  executions: WorkflowExecution[];
}
