import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { ConnectionService, MessageProtocol } from './connection.service';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;

  constructor(private readonly connectionService: ConnectionService) {}

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
