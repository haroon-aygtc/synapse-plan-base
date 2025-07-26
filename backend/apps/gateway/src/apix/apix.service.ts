import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { User, Organization } from '@database/entities';
import {
  APXMessageType,
  APXStreamState,
  APXExecutionState,
  APXPermissionLevel,
  APXSecurityLevel,
  SessionEventType,
} from '@shared/enums';
import {
  IAPXMessage,
  IAPXSessionCreated,
  IAPXStreamingSession,
  IAPXPerformanceMetrics,
  UserRole,
} from '@shared/interfaces';
import { SessionService } from '../session/session.service';
import { WebSocketService } from '../websocket/websocket.service';
import { APXSession } from '@database/entities/apix-session.entity';
import { APXExecution } from '@database/entities/apix-execution.entity';
import { APXAnalytics } from '@database/entities/apix-analytics.entity';

export interface CreateAPXSessionDto {
  userId: string;
  organizationId: string;
  securityLevel?: APXSecurityLevel;
  permissions?: APXPermissionLevel[];
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface APXExecutionOptions {
  sessionId: string;
  resourceId?: string;
  correlationId?: string;
  parentExecutionId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class APXService implements OnModuleInit {
  private readonly logger = new Logger(APXService.name);
  private readonly defaultSessionTTL = this.parseTimeToSeconds(
    this.configService.get('SESSION_TTL', '24h')
  );
  private readonly redisPrefix = 'apix:';
  private activeExecutions = new Map<string, APXExecution>();
  private streamingSessions = new Map<string, IAPXStreamingSession>();

  constructor(
    @InjectRepository(APXSession)
    private readonly apixSessionRepository: Repository<APXSession>,
    @InjectRepository(APXExecution)
    private readonly apixExecutionRepository: Repository<APXExecution>,
    @InjectRepository(APXAnalytics)
    private readonly apixAnalyticsRepository: Repository<APXAnalytics>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
    private readonly sessionService: SessionService,
    private readonly websocketService: WebSocketService
  ) {}

  private parseTimeToSeconds(time: string): number {
    const [value, unit] = time.match(/(\d+)([smhd])/)?.slice(1) || [];
    const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return parseInt(value || '0') * multiplier;
  }

  onModuleInit() {
    this.logger.log('APIX Service initialized');
    this.startCleanupTasks();
  }

  // Session Management
  async createAPXSession(createDto: CreateAPXSessionDto): Promise<IAPXSessionCreated> {
    const { userId, organizationId, securityLevel, permissions, expiresAt, metadata } = createDto;

    // Validate user and organization
    const user = await this.userRepository.findOne({
      where: { id: userId, organizationId, isActive: true },
      relations: ['organization'],
    });

    if (!user?.organization?.isActive) {
      throw new Error('Invalid user or organization');
    }

    // Generate session ID
    const sessionId = `apx_${Date.now()}_${uuidv4()}`;
    const sessionExpiresAt = expiresAt || new Date(Date.now() + this.defaultSessionTTL);

    // Create APIX session entity
    const apixSession = this.apixSessionRepository.create({
      sessionId,
      userId,
      organizationId,
      securityLevel: securityLevel || APXSecurityLevel.AUTHENTICATED,
      permissions: permissions || this.getDefaultPermissions(user.role),
      expiresAt: sessionExpiresAt,
      lastActivityAt: new Date(),
      metadata,
    });

    const savedSession = await this.apixSessionRepository.save(apixSession);

    // Store in Redis for fast access
    await this.storeSessionInRedis(savedSession);

    // Initialize session analytics
    await this.initializeSessionAnalytics(savedSession.id, userId, organizationId);

    // Emit session created event
    this.eventEmitter.emit(SessionEventType.SESSION_CREATED, {
      sessionId: savedSession.id,
      userId,
      organizationId,
      timestamp: new Date(),
    });

    return {
      session_id: savedSession.id,
      user_id: userId,
      organization_id: organizationId,
      security_level: savedSession.securityLevel,
      permissions: savedSession.permissions,
      expires_at: savedSession.expiresAt.toISOString(),
      created_at: savedSession.createdAt.toISOString(),
      initial_context: savedSession.context || {},
    };
  }

  private getDefaultPermissions(role: UserRole): APXPermissionLevel[] {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return [
          APXPermissionLevel.ADMIN,
          APXPermissionLevel.READ,
          APXPermissionLevel.WRITE,
          APXPermissionLevel.EXECUTE,
        ];
      case UserRole.ORG_ADMIN:
        return [APXPermissionLevel.ADMIN, APXPermissionLevel.READ, APXPermissionLevel.WRITE];
      case UserRole.DEVELOPER:
        return [APXPermissionLevel.READ, APXPermissionLevel.WRITE, APXPermissionLevel.EXECUTE];
      case UserRole.VIEWER:
        return [APXPermissionLevel.READ];
      default:
        return [APXPermissionLevel.READ];
    }
  }

  private async storeSessionInRedis(session: APXSession): Promise<void> {
    await this.cacheManager.set(
      `apix:session:${session.id}`,
      session,
      session.expiresAt.getTime() - Date.now()
    );
  }

  private async initializeSessionAnalytics(
    sessionId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    const session = await this.apixSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['user', 'organization'],
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const analytics = this.apixAnalyticsRepository.create({
      sessionId,
      userId,
      organizationId,
      eventType: 'session_created',
      eventData: {
        sessionId,
        userId,
        organizationId,
      },
      success: true,
    });

    await this.apixAnalyticsRepository.save(analytics);
  }

  private async startCleanupTasks(): Promise<void> {
    setInterval(
      async () => {
        await this.cleanupExpiredSessions();
        await this.cleanupInactiveSessions();
      },
      1000 * 60 * 60 * 24
    ); // 24 hours
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const expiredSessions = await this.apixSessionRepository.find({
      where: { expiresAt: LessThan(new Date()) },
    });
    await this.apixSessionRepository.remove(expiredSessions);
  }

  private async cleanupInactiveSessions(): Promise<void> {
    const inactiveSessions = await this.apixSessionRepository.find({
      where: { lastActivityAt: LessThan(new Date(Date.now() - this.defaultSessionTTL)) },
    });
    await this.apixSessionRepository.remove(inactiveSessions);
  }
}
