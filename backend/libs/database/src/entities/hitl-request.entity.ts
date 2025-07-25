import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { AgentExecution } from './agent-execution.entity';
import { ToolExecution } from './tool-execution.entity';
import { WorkflowExecution } from './workflow-execution.entity';
import {
  HITLRequestType,
  HITLRequestStatus,
  HITLRequestPriority,
  HITLDecisionType,
  HITLEscalationReason,
} from '@shared/enums';

@Entity('hitl_requests')
@Index(['organizationId', 'status'])
@Index(['assigneeId', 'status'])
@Index(['priority', 'createdAt'])
@Index(['expiresAt'])
export class HITLRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: HITLRequestType,
    default: HITLRequestType.APPROVAL,
  })
  type: HITLRequestType;

  @Column({
    type: 'enum',
    enum: HITLRequestStatus,
    default: HITLRequestStatus.PENDING,
  })
  status: HITLRequestStatus;

  @Column({
    type: 'enum',
    enum: HITLRequestPriority,
    default: HITLRequestPriority.MEDIUM,
  })
  priority: HITLRequestPriority;

  @Column({
    type: 'enum',
    enum: HITLDecisionType,
    default: HITLDecisionType.SINGLE_APPROVER,
  })
  decisionType: HITLDecisionType;

  // Execution context
  @Column({ type: 'varchar', length: 50 })
  sourceType: 'agent' | 'tool' | 'workflow';

  @Column({ type: 'uuid' })
  sourceId: string;

  @Column({ type: 'uuid', nullable: true })
  executionId?: string;

  @Column({ type: 'jsonb', nullable: true })
  executionContext?: Record<string, any>;

  // Assignment and delegation
  @Column({ type: 'uuid' })
  requesterId: string;

  @Column({ type: 'uuid', nullable: true })
  assigneeId?: string;

  @Column({ type: 'jsonb', nullable: true })
  assigneeRoles?: string[];

  @Column({ type: 'jsonb', nullable: true })
  assigneeUsers?: string[];

  @Column({ type: 'uuid', nullable: true })
  delegatedFromId?: string;

  @Column({ type: 'uuid', nullable: true })
  delegatedToId?: string;

  // Decision data
  @Column({ type: 'jsonb', nullable: true })
  decisionData?: {
    approved?: boolean;
    reason?: string;
    comments?: string;
    attachments?: string[];
    metadata?: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  votingData?: {
    totalVotes: number;
    approvalVotes: number;
    rejectionVotes: number;
    abstainVotes: number;
    requiredVotes: number;
    voters: Array<{
      userId: string;
      vote: 'approve' | 'reject' | 'abstain';
      reason?: string;
      votedAt: Date;
    }>;
  };

  // Timing and expiration
  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'integer', default: 86400000 }) // 24 hours in ms
  timeoutMs: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  assignedAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  escalatedAt?: Date;

  // Escalation configuration
  @Column({ type: 'jsonb', nullable: true })
  escalationRules?: {
    enabled: boolean;
    timeoutMinutes: number;
    escalationChain: Array<{
      level: number;
      assigneeRoles?: string[];
      assigneeUsers?: string[];
      timeoutMinutes: number;
    }>;
    autoEscalate: boolean;
    maxEscalationLevel: number;
  };

  @Column({ type: 'integer', default: 0 })
  escalationLevel: number;

  @Column({
    type: 'enum',
    enum: HITLEscalationReason,
    nullable: true,
  })
  escalationReason?: HITLEscalationReason;

  // Collaboration features
  @Column({ type: 'boolean', default: false })
  allowDiscussion: boolean;

  @Column({ type: 'boolean', default: false })
  requireExpertConsultation: boolean;

  @Column({ type: 'jsonb', nullable: true })
  expertConsultants?: string[];

  @Column({ type: 'jsonb', nullable: true })
  discussionThreadId?: string;

  // Analytics and tracking
  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics?: {
    responseTimeMs: number;
    decisionTimeMs: number;
    escalationCount: number;
    discussionMessages: number;
    expertsConsulted: number;
    qualityScore?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  auditTrail?: Array<{
    action: string;
    userId: string;
    timestamp: Date;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }>;

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  category?: string;

  // Relations
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delegatedFromId' })
  delegatedFrom?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delegatedToId' })
  delegatedTo?: User;

  @OneToMany(() => HITLComment, (comment) => comment.request)
  comments: HITLComment[];

  @OneToMany(() => HITLVote, (vote) => vote.request)
  votes: HITLVote[];

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  canBeApproved(): boolean {
    return (
      (this.status === HITLRequestStatus.PENDING ||
        this.status === HITLRequestStatus.IN_PROGRESS) &&
      !this.isExpired()
    );
  }

  requiresVoting(): boolean {
    return (
      this.decisionType === HITLDecisionType.MAJORITY_VOTE ||
      this.decisionType === HITLDecisionType.UNANIMOUS
    );
  }

  hasRequiredVotes(): boolean {
    if (!this.requiresVoting() || !this.votingData) {
      return false;
    }

    const { totalVotes, approvalVotes, requiredVotes } = this.votingData;

    if (this.decisionType === HITLDecisionType.UNANIMOUS) {
      return totalVotes >= requiredVotes && approvalVotes === totalVotes;
    }

    if (this.decisionType === HITLDecisionType.MAJORITY_VOTE) {
      return totalVotes >= requiredVotes && approvalVotes > totalVotes / 2;
    }

    return false;
  }

  addAuditEntry(
    action: string,
    userId: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    if (!this.auditTrail) {
      this.auditTrail = [];
    }

    this.auditTrail.push({
      action,
      userId,
      timestamp: new Date(),
      details,
      ipAddress,
      userAgent,
    });
  }

  updatePerformanceMetrics(
    metrics: Partial<HITLRequest['performanceMetrics']>,
  ): void {
    const defaultMetrics = {
      responseTimeMs: 0,
      decisionTimeMs: 0,
      escalationCount: 0,
      discussionMessages: 0,
      expertsConsulted: 0,
    };
    
    this.performanceMetrics = {
      ...defaultMetrics,
      ...this.performanceMetrics,
      ...metrics,
    };
  }

  shouldEscalate(): boolean {
    if (!this.escalationRules?.enabled || this.isExpired()) {
      return false;
    }

    const now = new Date();
    const assignedTime = this.assignedAt || this.createdAt;
    const timeElapsed = now.getTime() - assignedTime.getTime();
    const timeoutMs = (this.escalationRules.timeoutMinutes || 60) * 60 * 1000;

    return (
      timeElapsed > timeoutMs &&
      this.escalationLevel < (this.escalationRules.maxEscalationLevel || 3)
    );
  }

  getNextEscalationLevel(): any {
    if (!this.escalationRules?.escalationChain) {
      return null;
    }

    return this.escalationRules.escalationChain.find(
      (level) => level.level === this.escalationLevel + 1,
    );
  }
}

@Entity('hitl_comments')
@Index(['requestId', 'createdAt'])
export class HITLComment extends BaseEntity {
  @Column({ type: 'uuid' })
  requestId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }>;

  @Column({ type: 'uuid', nullable: true })
  parentCommentId?: string;

  @Column({ type: 'boolean', default: false })
  isInternal: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => HITLRequest, (request) => request.comments)
  @JoinColumn({ name: 'requestId' })
  request: HITLRequest;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => HITLComment, { nullable: true })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment?: HITLComment;

  @OneToMany(() => HITLComment, (comment) => comment.parentComment)
  replies: HITLComment[];
}

@Entity('hitl_votes')
@Index(['requestId', 'userId'], { unique: true })
export class HITLVote extends BaseEntity {
  @Column({ type: 'uuid' })
  requestId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  vote: 'approve' | 'reject' | 'abstain';

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => HITLRequest, (request) => request.votes)
  @JoinColumn({ name: 'requestId' })
  request: HITLRequest;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}