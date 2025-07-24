import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Session } from './session.entity';

export enum SearchType {
  SEMANTIC = 'semantic',
  KEYWORD = 'keyword',
  HYBRID = 'hybrid',
}

export enum SearchStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

@Entity('knowledge_searches')
@Index(['organizationId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['sessionId'])
@Index(['status'])
export class KnowledgeSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  query: string;

  @Column({
    type: 'enum',
    enum: SearchType,
    default: SearchType.HYBRID,
  })
  type: SearchType;

  @Column({
    type: 'enum',
    enum: SearchStatus,
    default: SearchStatus.SUCCESS,
  })
  status: SearchStatus;

  @Column({ type: 'jsonb', default: '[]' })
  results: any[];

  @Column({ type: 'jsonb', nullable: true })
  filters?: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  resultCount: number;

  @Column({ type: 'int', default: 0 })
  executionTimeMs: number;

  @Column({ type: 'float', default: 0 })
  averageScore: number;

  @Column({ type: 'float', default: 0 })
  maxScore: number;

  @Column({ type: 'float', default: 0 })
  minScore: number;

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'uuid', nullable: true })
  sessionId?: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => Session, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sessionId' })
  session?: Session;
}

@Entity('knowledge_search_feedback')
@Index(['searchId'])
@Index(['organizationId', 'createdAt'])
export class KnowledgeSearchFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  searchId: string;

  @Column({ type: 'uuid' })
  documentId: string;

  @Column({ type: 'uuid', nullable: true })
  chunkId?: string;

  @Column({ type: 'int', default: 0 })
  relevanceScore: number; // 1-5 scale

  @Column({ type: 'boolean', default: false })
  wasHelpful: boolean;

  @Column({ type: 'boolean', default: false })
  wasUsed: boolean;

  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => KnowledgeSearch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'searchId' })
  search: KnowledgeSearch;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
}

@Entity('knowledge_analytics')
@Index(['organizationId', 'date'])
@Index(['documentId', 'date'])
export class KnowledgeAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'uuid', nullable: true })
  documentId?: string;

  @Column({ type: 'int', default: 0 })
  searchCount: number;

  @Column({ type: 'int', default: 0 })
  accessCount: number;

  @Column({ type: 'int', default: 0 })
  uniqueUsers: number;

  @Column({ type: 'float', default: 0 })
  averageRelevanceScore: number;

  @Column({ type: 'int', default: 0 })
  totalTokensUsed: number;

  @Column({ type: 'float', default: 0 })
  averageLatency: number;

  @Column({ type: 'jsonb', default: '{}' })
  metrics: Record<string, any>;

  @Column({ type: 'uuid' })
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
}
