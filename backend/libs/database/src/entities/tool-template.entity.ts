import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity('tool_templates')
@Index(['category', 'isPublic'])
@Index(['organizationId', 'isActive'])
@Index(['templateRating'])
export class ToolTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 500 })
  endpoint: string;

  @Column({ type: 'varchar', length: 10, default: 'POST' })
  method: string;

  @Column({ type: 'jsonb' })
  schema: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  headers?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  authentication?: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  iconUrl?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  templateRating: number;

  @Column({ type: 'integer', default: 0 })
  templateRatingCount: number;

  @Column({ type: 'integer', default: 0 })
  templateDownloads: number;

  @Column({ type: 'boolean', default: false })
  templateFeatured: boolean;

  @Column({ type: 'jsonb', nullable: true })
  templateMetadata?: {
    complexity?: 'beginner' | 'intermediate' | 'advanced';
    estimatedSetupTime?: string;
    prerequisites?: string[];
    documentation?: string;
    examples?: Array<{
      name: string;
      description: string;
      parameters: Record<string, any>;
    }>;
  };

  @Column({ type: 'uuid', nullable: true })
  parentTemplateId?: string;

  @Column({ type: 'varchar', length: 50, default: '1.0.0' })
  version: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Organization, (organization) => organization.toolTemplates)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.toolTemplates)
  @JoinColumn({ name: 'userId' })
  user: User;
} 