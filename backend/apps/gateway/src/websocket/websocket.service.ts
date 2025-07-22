import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { ConnectionService, MessageProtocol } from './connection.service';
import {
  IEventPublication,
  ICrossModuleEvent,
  IEventTargeting,
} from '@shared/interfaces';
import {
  EventType,
  WebSocketEventType,
  EventTargetType,
  EventPriority,
} from '@shared/enums';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebSocketService implements OnModuleInit {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.logger.log('WebSocket Service initialized');
  }

  setServer(server: Server): void {
    this.server = server;
    this.logger.log('WebSocket server instance set');
  }

  // Broadcast to all connections
  async broadcastToAll(event: string, payload: any): Promise<void> {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const message = this.connectionService.createMessage(event, payload);
    this.server.emit('message', message);
    this.logger.debug(`Broadcasted to all: ${event}`);
  }

  // Broadcast to specific user
  async broadcastToUser(
    userId: string,
    event: string,
    payload: any,
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const message = this.connectionService.createMessage(
      event,
      payload,
      userId,
    );
    this.server.to(`user:${userId}`).emit('message', message);
    this.logger.debug(`Broadcasted to user ${userId}: ${event}`);
  }

  // Broadcast to organization
  async broadcastToOrganization(
    organizationId: string,
    event: string,
    payload: any,
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const message = this.connectionService.createMessage(
      event,
      payload,
      undefined,
      organizationId,
    );
    this.server.to(`org:${organizationId}`).emit('message', message);
    this.logger.debug(`Broadcasted to org ${organizationId}: ${event}`);
  }

  // Broadcast to specific room
  async broadcastToRoom(
    room: string,
    event: string,
    payload: any,
    userId?: string,
    organizationId?: string,
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const message = this.connectionService.createMessage(
      event,
      payload,
      userId,
      organizationId,
    );
    this.server.to(room).emit('message', message);
    this.logger.debug(`Broadcasted to room ${room}: ${event}`);
  }

  // Send activity updates
  async sendActivityUpdate(
    organizationId: string,
    activityData: any,
  ): Promise<void> {
    await this.broadcastToOrganization(
      organizationId,
      'activity_update',
      activityData,
    );
  }

  // Send stats updates
  async sendStatsUpdate(organizationId: string, statsData: any): Promise<void> {
    await this.broadcastToOrganization(
      organizationId,
      'stats_update',
      statsData,
    );
  }

  // Send resource usage updates
  async sendResourceUpdate(
    organizationId: string,
    resourceData: any,
  ): Promise<void> {
    await this.broadcastToOrganization(
      organizationId,
      'resource_update',
      resourceData,
    );
  }

  // Send agent execution updates
  async sendAgentExecutionUpdate(
    organizationId: string,
    executionData: any,
  ): Promise<void> {
    await this.broadcastToOrganization(
      organizationId,
      'agent_execution_update',
      executionData,
    );
  }

  // Send workflow execution updates
  async sendWorkflowExecutionUpdate(
    organizationId: string,
    executionData: any,
  ): Promise<void> {
    await this.broadcastToOrganization(
      organizationId,
      'workflow_execution_update',
      executionData,
    );
  }

  // Send tool execution updates
  async sendToolExecutionUpdate(
    organizationId: string,
    executionData: any,
  ): Promise<void> {
    await this.broadcastToOrganization(
      organizationId,
      'tool_execution_update',
      executionData,
    );
  }

  // Send system notifications
  async sendSystemNotification(
    organizationId: string,
    notification: {
      type: 'info' | 'warning' | 'error' | 'success';
      title: string;
      message: string;
      timestamp?: Date;
    },
  ): Promise<void> {
    await this.broadcastToOrganization(organizationId, 'system_notification', {
      ...notification,
      timestamp: notification.timestamp || new Date(),
    });
  }

  // Publish event with targeting
  async publishEvent(
    eventType: string,
    payload: any,
    targetType: 'all' | 'tenant' | 'user' | 'flow' = 'tenant',
    targetId?: string,
    organizationId?: string,
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    // Use connection service for proper targeting and Redis pub/sub
    await this.connectionService.publishEvent(eventType, payload, {
      type: targetType as EventTargetType,
      targetId,
      organizationId: organizationId || '',
    });

    this.logger.debug(
      `Published event ${eventType} with targeting: ${targetType}${targetId ? `:${targetId}` : ''}`,
    );
  }

  // Handle internal event publishing from connection service
  @OnEvent('websocket.publish')
  async handleEventPublication(data: {
    eventPublication: IEventPublication;
    message: MessageProtocol;
    targetConnections: string[];
  }): Promise<void> {
    if (!this.server) {
      this.logger.warn(
        'WebSocket server not initialized for event publication',
      );
      return;
    }

    const { message, targetConnections } = data;
    let deliveredCount = 0;

    // Send to each target connection
    for (const connectionId of targetConnections) {
      const connection =
        this.connectionService.getConnectionBySocketId(connectionId);
      if (connection) {
        try {
          // Send to user's room
          this.server.to(`user:${connection.userId}`).emit('message', message);
          deliveredCount++;
        } catch (error) {
          this.logger.error(
            `Failed to deliver message to connection ${connectionId}: ${error.message}`,
          );
        }
      }
    }

    this.logger.debug(
      `Event ${data.eventPublication.eventType} delivered to ${deliveredCount}/${targetConnections.length} connections`,
    );
  }

  // Cross-module event routing
  async routeCrossModuleEvent(
    sourceModule: string,
    targetModule: string,
    eventType: EventType | WebSocketEventType,
    payload: any,
    context: {
      userId: string;
      organizationId: string;
      sessionId?: string;
      workflowId?: string;
      agentId?: string;
      toolId?: string;
    },
    metadata?: Record<string, any>,
  ): Promise<void> {
    const crossModuleEvent: ICrossModuleEvent = {
      sourceModule,
      targetModule,
      eventType,
      payload,
      context,
      metadata,
    };

    await this.connectionService.routeCrossModuleEvent(crossModuleEvent);
  }

  // Broadcast to event subscribers
  async broadcastToSubscribers(
    eventType: string,
    payload: any,
    organizationId?: string,
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const subscribers = this.connectionService.getSubscribersForEvent(
      eventType,
      organizationId,
    );

    if (subscribers.length === 0) {
      this.logger.debug(`No subscribers found for event: ${eventType}`);
      return;
    }

    const message = this.connectionService.createMessage(
      eventType,
      payload,
      undefined,
      organizationId,
    );

    // Emit to each subscriber's socket
    for (const connectionId of subscribers) {
      const connection =
        this.connectionService.getConnectionBySocketId(connectionId);
      if (connection) {
        // Find socket by connection info and emit
        this.server.to(`user:${connection.userId}`).emit('message', message);
      }
    }

    this.logger.debug(
      `Broadcasted event ${eventType} to ${subscribers.length} subscribers`,
    );
  }

  // Send targeted event to specific flow participants
  async sendFlowEvent(
    flowId: string,
    eventType: string,
    payload: any,
    organizationId: string,
  ): Promise<void> {
    const flowEventType = `FLOW:${flowId}:${eventType}`;
    await this.publishEvent(
      flowEventType,
      { ...payload, flowId },
      'flow',
      flowId,
      organizationId,
    );
  }

  // Send node-specific events (for canvas/flow updates)
  async sendNodeEvent(
    nodeId: string,
    eventType: 'NODE_MOVED' | 'NODE_CREATED' | 'NODE_DELETED' | 'NODE_UPDATED',
    payload: any,
    organizationId: string,
    flowId?: string,
  ): Promise<void> {
    const nodeEventType = flowId
      ? `${eventType}:${flowId}:${nodeId}`
      : `${eventType}:${nodeId}`;

    await this.publishEvent(
      nodeEventType,
      { ...payload, nodeId, flowId },
      'tenant',
      undefined,
      organizationId,
    );
  }

  // Get connection statistics
  getConnectionStats(): {
    totalConnections: number;
    connectionsByOrg: Record<string, number>;
    averageConnectionTime: number;
  } {
    return this.connectionService.getConnectionStats();
  }

  // Check if server is ready
  isReady(): boolean {
    return !!this.server;
  }
}
