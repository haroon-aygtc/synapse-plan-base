import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Session, User, Organization } from '@database/entities';
import {
  ISession,
  ISessionContext,
  ISessionAnalytics,
  ISessionRecovery,
} from '@shared/interfaces';
import { SessionEventType } from '@shared/enums';

export interface CreateSessionDto {
  userId: string;
  organizationId: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
  permissions?: Record<string, any>;
  memoryLimit?: number;
  ttl?: number;
  isRecoverable?: boolean;
}

export interface UpdateSessionDto {
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  crossModuleData?: Record<string, any>;
  executionState?: Record<string, any>;
  workflowId?: string;
  agentId?: string;
  toolId?: string;
  knowledgeId?: string;
  hitlRequestId?: string;
  recoveryData?: Record<string, any>;
}

export interface SessionMemoryConfig {
  defaultLimit: number;
  warningThreshold: number;
  maxSessions: number;
  cleanupInterval: number;
  compressionEnabled: boolean;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly defaultTTL: number;
  private readonly memoryConfig: SessionMemoryConfig;
  private readonly redisPrefix = 'session:';
  private readonly analyticsPrefix = 'session:analytics:';
  private readonly recoveryPrefix = 'session:recovery:';

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.defaultTTL = this.parseTimeToSeconds(
      this.configService.get('SESSION_TTL', '24h'),
    );
    this.memoryConfig = {
      defaultLimit: this.configService.get('SESSION_MEMORY_LIMIT', 10485760), // 10MB
      warningThreshold: this.configService.get(
        'SESSION_MEMORY_WARNING_THRESHOLD',
        0.8,
      ),
      maxSessions: this.configService.get('MAX_SESSIONS_PER_USER', 10),
      cleanupInterval: this.configService.get('SESSION_CLEANUP_INTERVAL', 300), // 5 minutes
      compressionEnabled: this.configService.get(
        'SESSION_COMPRESSION_ENABLED',
        true,
      ),
    };
  }

  async createSession(createDto: CreateSessionDto): Promise<ISession> {
    const {
      userId,
      organizationId,
      context = {},
      metadata = {},
      userAgent,
      ipAddress,
      deviceId,
      permissions = {},
      memoryLimit,
      ttl,
      isRecoverable = false,
    } = createDto;

    // Validate user and organization
    const user = await this.userRepository.findOne({
      where: { id: userId, organizationId, isActive: true },
      relations: ['organization'],
    });

    if (!user || !user.organization?.isActive) {
      throw new UnauthorizedException('Invalid user or organization');
    }

    // Check session limits
    await this.enforceSessionLimits(userId);

    // Generate secure session token
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + (ttl || this.defaultTTL) * 1000);

    // Create session entity
    const session = this.sessionRepository.create({
      sessionToken,
      userId,
      organizationId,
      context: this.compressData(context),
      metadata,
      expiresAt,
      lastAccessedAt: new Date(),
      isActive: true,
      userAgent,
      ipAddress,
      deviceId,
      permissions,
      accessCount: 0,
      memoryUsage: this.calculateMemoryUsage(context),
      memoryLimit: memoryLimit || this.memoryConfig.defaultLimit,
      crossModuleData: {},
      isRecoverable,
      recoveryData: isRecoverable ? { createdAt: new Date() } : null,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Store in Redis for fast access
    await this.storeSessionInRedis(savedSession);

    // Initialize session analytics
    await this.initializeSessionAnalytics(
      savedSession.id,
      userId,
      organizationId,
    );

    // Emit session created event
    this.eventEmitter.emit(SessionEventType.SESSION_CREATED, {
      sessionId: savedSession.id,
      userId,
      organizationId,
      timestamp: new Date(),
    });

    this.logger.log(
      `Session created: ${savedSession.id} for user ${userId} in org ${organizationId}`,
    );

    return this.sanitizeSession(savedSession);
  }

  async getSession(sessionToken: string): Promise<ISession | null> {
    // Try Redis first for performance
    const cachedSession = await this.getSessionFromRedis(sessionToken);
    if (cachedSession) {
      await this.updateLastAccessed(cachedSession.id);
      return cachedSession;
    }

    // Fallback to database
    const session = await this.sessionRepository.findOne({
      where: {
        sessionToken,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user', 'organization'],
    });

    if (!session) {
      return null;
    }

    // Store back in Redis
    await this.storeSessionInRedis(session);
    await this.updateLastAccessed(session.id);

    return this.sanitizeSession(session);
  }

  async getSessionById(sessionId: string): Promise<ISession | null> {
    const session = await this.sessionRepository.findOne({
      where: {
        id: sessionId,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user', 'organization'],
    });

    if (!session) {
      return null;
    }

    return this.sanitizeSession(session);
  }

  async updateSession(
    sessionToken: string,
    updateDto: UpdateSessionDto,
  ): Promise<ISession> {
    const session = await this.sessionRepository.findOne({
      where: {
        sessionToken,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found or expired');
    }

    // Merge context data
    if (updateDto.context) {
      session.context = {
        ...this.decompressData(session.context),
        ...updateDto.context,
      };
      session.context = this.compressData(session.context);
    }

    // Update other fields
    if (updateDto.metadata) {
      session.metadata = { ...session.metadata, ...updateDto.metadata };
    }

    if (updateDto.crossModuleData) {
      session.crossModuleData = {
        ...session.crossModuleData,
        ...updateDto.crossModuleData,
      };
    }

    if (updateDto.executionState) {
      session.executionState = updateDto.executionState;
    }

    // Update module associations
    if (updateDto.workflowId) session.workflowId = updateDto.workflowId;
    if (updateDto.agentId) session.agentId = updateDto.agentId;
    if (updateDto.toolId) session.toolId = updateDto.toolId;
    if (updateDto.knowledgeId) session.knowledgeId = updateDto.knowledgeId;
    if (updateDto.hitlRequestId)
      session.hitlRequestId = updateDto.hitlRequestId;

    if (updateDto.recoveryData && session.isRecoverable) {
      session.recoveryData = {
        ...session.recoveryData,
        ...updateDto.recoveryData,
        lastUpdate: new Date(),
      };
    }

    // Update memory usage and check limits
    const newMemoryUsage = this.calculateMemoryUsage({
      context: session.context,
      metadata: session.metadata,
      crossModuleData: session.crossModuleData,
      executionState: session.executionState,
    });

    session.memoryUsage = newMemoryUsage;
    session.lastAccessedAt = new Date();
    session.accessCount += 1;

    // Check memory limits
    await this.checkMemoryLimits(session);

    const updatedSession = await this.sessionRepository.save(session);

    // Update Redis cache
    await this.storeSessionInRedis(updatedSession);

    // Update analytics
    await this.updateSessionAnalytics(updatedSession.id, {
      accessCount: updatedSession.accessCount,
      memoryUsage: updatedSession.memoryUsage,
      lastUpdate: new Date(),
    });

    // Emit session updated event
    this.eventEmitter.emit(SessionEventType.SESSION_UPDATED, {
      sessionId: updatedSession.id,
      userId: updatedSession.userId,
      organizationId: updatedSession.organizationId,
      changes: updateDto,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Session updated: ${updatedSession.id} (memory: ${newMemoryUsage} bytes)`,
    );

    return this.sanitizeSession(updatedSession);
  }

  async extendSession(
    sessionToken: string,
    additionalTTL?: number,
  ): Promise<ISession> {
    const session = await this.sessionRepository.findOne({
      where: {
        sessionToken,
        isActive: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const extensionTime = additionalTTL || this.defaultTTL;
    session.expiresAt = new Date(Date.now() + extensionTime * 1000);
    session.lastAccessedAt = new Date();

    const updatedSession = await this.sessionRepository.save(session);
    await this.storeSessionInRedis(updatedSession);

    this.logger.debug(
      `Session extended: ${updatedSession.id} until ${updatedSession.expiresAt}`,
    );

    return this.sanitizeSession(updatedSession);
  }

  async destroySession(sessionToken: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { sessionToken, isActive: true },
    });

    if (!session) {
      return; // Already destroyed or doesn't exist
    }

    // Mark as inactive
    session.isActive = false;
    await this.sessionRepository.save(session);

    // Remove from Redis
    await this.removeSessionFromRedis(sessionToken);

    // Clean up analytics
    await this.finalizeSessionAnalytics(session.id);

    // Emit session destroyed event
    this.eventEmitter.emit(SessionEventType.SESSION_DESTROYED, {
      sessionId: session.id,
      userId: session.userId,
      organizationId: session.organizationId,
      timestamp: new Date(),
    });

    this.logger.log(`Session destroyed: ${session.id}`);
  }

  async destroyUserSessions(userId: string): Promise<void> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
    });

    for (const session of sessions) {
      await this.destroySession(session.sessionToken);
    }

    this.logger.log(`All sessions destroyed for user: ${userId}`);
  }

  async getSessionContext(
    sessionToken: string,
  ): Promise<ISessionContext | null> {
    const session = await this.getSession(sessionToken);
    if (!session) {
      return null;
    }

    const context = this.decompressData(session.context);

    return {
      userId: session.userId,
      organizationId: session.organizationId,
      sessionId: session.id,
      permissions: session.permissions || {},
      crossModuleData: session.crossModuleData || {},
      executionState: session.executionState,
      workflowContext: session.workflowId
        ? {
            workflowId: session.workflowId,
            stepId: context.currentStep || '',
            variables: context.workflowVariables || {},
            state: context.workflowState || 'running',
          }
        : undefined,
      agentContext: session.agentId
        ? {
            agentId: session.agentId,
            conversationId: context.conversationId || '',
            memory: context.agentMemory || {},
            toolCalls: context.toolCalls || [],
          }
        : undefined,
      toolContext: session.toolId
        ? {
            toolId: session.toolId,
            executionId: context.toolExecutionId || '',
            parameters: context.toolParameters || {},
            state: context.toolState || 'pending',
          }
        : undefined,
      knowledgeContext: session.knowledgeId
        ? {
            searchHistory: context.searchHistory || [],
            documentAccess: context.documentAccess || [],
          }
        : undefined,
      hitlContext: session.hitlRequestId
        ? {
            requestId: session.hitlRequestId,
            approvalType: context.approvalType || '',
            requestData: context.requestData || {},
            status: context.approvalStatus || 'pending',
          }
        : undefined,
    };
  }

  async propagateContextUpdate(
    sessionToken: string,
    moduleType: 'agent' | 'tool' | 'workflow' | 'knowledge' | 'hitl',
    contextUpdate: Record<string, any>,
  ): Promise<void> {
    const session = await this.getSession(sessionToken);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updateKey = `${moduleType}Context`;
    const crossModuleUpdate = {
      [updateKey]: contextUpdate,
      lastPropagation: new Date(),
      sourceModule: moduleType,
    };

    await this.updateSession(sessionToken, {
      crossModuleData: crossModuleUpdate,
    });

    // Emit cross-module update event
    this.eventEmitter.emit(SessionEventType.SESSION_CROSS_MODULE_UPDATE, {
      sessionId: session.id,
      userId: session.userId,
      organizationId: session.organizationId,
      moduleType,
      contextUpdate,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Context propagated for session ${session.id} from ${moduleType}`,
    );
  }

  async recoverSession(sessionId: string): Promise<ISessionRecovery | null> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, isRecoverable: true },
    });

    if (!session || !session.recoveryData) {
      return null;
    }

    const recoveryData: ISessionRecovery = {
      sessionId: session.id,
      userId: session.userId,
      organizationId: session.organizationId,
      recoveryPoint: session.recoveryData.lastUpdate || session.updatedAt,
      executionState: session.executionState || {},
      crossModuleData: session.crossModuleData || {},
      workflowState: session.workflowId
        ? {
            workflowId: session.workflowId,
            currentStep: session.recoveryData.currentStep || '',
            completedSteps: session.recoveryData.completedSteps || [],
            variables: session.recoveryData.workflowVariables || {},
          }
        : undefined,
      agentState: session.agentId
        ? {
            agentId: session.agentId,
            conversationHistory: session.recoveryData.conversationHistory || [],
            memory: session.recoveryData.agentMemory || {},
          }
        : undefined,
      toolState: session.toolId
        ? {
            toolId: session.toolId,
            pendingExecutions: session.recoveryData.pendingExecutions || [],
            results: session.recoveryData.toolResults || {},
          }
        : undefined,
    };

    // Emit recovery initiated event
    this.eventEmitter.emit(SessionEventType.SESSION_RECOVERY_INITIATED, {
      sessionId,
      userId: session.userId,
      organizationId: session.organizationId,
      recoveryData,
      timestamp: new Date(),
    });

    this.logger.log(`Session recovery initiated for: ${sessionId}`);

    return recoveryData;
  }

  async getSessionAnalytics(
    organizationId: string,
    timeRange?: { from: Date; to: Date },
  ): Promise<ISessionAnalytics[]> {
    const analyticsKey = `${this.analyticsPrefix}${organizationId}`;
    const analytics =
      await this.cacheManager.get<ISessionAnalytics[]>(analyticsKey);

    if (!analytics) {
      return [];
    }

    if (timeRange) {
      return analytics.filter(
        (a) => a.timestamp >= timeRange.from && a.timestamp <= timeRange.to,
      );
    }

    return analytics;
  }

  // Private helper methods
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private calculateMemoryUsage(data: any): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  private compressData(data: any): any {
    if (!this.memoryConfig.compressionEnabled) {
      return data;
    }
    // Simple compression - in production, use proper compression library
    return data;
  }

  private decompressData(data: any): any {
    if (!this.memoryConfig.compressionEnabled) {
      return data;
    }
    // Simple decompression - in production, use proper compression library
    return data;
  }

  private async enforceSessionLimits(userId: string): Promise<void> {
    const activeSessions = await this.sessionRepository.count({
      where: {
        userId,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (activeSessions >= this.memoryConfig.maxSessions) {
      // Remove oldest session
      const oldestSession = await this.sessionRepository.findOne({
        where: {
          userId,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
        order: { lastAccessedAt: 'ASC' },
      });

      if (oldestSession) {
        await this.destroySession(oldestSession.sessionToken);
      }
    }
  }

  private async checkMemoryLimits(session: Session): Promise<void> {
    const warningThreshold =
      session.memoryLimit * this.memoryConfig.warningThreshold;

    if (session.memoryUsage > warningThreshold) {
      this.eventEmitter.emit(SessionEventType.SESSION_MEMORY_WARNING, {
        sessionId: session.id,
        userId: session.userId,
        organizationId: session.organizationId,
        memoryUsage: session.memoryUsage,
        memoryLimit: session.memoryLimit,
        timestamp: new Date(),
      });
    }

    if (session.memoryUsage > session.memoryLimit) {
      this.eventEmitter.emit(SessionEventType.SESSION_MEMORY_LIMIT_EXCEEDED, {
        sessionId: session.id,
        userId: session.userId,
        organizationId: session.organizationId,
        memoryUsage: session.memoryUsage,
        memoryLimit: session.memoryLimit,
        timestamp: new Date(),
      });

      // Truncate context to fit within limits
      await this.truncateSessionData(session);
    }
  }

  private async truncateSessionData(session: Session): Promise<void> {
    const context = this.decompressData(session.context);

    // Remove oldest entries from arrays
    if (
      context.conversationHistory &&
      Array.isArray(context.conversationHistory)
    ) {
      context.conversationHistory = context.conversationHistory.slice(-10); // Keep last 10
    }

    if (context.searchHistory && Array.isArray(context.searchHistory)) {
      context.searchHistory = context.searchHistory.slice(-5); // Keep last 5
    }

    if (context.toolCalls && Array.isArray(context.toolCalls)) {
      context.toolCalls = context.toolCalls.slice(-5); // Keep last 5
    }

    session.context = this.compressData(context);
    session.memoryUsage = this.calculateMemoryUsage(session.context);

    await this.sessionRepository.save(session);
    await this.storeSessionInRedis(session);

    this.logger.warn(
      `Session data truncated for ${session.id} (new size: ${session.memoryUsage} bytes)`,
    );
  }

  private async storeSessionInRedis(session: Session): Promise<void> {
    const key = `${this.redisPrefix}${session.sessionToken}`;
    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

    if (ttl > 0) {
      await this.cacheManager.set(
        key,
        this.sanitizeSession(session),
        ttl * 1000,
      );
    }
  }

  private async getSessionFromRedis(
    sessionToken: string,
  ): Promise<ISession | null> {
    const key = `${this.redisPrefix}${sessionToken}`;
    return await this.cacheManager.get<ISession>(key);
  }

  private async removeSessionFromRedis(sessionToken: string): Promise<void> {
    const key = `${this.redisPrefix}${sessionToken}`;
    await this.cacheManager.del(key);
  }

  private async updateLastAccessed(sessionId: string): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId },
      { lastAccessedAt: new Date() },
    );
  }

  private async initializeSessionAnalytics(
    sessionId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const analytics: ISessionAnalytics = {
      sessionId,
      organizationId,
      userId,
      duration: 0,
      accessCount: 0,
      memoryUsage: 0,
      crossModuleInteractions: 0,
      performanceMetrics: {
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0,
      },
      moduleUsage: {
        agent: 0,
        tool: 0,
        workflow: 0,
        knowledge: 0,
        hitl: 0,
      },
      timestamp: new Date(),
    };

    const key = `${this.analyticsPrefix}${organizationId}:${sessionId}`;
    await this.cacheManager.set(key, analytics, this.defaultTTL * 1000);
  }

  private async updateSessionAnalytics(
    sessionId: string,
    updates: Partial<ISessionAnalytics>,
  ): Promise<void> {
    // Implementation would update analytics in Redis
    // This is a placeholder for the analytics update logic
  }

  private async finalizeSessionAnalytics(sessionId: string): Promise<void> {
    // Implementation would finalize and store analytics
    // This is a placeholder for the analytics finalization logic
  }

  private sanitizeSession(session: Session): ISession {
    return {
      id: session.id,
      sessionToken: session.sessionToken,
      userId: session.userId,
      organizationId: session.organizationId,
      context: this.decompressData(session.context),
      metadata: session.metadata,
      expiresAt: session.expiresAt,
      lastAccessedAt: session.lastAccessedAt,
      isActive: session.isActive,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      deviceId: session.deviceId,
      permissions: session.permissions,
      accessCount: session.accessCount,
      memoryUsage: session.memoryUsage,
      memoryLimit: session.memoryLimit,
      crossModuleData: session.crossModuleData,
      workflowId: session.workflowId,
      agentId: session.agentId,
      toolId: session.toolId,
      knowledgeId: session.knowledgeId,
      hitlRequestId: session.hitlRequestId,
      executionState: session.executionState,
      isRecoverable: session.isRecoverable,
      recoveryData: session.recoveryData,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private parseTimeToSeconds(timeString: string): number {
    const timeRegex = /^(\d+)([smhd])$/;
    const match = timeString.match(timeRegex);

    if (!match) {
      return 86400; // Default to 24 hours
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 86400;
    }
  }

  // Scheduled cleanup tasks
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const expiredSessions = await this.sessionRepository.find({
        where: {
          expiresAt: LessThan(new Date()),
          isActive: true,
        },
      });

      for (const session of expiredSessions) {
        await this.destroySession(session.sessionToken);

        this.eventEmitter.emit(SessionEventType.SESSION_EXPIRED, {
          sessionId: session.id,
          userId: session.userId,
          organizationId: session.organizationId,
          timestamp: new Date(),
        });
      }

      if (expiredSessions.length > 0) {
        this.logger.log(
          `Cleaned up ${expiredSessions.length} expired sessions`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Session cleanup failed: ${error.message}`,
        error.stack,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async generateSessionAnalytics(): Promise<void> {
    try {
      // Generate hourly analytics for all active sessions
      const activeSessions = await this.sessionRepository.find({
        where: {
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
      });

      const analyticsData = new Map<string, any>();

      for (const session of activeSessions) {
        const orgId = session.organizationId;
        if (!analyticsData.has(orgId)) {
          analyticsData.set(orgId, {
            totalSessions: 0,
            totalMemoryUsage: 0,
            averageAccessCount: 0,
            moduleDistribution: {
              agent: 0,
              tool: 0,
              workflow: 0,
              knowledge: 0,
              hitl: 0,
            },
          });
        }

        const orgData = analyticsData.get(orgId);
        orgData.totalSessions++;
        orgData.totalMemoryUsage += session.memoryUsage;
        orgData.averageAccessCount += session.accessCount;

        // Count module usage
        if (session.agentId) orgData.moduleDistribution.agent++;
        if (session.toolId) orgData.moduleDistribution.tool++;
        if (session.workflowId) orgData.moduleDistribution.workflow++;
        if (session.knowledgeId) orgData.moduleDistribution.knowledge++;
        if (session.hitlRequestId) orgData.moduleDistribution.hitl++;
      }

      // Store analytics
      for (const [orgId, data] of analyticsData) {
        data.averageAccessCount = data.averageAccessCount / data.totalSessions;

        this.eventEmitter.emit(SessionEventType.SESSION_ANALYTICS_UPDATE, {
          organizationId: orgId,
          analytics: data,
          timestamp: new Date(),
        });
      }

      this.logger.debug(
        `Generated analytics for ${analyticsData.size} organizations`,
      );
    } catch (error) {
      this.logger.error(
        `Analytics generation failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
