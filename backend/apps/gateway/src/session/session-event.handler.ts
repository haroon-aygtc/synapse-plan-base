import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SessionEventType } from '@shared/enums';
import { WebSocketService } from '../websocket/websocket.service';
import { logSafeError } from '@shared/utils/error-guards';

@Injectable()
export class SessionEventHandler {
  private readonly logger = new Logger(SessionEventHandler.name);

  constructor(private readonly websocketService: WebSocketService) {}

  @OnEvent(SessionEventType.SESSION_CREATED)
  async handleSessionCreated(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Broadcast session creation to user
      await this.websocketService.broadcastToUser(payload.userId, 'session_created', {
        sessionId: payload.sessionId,
        timestamp: payload.timestamp,
      });

      // Broadcast to organization admins
      await this.websocketService.broadcastToOrganization(
        payload.organizationId,
        'session_activity',
        {
          type: 'session_created',
          userId: payload.userId,
          sessionId: payload.sessionId,
          timestamp: payload.timestamp,
        }
      );

      this.logger.debug(`Session created event broadcasted: ${payload.sessionId}`);
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session created event', error);
    }
  }

  @OnEvent(SessionEventType.SESSION_UPDATED)
  async handleSessionUpdated(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    changes: Record<string, any>;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Broadcast session update to user
      await this.websocketService.broadcastToUser(payload.userId, 'session_updated', {
        sessionId: payload.sessionId,
        changes: payload.changes,
        timestamp: payload.timestamp,
      });

      this.logger.debug(`Session updated event broadcasted: ${payload.sessionId}`);
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session updated event', error);
    }
  }

  @OnEvent(SessionEventType.SESSION_EXPIRED)
  async handleSessionExpired(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Notify user of session expiration
      await this.websocketService.broadcastToUser(payload.userId, 'session_expired', {
        sessionId: payload.sessionId,
        message: 'Your session has expired. Please log in again.',
        timestamp: payload.timestamp,
      });

      this.logger.debug(`Session expired event broadcasted: ${payload.sessionId}`);
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session expired event', error);
    }
  }

  @OnEvent(SessionEventType.SESSION_DESTROYED)
  async handleSessionDestroyed(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Notify user of session destruction
      await this.websocketService.broadcastToUser(payload.userId, 'session_destroyed', {
        sessionId: payload.sessionId,
        timestamp: payload.timestamp,
      });

      this.logger.debug(`Session destroyed event broadcasted: ${payload.sessionId}`);
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session destroyed event', error);
    }
  }

  @OnEvent(SessionEventType.SESSION_CONTEXT_UPDATED)
  async handleSessionContextUpdated(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    contextUpdate: Record<string, any>;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Broadcast context update to user
      await this.websocketService.broadcastToUser(payload.userId, 'session_context_updated', {
        sessionId: payload.sessionId,
        contextUpdate: payload.contextUpdate,
        timestamp: payload.timestamp,
      });

      this.logger.debug(`Session context updated event broadcasted: ${payload.sessionId}`);
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session context updated event', error);
    }
  }

  @OnEvent(SessionEventType.SESSION_MEMORY_WARNING)
  async handleSessionMemoryWarning(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    memoryUsage: number;
    memoryLimit: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Send memory warning to user
      await this.websocketService.sendSystemNotification(payload.organizationId, {
        type: 'warning',
        title: 'Session Memory Warning',
        message: `Session ${payload.sessionId} is approaching memory limit (${Math.round((payload.memoryUsage / payload.memoryLimit) * 100)}% used)`,
        timestamp: payload.timestamp,
      });

      this.logger.warn(
        `Session memory warning: ${payload.sessionId} (${payload.memoryUsage}/${payload.memoryLimit} bytes)`
      );
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session memory warning', error);
    }
  }

  @OnEvent(SessionEventType.SESSION_MEMORY_LIMIT_EXCEEDED)
  async handleSessionMemoryLimitExceeded(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    memoryUsage: number;
    memoryLimit: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Send memory limit exceeded notification
      await this.websocketService.sendSystemNotification(payload.organizationId, {
        type: 'error',
        title: 'Session Memory Limit Exceeded',
        message: `Session ${payload.sessionId} has exceeded memory limit. Data has been truncated to prevent system issues.`,
        timestamp: payload.timestamp,
      });

      this.logger.error(
        `Session memory limit exceeded: ${payload.sessionId} (${payload.memoryUsage}/${payload.memoryLimit} bytes)`
      );
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session memory limit exceeded', error);
    }
  }

  @OnEvent(SessionEventType.SESSION_CROSS_MODULE_UPDATE)
  async handleSessionCrossModuleUpdate(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    moduleType: string;
    contextUpdate: Record<string, any>;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Broadcast cross-module update to relevant subscribers
      await this.websocketService.broadcastToOrganization(
        payload.organizationId,
        'session_cross_module_update',
        {
          sessionId: payload.sessionId,
          moduleType: payload.moduleType,
          contextUpdate: payload.contextUpdate,
          timestamp: payload.timestamp,
        }
      );

      this.logger.debug(
        `Session cross-module update broadcasted: ${payload.sessionId} (${payload.moduleType})`
      );
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session cross-module update', error);
    }
  }

  @OnEvent(SessionEventType.SESSION_RECOVERY_INITIATED)
  async handleSessionRecoveryInitiated(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    recoveryData: Record<string, any>;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Notify user of session recovery initiation
      await this.websocketService.broadcastToUser(payload.userId, 'session_recovery_initiated', {
        sessionId: payload.sessionId,
        recoveryData: payload.recoveryData,
        timestamp: payload.timestamp,
      });

      this.logger.log(`Session recovery initiated: ${payload.sessionId}`);
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session recovery initiated', error);
    }
  }

  @OnEvent(SessionEventType.SESSION_RECOVERY_COMPLETED)
  async handleSessionRecoveryCompleted(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Notify user of successful session recovery
      await this.websocketService.sendSystemNotification(payload.organizationId, {
        type: 'success',
        title: 'Session Recovery Completed',
        message: `Session ${payload.sessionId} has been successfully recovered.`,
        timestamp: payload.timestamp,
      });

      this.logger.log(`Session recovery completed: ${payload.sessionId}`);
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session recovery completed', error);
    }
  }

  @OnEvent(SessionEventType.SESSION_ANALYTICS_UPDATE)
  async handleSessionAnalyticsUpdate(payload: {
    organizationId: string;
    analytics: Record<string, any>;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Broadcast analytics update to organization admins
      await this.websocketService.broadcastToOrganization(
        payload.organizationId,
        'session_analytics_update',
        {
          analytics: payload.analytics,
          timestamp: payload.timestamp,
        }
      );

      this.logger.debug(`Session analytics update broadcasted for org: ${payload.organizationId}`);
    } catch (error) {
      logSafeError(this.logger, 'Failed to handle session analytics update', error);
    }
  }
}
