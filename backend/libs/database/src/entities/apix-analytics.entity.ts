import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('apix_analytics')
@Index(['organizationId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['sessionId', 'createdAt'])
export class APXAnalytics extends BaseEntity {
  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'jsonb', nullable: true })
  eventData: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  responseTimeMs: number;

  @Column({ type: 'int', default: 0 })
  tokenCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  cost: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  model: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 