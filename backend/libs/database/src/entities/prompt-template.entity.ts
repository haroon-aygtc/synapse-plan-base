// @ts-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

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
import { Agent } from './agent.entity';

@Entity('prompt_templates')
@Index(['organizationId', 'name'])
@Index(['category', 'isPublic'])
@Index(['parentTemplateId'])
export class PromptTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 50, default: '1.0.0' })
  version: string;

  @Column({ type: 'jsonb', nullable: true })
  variables?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description?: string;
    required: boolean;
    defaultValue?: any;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      enum?: any[];
    };
  }>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  parentTemplateId?: string;

  @Column({ type: 'integer', default: 0 })
  forkCount: number;

  @Column({ type: 'integer', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'integer', default: 0 })
  ratingCount: number;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Organization, (organization) => organization.promptTemplates)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.promptTemplates)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => PromptTemplate, { nullable: true })
  @JoinColumn({ name: 'parentTemplateId' })
  parentTemplate?: PromptTemplate;

  @OneToMany(() => PromptTemplate, (template) => template.parentTemplate)
  childTemplates: PromptTemplate[];

  @OneToMany(() => Agent, (agent) => agent.promptTemplate)
  agents: Agent[];
}
