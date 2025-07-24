import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, FindOptionsWhere, Not } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HITLRequest, HITLComment, HITLVote, User } from '@database/entities';
import {
  HITLRequestStatus,
  HITLRequestPriority,
  HITLEscalationReason,
  HITLEventType,
  UserRole,
} from '@shared/enums';
import {
  CreateHITLRequestDto,
  UpdateHITLRequestDto,
  ResolveHITLRequestDto,
  AssignHITLRequestDto,
  DelegateHITLRequestDto,
  EscalateHITLRequestDto,
  VoteHITLRequestDto,
  CommentHITLRequestDto,
  HITLAnalyticsQueryDto,
} from './dto';
import { WebSocketService } from '../websocket/websocket.service';
import { NotificationService } from '../notification/notification.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HITLService {
  private readonly logger = new Logger(HITLService.name);

  constructor(
    @InjectRepository(HITLRequest)
    private readonly hitlRequestRepository: Repository<HITLRequest>,
    @InjectRepository(HITLComment)
    private readonly hitlCommentRepository: Repository<HITLComment>,
    @InjectRepository(HITLVote)
    private readonly hitlVoteRepository: Repository<HITLVote>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
    private readonly websocketService: WebSocketService,
    private readonly notificationService: NotificationService,
  ) {}

  // HITL Request Management
  async createRequest(
    createDto: CreateHITLRequestDto,
    requesterId: string,
    organizationId: string,
  ): Promise<HITLRequest> {
    const expiresAt = createDto.expiresAt
      ? new Date(createDto.expiresAt)
      : new Date(Date.now() + (createDto.timeoutMs || 86400000));

    const request = this.hitlRequestRepository.create({
      ...createDto,
      requesterId,
      organizationId,
      expiresAt,
      status: HITLRequestStatus.PENDING,
      escalationLevel: 0,
      auditTrail: [],
      performanceMetrics: {
        responseTimeMs: 0,
        decisionTimeMs: 0,
        escalationCount: 0,
        discussionMessages: 0,
        expertsConsulted: 0,
      },
    });

    const savedRequest = await this.hitlRequestRepository.save(request);

    // Add audit entry
    savedRequest.addAuditEntry('REQUEST_CREATED', requesterId, {
      type: createDto.type,
      priority: createDto.priority,
      sourceType: createDto.sourceType,
      sourceId: createDto.sourceId,
    });

    await this.hitlRequestRepository.save(savedRequest);

    // Auto-assign if assignee specified
    if (
      createDto.assigneeId ||
      createDto.assigneeRoles ||
      createDto.assigneeUsers
    ) {
      await this.assignRequest(
        savedRequest.id,
        {
          assigneeId: createDto.assigneeId,
          assigneeRoles: createDto.assigneeRoles,
          assigneeUsers: createDto.assigneeUsers,
          reason: 'Auto-assigned during creation',
        },
        requesterId,
        organizationId,
      );
    }

    // Emit event
    this.eventEmitter.emit(HITLEventType.REQUEST_CREATED, {
      requestId: savedRequest.id,
      requesterId,
      organizationId,
      type: savedRequest.type,
      priority: savedRequest.priority,
      sourceType: savedRequest.sourceType,
      sourceId: savedRequest.sourceId,
      timestamp: new Date(),
    });

    // Send real-time notification
    await this.websocketService.broadcastToOrganization(
      organizationId,
      'hitl_request_created',
      {
        request: savedRequest,
        timestamp: new Date(),
      },
    );

    // Send notifications to assignees
    await this.sendAssignmentNotifications(savedRequest);

    this.logger.log(`HITL request created: ${savedRequest.id}`);
    return savedRequest;
  }

  async getRequests(
    organizationId: string,
    userId?: string,
    options: {
      page?: number;
      limit?: number;
      status?: HITLRequestStatus;
      priority?: HITLRequestPriority;
      assignedToMe?: boolean;
      createdByMe?: boolean;
      sourceType?: 'agent' | 'tool' | 'workflow';
      category?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {},
  ): Promise<{
    requests: HITLRequest[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const {
      page = 1,
      limit = 50,
      status,
      priority,
      assignedToMe,
      createdByMe,
      sourceType,
      category,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const queryBuilder = this.hitlRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.assignee', 'assignee')
      .leftJoinAndSelect('request.comments', 'comments')
      .leftJoinAndSelect('request.votes', 'votes')
      .where('request.organizationId = :organizationId', { organizationId });

    if (status) {
      queryBuilder.andWhere('request.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('request.priority = :priority', { priority });
    }

    if (assignedToMe && userId) {
      queryBuilder.andWhere(
        '(request.assigneeId = :userId OR :userId = ANY(request.assigneeUsers))',
        { userId },
      );
    }

    if (createdByMe && userId) {
      queryBuilder.andWhere('request.requesterId = :userId', { userId });
    }

    if (sourceType) {
      queryBuilder.andWhere('request.sourceType = :sourceType', { sourceType });
    }

    if (category) {
      queryBuilder.andWhere('request.category = :category', { category });
    }

    // Add sorting
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'priority',
      'status',
      'expiresAt',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`request.${sortField}`, sortOrder);

    // Add pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [requests, total] = await queryBuilder.getManyAndCount();

    return {
      requests,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRequestById(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<HITLRequest> {
    const request = await this.hitlRequestRepository.findOne({
      where: { id, organizationId },
      relations: [
        'requester',
        'assignee',
        'delegatedFrom',
        'delegatedTo',
        'comments',
        'comments.user',
        'comments.replies',
        'votes',
        'votes.user',
      ],
    });

    if (!request) {
      throw new NotFoundException('HITL request not found');
    }

    // Check access permissions
    if (userId && !this.canAccessRequest(request, userId)) {
      throw new ForbiddenException('Access denied to this HITL request');
    }

    return request;
  }

  async updateRequest(
    id: string,
    updateDto: UpdateHITLRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<HITLRequest> {
    const request = await this.getRequestById(id, organizationId, userId);

    // Check permissions
    if (!this.canModifyRequest(request, userId)) {
      throw new ForbiddenException(
        'Insufficient permissions to modify this request',
      );
    }

    Object.assign(request, updateDto);
    request.addAuditEntry('REQUEST_UPDATED', userId, updateDto);

    const updatedRequest = await this.hitlRequestRepository.save(request);

    // Emit event
    this.eventEmitter.emit('hitl.request.updated', {
      requestId: id,
      userId,
      organizationId,
      changes: updateDto,
      timestamp: new Date(),
    });

    return updatedRequest;
  }

  async resolveRequest(
    id: string,
    resolveDto: ResolveHITLRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<HITLRequest> {
    const request = await this.getRequestById(id, organizationId, userId);

    if (!request.canBeApproved()) {
      throw new BadRequestException(
        'Request cannot be resolved in its current state',
      );
    }

    // Check permissions
    if (!this.canResolveRequest(request, userId)) {
      throw new ForbiddenException(
        'Insufficient permissions to resolve this request',
      );
    }

    // Update request status and decision data
    request.status = resolveDto.approved
      ? HITLRequestStatus.APPROVED
      : HITLRequestStatus.REJECTED;
    request.completedAt = new Date();
    request.decisionData = {
      approved: resolveDto.approved,
      reason: resolveDto.reason,
      comments: resolveDto.comments,
      attachments: resolveDto.attachments,
      metadata: resolveDto.metadata,
    };

    // Update performance metrics
    const responseTime = Date.now() - request.createdAt.getTime();
    const decisionTime = request.assignedAt
      ? Date.now() - request.assignedAt.getTime()
      : responseTime;

    request.updatePerformanceMetrics({
      responseTimeMs: responseTime,
      decisionTimeMs: decisionTime,
    });

    request.addAuditEntry('REQUEST_RESOLVED', userId, {
      approved: resolveDto.approved,
      reason: resolveDto.reason,
      responseTimeMs: responseTime,
      decisionTimeMs: decisionTime,
    });

    const resolvedRequest = await this.hitlRequestRepository.save(request);

    // Emit events
    const eventType = resolveDto.approved
      ? HITLEventType.REQUEST_APPROVED
      : HITLEventType.REQUEST_REJECTED;

    this.eventEmitter.emit(eventType, {
      requestId: id,
      userId,
      organizationId,
      approved: resolveDto.approved,
      reason: resolveDto.reason,
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      executionId: request.executionId,
      timestamp: new Date(),
    });

    // Resume execution if applicable
    await this.resumeExecution(resolvedRequest, resolveDto.approved);

    // Send notifications
    await this.sendResolutionNotifications(
      resolvedRequest,
      resolveDto.approved,
    );

    this.logger.log(
      `HITL request ${resolveDto.approved ? 'approved' : 'rejected'}: ${id}`,
    );

    return resolvedRequest;
  }

  async assignRequest(
    id: string,
    assignDto: AssignHITLRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<HITLRequest> {
    const request = await this.getRequestById(id, organizationId, userId);

    if (request.status !== HITLRequestStatus.PENDING) {
      throw new BadRequestException(
        'Request cannot be assigned in its current state',
      );
    }

    // Update assignment
    request.assigneeId = assignDto.assigneeId;
    request.assigneeRoles = assignDto.assigneeRoles;
    request.assigneeUsers = assignDto.assigneeUsers;
    request.assignedAt = new Date();
    request.status = HITLRequestStatus.IN_PROGRESS;

    request.addAuditEntry('REQUEST_ASSIGNED', userId, {
      assigneeId: assignDto.assigneeId,
      assigneeRoles: assignDto.assigneeRoles,
      assigneeUsers: assignDto.assigneeUsers,
      reason: assignDto.reason,
    });

    const assignedRequest = await this.hitlRequestRepository.save(request);

    // Emit event
    this.eventEmitter.emit(HITLEventType.REQUEST_ASSIGNED, {
      requestId: id,
      assignerId: userId,
      assigneeId: assignDto.assigneeId,
      assigneeRoles: assignDto.assigneeRoles,
      assigneeUsers: assignDto.assigneeUsers,
      organizationId,
      timestamp: new Date(),
    });

    // Send notifications
    await this.sendAssignmentNotifications(assignedRequest);

    return assignedRequest;
  }

  async delegateRequest(
    id: string,
    delegateDto: DelegateHITLRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<HITLRequest> {
    const request = await this.getRequestById(id, organizationId, userId);

    if (!this.canDelegateRequest(request, userId)) {
      throw new ForbiddenException('Cannot delegate this request');
    }

    // Update delegation
    request.delegatedFromId = request.assigneeId;
    request.delegatedToId = delegateDto.delegatedToId;
    request.assigneeId = delegateDto.delegatedToId;

    request.addAuditEntry('REQUEST_DELEGATED', userId, {
      delegatedFromId: request.delegatedFromId,
      delegatedToId: delegateDto.delegatedToId,
      reason: delegateDto.reason,
      instructions: delegateDto.instructions,
    });

    const delegatedRequest = await this.hitlRequestRepository.save(request);

    // Emit event
    this.eventEmitter.emit(HITLEventType.REQUEST_DELEGATED, {
      requestId: id,
      delegatedFromId: userId,
      delegatedToId: delegateDto.delegatedToId,
      organizationId,
      reason: delegateDto.reason,
      timestamp: new Date(),
    });

    // Send notifications
    await this.sendDelegationNotifications(delegatedRequest, delegateDto);

    return delegatedRequest;
  }

  async escalateRequest(
    id: string,
    escalateDto: EscalateHITLRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<HITLRequest> {
    const request = await this.getRequestById(id, organizationId, userId);

    const nextLevel = request.getNextEscalationLevel();
    if (!nextLevel) {
      throw new BadRequestException('No escalation level available');
    }

    // Update escalation
    request.escalationLevel = escalateDto.targetLevel || nextLevel.level;
    request.escalatedAt = new Date();
    request.escalationReason = escalateDto.reason;
    request.assigneeRoles = nextLevel.assigneeRoles;
    request.assigneeUsers = nextLevel.assigneeUsers;
    request.assigneeId = null; // Clear specific assignee

    request.updatePerformanceMetrics({
      escalationCount: (request.performanceMetrics?.escalationCount || 0) + 1,
    });

    request.addAuditEntry('REQUEST_ESCALATED', userId, {
      fromLevel: request.escalationLevel - 1,
      toLevel: request.escalationLevel,
      reason: escalateDto.reason,
      description: escalateDto.description,
      justification: escalateDto.justification,
    });

    const escalatedRequest = await this.hitlRequestRepository.save(request);

    // Emit event
    this.eventEmitter.emit(HITLEventType.REQUEST_ESCALATED, {
      requestId: id,
      escalatedById: userId,
      escalationLevel: request.escalationLevel,
      reason: escalateDto.reason,
      organizationId,
      timestamp: new Date(),
    });

    // Send notifications
    await this.sendEscalationNotifications(escalatedRequest);

    return escalatedRequest;
  }

  // Voting System
  async castVote(
    requestId: string,
    voteDto: VoteHITLRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<HITLVote> {
    const request = await this.getRequestById(
      requestId,
      organizationId,
      userId,
    );

    if (!request.requiresVoting()) {
      throw new BadRequestException('This request does not require voting');
    }

    if (!request.canBeApproved()) {
      throw new BadRequestException(
        'Request cannot accept votes in its current state',
      );
    }

    // Check if user can vote
    if (!this.canVoteOnRequest(request, userId)) {
      throw new ForbiddenException(
        'You are not authorized to vote on this request',
      );
    }

    // Check if user already voted
    const existingVote = await this.hitlVoteRepository.findOne({
      where: { requestId, userId },
    });

    let vote: HITLVote;
    if (existingVote) {
      // Update existing vote
      existingVote.vote = voteDto.vote;
      existingVote.reason = voteDto.reason;
      existingVote.metadata = voteDto.metadata;
      vote = await this.hitlVoteRepository.save(existingVote);
    } else {
      // Create new vote
      vote = this.hitlVoteRepository.create({
        requestId,
        userId,
        organizationId,
        vote: voteDto.vote,
        reason: voteDto.reason,
        metadata: voteDto.metadata,
      });
      vote = await this.hitlVoteRepository.save(vote);
    }

    // Update voting data on request
    await this.updateVotingData(request);

    // Check if voting is complete
    if (request.hasRequiredVotes()) {
      const approved = this.determineVotingResult(request);
      await this.resolveRequest(
        requestId,
        {
          approved,
          reason: 'Resolved by voting',
          metadata: { votingResult: true },
        },
        'system',
        organizationId,
      );
    }

    // Emit event
    this.eventEmitter.emit(HITLEventType.VOTE_CAST, {
      requestId,
      userId,
      vote: voteDto.vote,
      organizationId,
      timestamp: new Date(),
    });

    return vote;
  }

  // Comment System
  async addComment(
    requestId: string,
    commentDto: CommentHITLRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<HITLComment> {
    const request = await this.getRequestById(
      requestId,
      organizationId,
      userId,
    );

    const comment = this.hitlCommentRepository.create({
      requestId,
      userId,
      organizationId,
      content: commentDto.content,
      attachments: commentDto.attachments,
      parentCommentId: commentDto.parentCommentId,
      isInternal: commentDto.isInternal,
      metadata: commentDto.metadata,
    });

    const savedComment = await this.hitlCommentRepository.save(comment);

    // Update discussion metrics
    request.updatePerformanceMetrics({
      discussionMessages:
        (request.performanceMetrics?.discussionMessages || 0) + 1,
    });
    await this.hitlRequestRepository.save(request);

    // Emit event
    this.eventEmitter.emit(HITLEventType.COMMENT_ADDED, {
      requestId,
      commentId: savedComment.id,
      userId,
      organizationId,
      isReply: !!commentDto.parentCommentId,
      timestamp: new Date(),
    });

    // Send notifications
    await this.sendCommentNotifications(request, savedComment);

    return savedComment;
  }

  // Analytics and Reporting
  async getAnalytics(
    organizationId: string,
    query: HITLAnalyticsQueryDto,
  ): Promise<{
    summary: {
      totalRequests: number;
      pendingRequests: number;
      approvedRequests: number;
      rejectedRequests: number;
      expiredRequests: number;
      averageResponseTime: number;
      averageDecisionTime: number;
      escalationRate: number;
    };
    trends: {
      daily: Array<{
        date: string;
        created: number;
        resolved: number;
        expired: number;
      }>;
      byType: Record<string, number>;
      byPriority: Record<string, number>;
      byStatus: Record<string, number>;
    };
    performance: {
      topPerformers: Array<{
        userId: string;
        userName: string;
        resolvedCount: number;
        averageResponseTime: number;
        approvalRate: number;
      }>;
      bottlenecks: Array<{
        type: string;
        count: number;
        averageTime: number;
        impact: 'low' | 'medium' | 'high';
      }>;
    };
  }> {
    const { startDate, endDate, type, status, priority, sourceType } = query;

    const queryBuilder = this.hitlRequestRepository
      .createQueryBuilder('request')
      .where('request.organizationId = :organizationId', { organizationId });

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'request.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    }

    if (type) queryBuilder.andWhere('request.type = :type', { type });
    if (status) queryBuilder.andWhere('request.status = :status', { status });
    if (priority)
      queryBuilder.andWhere('request.priority = :priority', { priority });
    if (sourceType)
      queryBuilder.andWhere('request.sourceType = :sourceType', { sourceType });

    const requests = await queryBuilder.getMany();

    // Calculate summary metrics
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(
      (r) => r.status === HITLRequestStatus.PENDING,
    ).length;
    const approvedRequests = requests.filter(
      (r) => r.status === HITLRequestStatus.APPROVED,
    ).length;
    const rejectedRequests = requests.filter(
      (r) => r.status === HITLRequestStatus.REJECTED,
    ).length;
    const expiredRequests = requests.filter(
      (r) => r.status === HITLRequestStatus.EXPIRED,
    ).length;

    const completedRequests = requests.filter((r) => r.completedAt);
    const averageResponseTime =
      completedRequests.length > 0
        ? completedRequests.reduce(
            (sum, r) => sum + (r.performanceMetrics?.responseTimeMs || 0),
            0,
          ) / completedRequests.length
        : 0;

    const averageDecisionTime =
      completedRequests.length > 0
        ? completedRequests.reduce(
            (sum, r) => sum + (r.performanceMetrics?.decisionTimeMs || 0),
            0,
          ) / completedRequests.length
        : 0;

    const escalatedRequests = requests.filter(
      (r) => r.escalationLevel > 0,
    ).length;
    const escalationRate =
      totalRequests > 0 ? (escalatedRequests / totalRequests) * 100 : 0;

    // Generate trends
    const dailyTrends = this.generateDailyTrends(requests, startDate, endDate);
    const byType = this.groupByField(requests, 'type');
    const byPriority = this.groupByField(requests, 'priority');
    const byStatus = this.groupByField(requests, 'status');

    // Performance analysis
    const topPerformers = await this.getTopPerformers(
      organizationId,
      startDate,
      endDate,
    );
    const bottlenecks = this.identifyBottlenecks(requests);

    return {
      summary: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        expiredRequests,
        averageResponseTime: Math.round(averageResponseTime),
        averageDecisionTime: Math.round(averageDecisionTime),
        escalationRate: Math.round(escalationRate * 100) / 100,
      },
      trends: {
        daily: dailyTrends,
        byType,
        byPriority,
        byStatus,
      },
      performance: {
        topPerformers,
        bottlenecks,
      },
    };
  }

  // Scheduled Tasks
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredRequests(): Promise<void> {
    const expiredRequests = await this.hitlRequestRepository.find({
      where: {
        status: In([HITLRequestStatus.PENDING, HITLRequestStatus.IN_PROGRESS]),
        expiresAt: Between(new Date(0), new Date()),
      },
    });

    for (const request of expiredRequests) {
      request.status = HITLRequestStatus.EXPIRED;
      request.completedAt = new Date();
      request.addAuditEntry('REQUEST_EXPIRED', 'system', {
        expiredAt: new Date(),
        originalStatus: request.status,
      });

      await this.hitlRequestRepository.save(request);

      // Emit event
      this.eventEmitter.emit(HITLEventType.REQUEST_EXPIRED, {
        requestId: request.id,
        organizationId: request.organizationId,
        sourceType: request.sourceType,
        sourceId: request.sourceId,
        executionId: request.executionId,
        timestamp: new Date(),
      });

      // Resume execution with rejection
      await this.resumeExecution(request, false);

      this.logger.warn(`HITL request expired: ${request.id}`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleAutoEscalation(): Promise<void> {
    const now = new Date();
    const escalationWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const escalationCandidates = await this.hitlRequestRepository.find({
      where: {
        status: In([HITLRequestStatus.PENDING, HITLRequestStatus.IN_PROGRESS]),
        expiresAt: Between(now, escalationWindow),
      },
      relations: ['requester', 'assignee'],
    });

    for (const request of escalationCandidates) {
      try {
        // Check if request should be escalated based on escalation rules
        if (this.shouldEscalateRequest(request)) {
          await this.escalateRequest(
            request.id,
            {
              reason: HITLEscalationReason.TIMEOUT,
              description: `Auto-escalated due to approaching timeout. Original request created at ${request.createdAt.toISOString()}`,
              justification:
                'Automatic escalation triggered by system timeout rules',
            },
            'system',
            request.organizationId,
          );

          this.logger.log(
            `Auto-escalated HITL request ${request.id} due to timeout`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to auto-escalate request ${request.id}:`,
          error,
        );
      }
    }
  }

  private shouldEscalateRequest(request: any): boolean {
    const now = new Date();
    const timeUntilExpiry = request.expiresAt.getTime() - now.getTime();
    const totalTime = request.expiresAt.getTime() - request.createdAt.getTime();
    const timeElapsed = now.getTime() - request.createdAt.getTime();

    // Escalate if:
    // 1. Less than 2 hours until expiry
    // 2. More than 75% of total time has elapsed
    // 3. Request has escalation rules enabled
    const shouldEscalateByTime = timeUntilExpiry < 2 * 60 * 60 * 1000; // 2 hours
    const shouldEscalateByProgress = timeElapsed > totalTime * 0.75;
    const hasEscalationRules = request.escalationRules?.enabled;

    return (
      (shouldEscalateByTime || shouldEscalateByProgress) &&
      hasEscalationRules &&
      request.escalationLevel <
        (request.escalationRules?.maxEscalationLevel || 3)
    );
  }

  // Private Helper Methods
  private canAccessRequest(request: HITLRequest, userId: string): boolean {
    return (
      request.requesterId === userId ||
      request.assigneeId === userId ||
      request.assigneeUsers?.includes(userId) ||
      request.delegatedToId === userId
    );
  }

  private canModifyRequest(request: HITLRequest, userId: string): boolean {
    return request.requesterId === userId || request.assigneeId === userId;
  }

  private canResolveRequest(request: HITLRequest, userId: string): boolean {
    return (
      request.assigneeId === userId ||
      request.assigneeUsers?.includes(userId) ||
      request.delegatedToId === userId
    );
  }

  private canDelegateRequest(request: HITLRequest, userId: string): boolean {
    return request.assigneeId === userId;
  }

  private canVoteOnRequest(request: HITLRequest, userId: string): boolean {
    return (
      request.assigneeUsers?.includes(userId) || request.assigneeId === userId
    );
  }

  private async updateVotingData(request: HITLRequest): Promise<void> {
    const votes = await this.hitlVoteRepository.find({
      where: { requestId: request.id },
    });

    const totalVotes = votes.length;
    const approvalVotes = votes.filter((v) => v.vote === 'approve').length;
    const rejectionVotes = votes.filter((v) => v.vote === 'reject').length;
    const abstainVotes = votes.filter((v) => v.vote === 'abstain').length;

    request.votingData = {
      totalVotes,
      approvalVotes,
      rejectionVotes,
      abstainVotes,
      requiredVotes: request.votingData?.requiredVotes || totalVotes,
      voters: votes.map((v) => ({
        userId: v.userId,
        vote: v.vote,
        reason: v.reason,
        votedAt: v.createdAt,
      })),
    };

    await this.hitlRequestRepository.save(request);
  }

  private determineVotingResult(request: HITLRequest): boolean {
    if (!request.votingData) return false;

    const { approvalVotes, totalVotes } = request.votingData;

    if (request.decisionType === 'UNANIMOUS') {
      return approvalVotes === totalVotes;
    }

    if (request.decisionType === 'MAJORITY_VOTE') {
      return approvalVotes > totalVotes / 2;
    }

    return false;
  }

  private async resumeExecution(
    request: HITLRequest,
    approved: boolean,
  ): Promise<void> {
    if (!request.executionId) return;

    const resumeData = {
      executionId: request.executionId,
      approved,
      decisionData: request.decisionData,
      requestId: request.id,
    };

    // Emit resume event based on source type
    switch (request.sourceType) {
      case 'agent':
        this.eventEmitter.emit('agent.execution.resume', resumeData);
        break;
      case 'tool':
        this.eventEmitter.emit('tool.execution.resume', resumeData);
        break;
      case 'workflow':
        this.eventEmitter.emit('workflow.execution.resume', resumeData);
        break;
    }
  }

  private async sendAssignmentNotifications(
    request: HITLRequest,
  ): Promise<void> {
    const assignees = [];

    if (request.assigneeId) {
      assignees.push(request.assigneeId);
    }

    if (request.assigneeUsers) {
      assignees.push(...request.assigneeUsers);
    }

    for (const assigneeId of assignees) {
      await this.notificationService.createNotification(
        {
          title: 'HITL Request Assigned',
          message: `You have been assigned a ${request.type.toLowerCase()} request: ${request.title}`,
          type: 'IN_APP',
          priority: request.priority,
          userId: assigneeId,
          metadata: {
            requestId: request.id,
            sourceType: request.sourceType,
            sourceId: request.sourceId,
          },
        },
        request.organizationId,
      );
    }
  }

  private async sendResolutionNotifications(
    request: HITLRequest,
    approved: boolean,
  ): Promise<void> {
    // Notify requester
    await this.notificationService.createNotification(
      {
        title: `HITL Request ${approved ? 'Approved' : 'Rejected'}`,
        message: `Your ${request.type.toLowerCase()} request "${request.title}" has been ${approved ? 'approved' : 'rejected'}.`,
        type: 'IN_APP',
        priority: request.priority,
        userId: request.requesterId,
        metadata: {
          requestId: request.id,
          approved,
          reason: request.decisionData?.reason,
        },
      },
      request.organizationId,
    );
  }

  private async sendDelegationNotifications(
    request: HITLRequest,
    delegateDto: DelegateHITLRequestDto,
  ): Promise<void> {
    // Notify new assignee
    await this.notificationService.createNotification(
      {
        title: 'HITL Request Delegated to You',
        message: `A ${request.type.toLowerCase()} request has been delegated to you: ${request.title}`,
        type: 'IN_APP',
        priority: request.priority,
        userId: delegateDto.delegatedToId,
        metadata: {
          requestId: request.id,
          reason: delegateDto.reason,
          instructions: delegateDto.instructions,
        },
      },
      request.organizationId,
    );
  }

  private async sendEscalationNotifications(
    request: HITLRequest,
  ): Promise<void> {
    const assignees = [];

    if (request.assigneeUsers) {
      assignees.push(...request.assigneeUsers);
    }

    for (const assigneeId of assignees) {
      await this.notificationService.createNotification(
        {
          title: 'HITL Request Escalated',
          message: `An escalated ${request.type.toLowerCase()} request requires your attention: ${request.title}`,
          type: 'IN_APP',
          priority: 'HIGH',
          userId: assigneeId,
          metadata: {
            requestId: request.id,
            escalationLevel: request.escalationLevel,
            escalationReason: request.escalationReason,
          },
        },
        request.organizationId,
      );
    }
  }

  private async sendCommentNotifications(
    request: HITLRequest,
    comment: HITLComment,
  ): Promise<void> {
    const notifyUsers = new Set<string>();

    // Notify requester
    notifyUsers.add(request.requesterId);

    // Notify assignees
    if (request.assigneeId) notifyUsers.add(request.assigneeId);
    if (request.assigneeUsers) {
      request.assigneeUsers.forEach((id) => notifyUsers.add(id));
    }

    // Remove the comment author
    notifyUsers.delete(comment.userId);

    for (const userId of notifyUsers) {
      await this.notificationService.createNotification(
        {
          title: 'New Comment on HITL Request',
          message: `A new comment was added to the request: ${request.title}`,
          type: 'IN_APP',
          priority: 'MEDIUM',
          userId,
          metadata: {
            requestId: request.id,
            commentId: comment.id,
            commentAuthor: comment.userId,
          },
        },
        request.organizationId,
      );
    }
  }

  private generateDailyTrends(
    requests: HITLRequest[],
    startDate?: string,
    endDate?: string,
  ): Array<{
    date: string;
    created: number;
    resolved: number;
    expired: number;
  }> {
    const trends = new Map<
      string,
      { created: number; resolved: number; expired: number }
    >();

    requests.forEach((request) => {
      const createdDate = request.createdAt.toISOString().split('T')[0];

      if (!trends.has(createdDate)) {
        trends.set(createdDate, { created: 0, resolved: 0, expired: 0 });
      }

      trends.get(createdDate)!.created++;

      if (
        request.status === HITLRequestStatus.APPROVED ||
        request.status === HITLRequestStatus.REJECTED
      ) {
        trends.get(createdDate)!.resolved++;
      }

      if (request.status === HITLRequestStatus.EXPIRED) {
        trends.get(createdDate)!.expired++;
      }
    });

    return Array.from(trends.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  private groupByField(
    requests: HITLRequest[],
    field: keyof HITLRequest,
  ): Record<string, number> {
    const groups: Record<string, number> = {};

    requests.forEach((request) => {
      const value = String(request[field]);
      groups[value] = (groups[value] || 0) + 1;
    });

    return groups;
  }

  private async getTopPerformers(
    organizationId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<
    Array<{
      userId: string;
      userName: string;
      resolvedCount: number;
      averageResponseTime: number;
      approvalRate: number;
    }>
  > {
    // This would require more complex queries to get user performance data
    // For now, return empty array - implement based on specific requirements
    return [];
  }

  private identifyBottlenecks(requests: HITLRequest[]): Array<{
    type: string;
    count: number;
    averageTime: number;
    impact: 'low' | 'medium' | 'high';
  }> {
    const bottlenecks = [];

    // Identify long-running requests
    const longRunningRequests = requests.filter(
      (r) =>
        r.performanceMetrics?.responseTimeMs &&
        r.performanceMetrics.responseTimeMs > 24 * 60 * 60 * 1000,
    );

    if (longRunningRequests.length > 0) {
      const averageTime =
        longRunningRequests.reduce(
          (sum, r) => sum + (r.performanceMetrics?.responseTimeMs || 0),
          0,
        ) / longRunningRequests.length;

      bottlenecks.push({
        type: 'Long Response Time',
        count: longRunningRequests.length,
        averageTime: Math.round(averageTime),
        impact:
          longRunningRequests.length > requests.length * 0.2
            ? 'high'
            : 'medium',
      });
    }

    // Identify high escalation requests
    const escalatedRequests = requests.filter((r) => r.escalationLevel > 0);
    if (escalatedRequests.length > 0) {
      bottlenecks.push({
        type: 'High Escalation Rate',
        count: escalatedRequests.length,
        averageTime: 0,
        impact:
          escalatedRequests.length > requests.length * 0.1 ? 'high' : 'medium',
      });
    }

    return bottlenecks;
  }
}
