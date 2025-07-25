import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Widget } from '@database/entities/widget.entity';
import { Session } from '@database/entities/session.entity';
import { WidgetExecution } from '@database/entities/widget-execution.entity';
import { WebSocketService } from '../../websocket/websocket.service';
import { SessionService } from '../../session/session.service';

export interface WidgetSessionState {
  sessionId: string;
  widgetId: string;
  userId?: string;
  organizationId: string;
  status: 'active' | 'inactive' | 'expired' | 'suspended';
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  metadata: Record<string, any>;
  context: WidgetSessionContext;
  messages: WidgetSessionMessage[];
  variables: Record<string, any>;
  executionHistory: string[];
}

export interface WidgetSessionContext {
  origin: string;
  userAgent: string;
  ipAddress: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browserInfo: {
    name: string;
    version: string;
  };
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
  timezone?: string;
  referrer?: string;
  screenResolution?: {
    width: number;
    height: number;
  };
  language?: string;
}

export interface WidgetSessionMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error';
  content: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface WidgetSessionMetrics {
  totalMessages: number;
  totalExecutions: number;
  averageResponseTime: number;
  errorCount: number;
  lastInteraction: Date;
  sessionDuration: number;
}

@Injectable()
export class WidgetSessionService {
  private readonly logger = new Logger(WidgetSessionService.name);
  private readonly activeSessions = new Map<string, WidgetSessionState>();
  private readonly sessionTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(Widget)
    private widgetRepository: Repository<Widget>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(WidgetExecution)
    private widgetExecutionRepository: Repository<WidgetExecution>,
    @InjectQueue('widget-session')
    private sessionQueue: Queue,
    private websocketService: WebSocketService,
    private sessionService: SessionService
  ) {
    this.initializeSessionManager();
  }

  private initializeSessionManager(): void {
    this.logger.log('Initializing Widget Session Manager...');

    // Set up cleanup intervals
    setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
    setInterval(() => this.persistActiveSessions(), 300000); // Every 5 minutes

    this.logger.log('Widget Session Manager initialized successfully');
  }

  /**
   * Create or restore widget session
   */
  async createSession(
    widgetId: string,
    context: WidgetSessionContext,
    userId?: string
  ): Promise<WidgetSessionState> {
    this.logger.debug(`Creating session for widget ${widgetId}`);

    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, isActive: true, isDeployed: true },
    });

    if (!widget) {
      throw new Error('Widget not found or inactive');
    }

    // Create base session
    const baseSession = await this.sessionService.createSession({
      userId: userId || '',
      organizationId: widget.organizationId,
      metadata: {
        widgetId,
        origin: context.origin,
        deviceType: context.deviceType,
      },
    });

    const sessionState: WidgetSessionState = {
      sessionId: baseSession.id,
      widgetId,
      userId,
      organizationId: widget.organizationId,
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + (widget.configuration.behavior.sessionTimeout || 1800000)), // 30 minutes default
      metadata: {
        widgetVersion: widget.version,
        configuration: widget.configuration,
        createdFrom: 'widget',
      },
      context,
      messages: [],
      variables: {},
      executionHistory: [],
    };

    // Store in memory for fast access
    this.activeSessions.set(baseSession.id, sessionState);

    // Set up session timeout
    this.setupSessionTimeout(baseSession.id);

    // Emit session created event
    this.websocketService.broadcastToOrganization(widget.organizationId, 'widget:session:created', {
      sessionId: baseSession.id,
      widgetId,
      context,
    });

    this.logger.debug(`Session created: ${baseSession.id}`);
    return sessionState;
  }

  /**
   * Get active session
   */
  async getSession(sessionId: string): Promise<WidgetSessionState | null> {
    // Check memory first
    const memorySession = this.activeSessions.get(sessionId);
    if (memorySession) {
      return memorySession;
    }

    // Try to restore from database
    const dbSession = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (dbSession && dbSession.expiresAt > new Date()) {
      // Restore to memory
      const sessionState = await this.restoreSessionFromDB(dbSession);
      this.activeSessions.set(sessionId, sessionState);
      this.setupSessionTimeout(sessionId);
      return sessionState;
    }

    return null;
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string, metadata?: Record<string, any>): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    session.lastActivity = new Date();

    if (metadata) {
      session.metadata = { ...session.metadata, ...metadata };
    }

    // Reset timeout
    this.setupSessionTimeout(sessionId);

    // Emit activity update
    this.websocketService.broadcastToUser(session.userId || '', 'widget:session:activity', {
      sessionId,
      lastActivity: session.lastActivity,
    });
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    message: Omit<WidgetSessionMessage, 'id' | 'timestamp'>
  ): Promise<WidgetSessionMessage> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const fullMessage: WidgetSessionMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      ...message,
    };

    session.messages.push(fullMessage);
    session.lastActivity = new Date();

    // Keep only last 100 messages in memory
    if (session.messages.length > 100) {
      session.messages = session.messages.slice(-100);
    }

    // Emit message added event
    this.websocketService.broadcastToUser(
      session.userId || '',
      'widget:session:message',
      fullMessage
    );

    return fullMessage;
  }

  /**
   * Update session variables
   */
  async updateVariables(sessionId: string, variables: Record<string, any>): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.variables = { ...session.variables, ...variables };
    session.lastActivity = new Date();

    // Emit variables updated event
    this.websocketService.broadcastToUser(session.userId || '', 'widget:session:variables', {
      sessionId,
      variables: session.variables,
    });
  }

  /**
   * Add execution to history
   */
  async addExecution(sessionId: string, executionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.executionHistory.push(executionId);
    session.lastActivity = new Date();

    // Keep only last 50 executions
    if (session.executionHistory.length > 50) {
      session.executionHistory = session.executionHistory.slice(-50);
    }
  }

  /**
   * Get session metrics
   */
  async getSessionMetrics(sessionId: string): Promise<WidgetSessionMetrics> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const executions = await this.widgetExecutionRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });

    const totalExecutions = executions.length;
    const errorCount = executions.filter((e) => e.status === 'failed').length;
    const completedExecutions = executions.filter((e) => e.status === 'completed');

    const averageResponseTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + e.executionTimeMs, 0) /
          completedExecutions.length
        : 0;

    const sessionDuration = Date.now() - session.createdAt.getTime();

    return {
      totalMessages: session.messages.length,
      totalExecutions,
      averageResponseTime,
      errorCount,
      lastInteraction: session.lastActivity,
      sessionDuration,
    };
  }

  /**
   * End session
   */
  async endSession(sessionId: string, reason: string = 'user_ended'): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    this.logger.debug(`Ending session ${sessionId}: ${reason}`);

    session.status = 'inactive';
    session.lastActivity = new Date();

    // Clear timeout
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }

    // Persist final state
    await this.persistSession(session);

    // Remove from memory
    this.activeSessions.delete(sessionId);

    // Emit session ended event
    this.websocketService.broadcastToUser(session.userId || '', 'widget:session:ended', {
      sessionId,
      reason,
      endedAt: new Date(),
    });

    this.logger.debug(`Session ended: ${sessionId}`);
  }

  /**
   * Get all active sessions for a widget
   */
  getActiveSessionsForWidget(widgetId: string): WidgetSessionState[] {
    return Array.from(this.activeSessions.values()).filter(
      (session) => session.widgetId === widgetId && session.status === 'active'
    );
  }

  /**
   * Get session count by widget
   */
  getSessionCountByWidget(): Map<string, number> {
    const counts = new Map<string, number>();

    for (const session of this.activeSessions.values()) {
      if (session.status === 'active') {
        counts.set(session.widgetId, (counts.get(session.widgetId) || 0) + 1);
      }
    }

    return counts;
  }

  // Private helper methods

  private setupSessionTimeout(sessionId: string): void {
    // Clear existing timeout
    const existingTimeout = this.sessionTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    const timeoutMs = session.expiresAt.getTime() - Date.now();

    if (timeoutMs > 0) {
      const timeout = setTimeout(() => {
        this.handleSessionTimeout(sessionId);
      }, timeoutMs);

      this.sessionTimeouts.set(sessionId, timeout);
    }
  }

  private async handleSessionTimeout(sessionId: string): Promise<void> {
    this.logger.debug(`Session timeout: ${sessionId}`);
    await this.endSession(sessionId, 'timeout');
  }

  private async restoreSessionFromDB(dbSession: Session): Promise<WidgetSessionState> {
    // This would restore session state from database
    // For now, create a basic session state
    return {
      sessionId: dbSession.id,
      widgetId: dbSession.metadata?.widgetId || '',
      userId: dbSession.userId,
      organizationId: dbSession.organizationId,
      status: 'active',
      createdAt: dbSession.createdAt,
      lastActivity: new Date(),
      expiresAt: dbSession.expiresAt,
      metadata: dbSession.metadata || {},
      context: {
        origin: dbSession.metadata?.origin || '',
        userAgent: '',
        ipAddress: '',
        deviceType: dbSession.metadata?.deviceType || 'desktop',
        browserInfo: { name: '', version: '' },
      },
      messages: [],
      variables: {},
      executionHistory: [],
    };
  }

  private async persistSession(session: WidgetSessionState): Promise<void> {
    try {
      await this.sessionRepository.update(session.sessionId, {
        metadata: {
          ...session.metadata,
          messages: session.messages.slice(-10), // Keep only last 10 messages
          variables: session.variables,
          executionHistory: session.executionHistory.slice(-10),
          lastActivity: session.lastActivity,
          status: session.status,
        },
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      this.logger.error(`Failed to persist session ${session.sessionId}:`, error);
    }
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now || session.status !== 'active') {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.endSession(sessionId, 'expired');
    }

    if (expiredSessions.length > 0) {
      this.logger.debug(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  private async persistActiveSessions(): Promise<void> {
    const persistPromises: Promise<void>[] = [];

    for (const session of this.activeSessions.values()) {
      if (session.status === 'active') {
        persistPromises.push(this.persistSession(session));
      }
    }

    try {
      await Promise.all(persistPromises);
      this.logger.debug(`Persisted ${persistPromises.length} active sessions`);
    } catch (error) {
      this.logger.error('Failed to persist some sessions:', error);
    }
  }
}
