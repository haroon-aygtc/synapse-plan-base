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
import { ToolExecution } from './tool-execution.entity';

@Entity('tools')
@Index(['organizationId', 'name'])
export class Tool extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb' })
  schema: Record<string, any>;

  @Column({ type: 'varchar', length: 500 })
  endpoint: string;

  @Column({ type: 'varchar', length: 10, default: 'POST' })
  method: string;

  @Column({ type: 'jsonb', nullable: true })
  headers?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  authentication?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Organization, (organization) => organization.tools)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.tools)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => ToolExecution, (execution) => execution.tool)
  executions: ToolExecution[];
}
