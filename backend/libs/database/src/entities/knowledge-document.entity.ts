import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { DocumentStatus } from '@shared/enums';

export enum DocumentType {
  PDF = 'pdf',
  DOCUMENT = 'document',
  TEXT = 'text',
  MARKDOWN = 'markdown',
  HTML = 'html',
  JSON = 'json',
  CSV = 'csv',
  UNKNOWN = 'unknown',
}

export enum DocumentVisibility {
  PRIVATE = 'private',
  TEAM = 'team',
  ORGANIZATION = 'organization',
}

@Entity('knowledge_documents')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'type'])
@Index(['organizationId', 'visibility'])
@Index(['createdAt'])
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.UNKNOWN,
  })
  type: DocumentType;

  @Column({ type: 'text' })
  source: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.UPLOADED,
  })
  status: DocumentStatus;

  @Column({
    type: 'enum',
    enum: DocumentVisibility,
    default: DocumentVisibility.PRIVATE,
  })
  visibility: DocumentVisibility;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column({ type: 'int', default: 0 })
  chunkCount: number;

  @Column({ type: 'int', default: 0 })
  tokenCount: number;

  @Column({ type: 'bigint', default: 0 })
  fileSize: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  language?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  embeddingModel?: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'uuid', nullable: true })
  parentDocumentId?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contentHash?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt?: Date;

  @Column({ type: 'int', default: 0 })
  accessCount: number;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => KnowledgeDocumentChunk, (chunk) => chunk.document)
  chunks: KnowledgeDocumentChunk[];

  @OneToMany(() => KnowledgeDocumentVersion, (version) => version.document)
  versions: KnowledgeDocumentVersion[];
}

@Entity('knowledge_document_chunks')
@Index(['documentId', 'chunkIndex'])
@Index(['organizationId'])
export class KnowledgeDocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  documentId: string;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'vector', nullable: true })
  embedding?: number[];

  @Column({ type: 'int' })
  tokenCount: number;

  @Column({ type: 'int', default: 0 })
  startIndex: number;

  @Column({ type: 'int', default: 0 })
  endIndex: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({ type: 'uuid' })
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => KnowledgeDocument, (document) => document.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document: KnowledgeDocument;
}

@Entity('knowledge_document_versions')
@Index(['documentId', 'version'])
export class KnowledgeDocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  documentId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  diffMetadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 64 })
  contentHash: string;

  @Column({ type: 'uuid' })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => KnowledgeDocument, (document) => document.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document: KnowledgeDocument;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;
}
