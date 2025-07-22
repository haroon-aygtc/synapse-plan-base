import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Agent } from './agent.entity';
import { Tool } from './tool.entity';
import { Workflow } from './workflow.entity';
import { SubscriptionPlan } from '@shared/interfaces';

@Entity('organizations')
@Index(['slug'], { unique: true })
export class Organization extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo?: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  plan: SubscriptionPlan;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  quotas?: Record<string, number>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Agent, (agent) => agent.organization)
  agents: Agent[];

  @OneToMany(() => Tool, (tool) => tool.organization)
  tools: Tool[];

  @OneToMany(() => Workflow, (workflow) => workflow.organization)
  workflows: Workflow[];
}
