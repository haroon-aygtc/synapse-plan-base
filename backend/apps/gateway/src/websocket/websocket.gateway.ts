import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConnectionService, MessageProtocol } from './connection.service';
import { WebSocketService } from './websocket.service';
import { APXSchemaService } from './apix-schema.service';
import { APXPermissionService } from './apix-permission.service';
import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
} from 'class-validator';
import {
  APXMessageType,
  APXSecurityLevel,
  APXPermissionLevel,
} from '@shared/enums';
import {
  IAPXMessage,
  IAPXMessageSchema,
  IAPXValidationError,
  IAPXPermissionDenied,
  IAPXRateLimitExceeded,
} from '@shared/interfaces';
import { v4 as uuidv4 } from 'uuid';

class WebSocketMessageDto {
  @IsString()
  event: string;

  @IsObject()
  @IsOptional()
  payload?: any;

  @IsString()
  @IsOptional()
  targetUserId?: string;

  @IsString()
  @IsOptional()
  targetOrganizationId?: string;
}

// APIX Protocol Message DTOs
class APXMessageDto {
  @IsEnum(APXMessageType)
  type: APXMessageType;

  @IsString()
  session_id: string;

  @IsObject()
  payload: any;

  @IsString()
  @IsOptional()
  request_id?: string;

  @IsString()
  @IsOptional()
  correlation_id?: string;

  @IsEnum(APXSecurityLevel)
  @IsOptional()
  security_level?: APXSecurityLevel;

  @IsArray()
  @IsEnum(APXPermissionLevel, { each: true })
  @IsOptional()
  permissions?: APXPermissionLevel[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

class APXStreamControlDto {
  @IsString()
  execution_id: string;

  @IsEnum(['pause', 'resume'])
  action: 'pause' | 'resume';

  @IsString()
  @IsOptional()
  reason?: string;
}

class APXSubscriptionDto {
  @IsEnum(APXMessageType)
  message_type: APXMessageType;

  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @IsString()
  @IsOptional()
  target_id?: string;
}

/**
 * WebSocket Gateway implementation for APIX protocol
 * Handles real-time communication, message validation, and event routing
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WebSocketGatewayImpl
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGatewayImpl.name);
  private readonly messageSchemas = new Map<
    APXMessageType,
    IAPXMessageSchema
  >();
  private readonly rateLimiters = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly activeStreams = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly connectionService: ConnectionService,
    private readonly websocketService: WebSocketService,
    private readonly apxSchemaService: APXSchemaService,
    private readonly apxPermissionService: APXPermissionService,
  ) {
    this.initializeMessageSchemas();
  }

  afterInit(server: Server): void {
    this.logger.log('APIX WebSocket Gateway initialized');
    this.websocketService.setServer(server);
    this.startRateLimitCleanup();
  }

  private initializeMessageSchemas(): void {
    // Load schemas from the APXSchemaService
    for (const messageType of Object.values(APXMessageType)) {
      const schema = this.apxSchemaService.getMessageSchema(
        messageType as APXMessageType,
      );
      if (schema) {
        this.messageSchemas.set(messageType as APXMessageType, schema);
      }
    }
  }

  private startRateLimitCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, limiter] of this.rateLimiters.entries()) {
        if (now > limiter.resetTime) {
          this.rateLimiters.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect(true);
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      const { sub: userId, organizationId, role } = payload;

      if (!userId || !organizationId) {
        this.logger.warn(`Connection rejected: Invalid token payload`);
        client.disconnect(true);
        return;
      }

      // Add connection to service
      const connectionId = await this.connectionService.addConnection(
        client,
        userId,
        organizationId,
        role,
      );

      // Store user info in socket
      client.data = {
        userId,
        organizationId,
        connectionId,
        role,
      } as {
        userId: string;
        organizationId: string;
        connectionId: string;
        role: string;
      };

      // Join user and organization rooms
      await client.join(`user:${userId}`);
      await client.join(`org:${organizationId}`);
      if (role) {
        await client.join(`role:${role}:${organizationId}`);
      }

      // Send APIX connection acknowledgment
      const apxConnectionAck: IAPXMessage = {
        type: APXMessageType.CONNECTION_ACK,
        session_id: connectionId,
        payload: {
          connection_id: connectionId,
          session_id: connectionId,
          server_time: new Date().toISOString(),
          protocol_version: '1.0.0',
          supported_features: [
            'streaming',
            'compression',
            'encryption',
            'cross_module_events',
            'real_time_orchestration',
          ],
          rate_limits: {
            messages_per_minute: this.apxPermissionService.getRateLimit(
              role,
              'messages',
            ),
            executions_per_hour: this.apxPermissionService.getRateLimit(
              role,
              'executions',
            ),
            concurrent_streams: this.apxPermissionService.getRateLimit(
              role,
              'streams',
            ),
          },
        },
        timestamp: new Date().toISOString(),
        request_id: uuidv4(),
        user_id: userId,
        organization_id: organizationId,
        security_level: this.getSecurityLevel(role),
        permissions: this.getPermissions(role),
      };

      client.emit('apx_message', apxConnectionAck);

      // Also send legacy connection confirmation for backward compatibility
      const confirmationMessage = this.connectionService.createMessage(
        'connection_established',
        {
          connectionId,
          userId,
          organizationId,
          role,
          serverTime: new Date().toISOString(),
          capabilities: {
            eventSubscription: true,
            eventPublishing: role !== 'VIEWER',
            crossModuleEvents: true,
            eventReplay: ['ORG_ADMIN', 'SUPER_ADMIN'].includes(role),
            apxProtocol: true,
          },
        },
        userId,
        organizationId,
      );

      client.emit('message', confirmationMessage);

      // Broadcast connection stats to organization
      const stats = this.connectionService.getConnectionStats();
      const statsMessage = this.connectionService.createMessage(
        'connection_stats_update',
        stats,
        undefined,
        organizationId,
      );

      this.server.to(`org:${organizationId}`).emit('message', statsMessage);

      this.logger.log(
        `Client connected: ${client.id} (User: ${userId}, Org: ${organizationId}, Role: ${role})`,
      );
    } catch (error) {
      this.logger.error(
        `Connection error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    try {
      const { userId, organizationId } = client.data || {};

      if (userId && organizationId) {
        // Remove connection from service
        await this.connectionService.removeConnection(client.id);

        // Broadcast updated connection stats
        const stats = this.connectionService.getConnectionStats();
        const statsMessage = this.connectionService.createMessage(
          'connection_stats_update',
          stats,
          undefined,
          organizationId,
        );

        this.server.to(`org:${organizationId}`).emit('message', statsMessage);

        this.logger.log(
          `Client disconnected: ${client.id} (User: ${userId}, Org: ${organizationId})`,
        );
      } else {
        this.logger.log(`Client disconnected: ${client.id} (No user data)`);
      }
    } catch (error) {
      this.logger.error(
        `Disconnect error: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ): Promise<void> {
    try {
      await this.connectionService.updateHeartbeat(client.id);

      const response = this.connectionService.createMessage(
        'heartbeat_ack',
        {
          timestamp: new Date().toISOString(),
          connectionId: client.data?.connectionId,
        },
        client.data?.userId,
        client.data?.organizationId,
      );

      client.emit('message', response);
    } catch (error) {
      this.logger.error(
        `Heartbeat error: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() messageDto: WebSocketMessageDto,
  ): Promise<void> {
    try {
      const { userId, organizationId } = client.data || {};

      if (!userId || !organizationId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const message = this.connectionService.createMessage(
        messageDto.event,
        messageDto.payload,
        userId,
        organizationId,
      );

      // Route message based on target
      if (messageDto.targetUserId) {
        this.server
          .to(`user:${messageDto.targetUserId}`)
          .emit('message', message);
      } else if (messageDto.targetOrganizationId) {
        this.server
          .to(`org:${messageDto.targetOrganizationId}`)
          .emit('message', message);
      } else {
        // Broadcast to organization by default
        this.server.to(`org:${organizationId}`).emit('message', message);
      }

      this.logger.debug(
        `Message sent: ${messageDto.event} from user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Message handling error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.emit('error', { message: 'Message processing failed' });
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ): Promise<void> {
    try {
      const { userId, organizationId, role } = client.data || {};

      if (!userId || !organizationId) {
        client.emit('error', {
          message: 'Unauthorized - missing authentication data',
        });
        return;
      }

      // Enhanced room access validation with tenant filtering
      const roomValidation = this.validateRoomAccess(
        data.room,
        userId,
        organizationId,
        role,
      );

      if (!roomValidation.allowed) {
        this.logger.warn(
          `Room access denied for user ${userId}: ${data.room} - ${roomValidation.reason}`,
        );
        client.emit('error', {
          message: 'Room access denied',
          reason: roomValidation.reason,
          code: 'ROOM_ACCESS_DENIED',
        });
        return;
      }

      await client.join(data.room);

      const response = this.connectionService.createMessage(
        'room_joined',
        {
          room: data.room,
          permissions: roomValidation.permissions,
          joinedAt: new Date().toISOString(),
        },
        userId,
        organizationId,
      );

      client.emit('message', response);
      this.logger.debug(
        `Client ${client.id} joined room: ${data.room} with permissions: ${JSON.stringify(roomValidation.permissions)}`,
      );
    } catch (error) {
      this.logger.error(
        `Join room error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.emit('error', {
        message: 'Failed to join room',
        code: 'ROOM_JOIN_ERROR',
      });
    }
  }

  private validateEventSubscription(
    eventType: string,
    userId: string,
    organizationId: string,
    role: string,
  ): {
    allowed: boolean;
    reason?: string;
    permissions?: string[];
  } {
    const permissions: string[] = [];

    // Parse event type for validation
    const [category, ...eventParts] = eventType.split(':');
    const eventName = eventParts.join(':');

    switch (category) {
      case 'NODE_MOVED':
      case 'NODE_CREATED':
      case 'NODE_DELETED':
      case 'NODE_UPDATED':
        // Flow/canvas events - all authenticated users can subscribe
        permissions.push('read');
        if (role !== 'VIEWER') {
          permissions.push('write');
        }
        return { allowed: true, permissions };

      case 'AGENT_EXECUTION':
      case 'TOOL_EXECUTION':
      case 'WORKFLOW_EXECUTION':
        // Execution events - all users can subscribe to their org's events
        permissions.push('read');
        return { allowed: true, permissions };

      case 'SYSTEM_NOTIFICATION':
      case 'RESOURCE_UPDATE':
      case 'STATS_UPDATE':
        // System events - all authenticated users
        permissions.push('read');
        return { allowed: true, permissions };

      case 'ADMIN_EVENT':
      case 'BILLING_UPDATE':
        // Admin-only events
        if (role === 'ORG_ADMIN' || role === 'SUPER_ADMIN') {
          permissions.push('read', 'admin');
          return { allowed: true, permissions };
        }
        return { allowed: false, reason: 'Admin access required' };

      case 'USER_ACTIVITY':
        // User can subscribe to their own activity or admins to any
        if (
          eventName === userId ||
          role === 'ORG_ADMIN' ||
          role === 'SUPER_ADMIN'
        ) {
          permissions.push('read');
          return { allowed: true, permissions };
        }
        return {
          allowed: false,
          reason: 'Can only subscribe to your own user activity',
        };

      case 'FLOW':
        // Flow-specific events - validate flow access
        permissions.push('read');
        if (role !== 'VIEWER') {
          permissions.push('write');
        }
        return { allowed: true, permissions };

      default:
        // Custom or unknown event types - allow with basic permissions
        permissions.push('read');
        return { allowed: true, permissions };
    }
  }

  private validateEventPublishing(
    eventType: string,
    targetType: string,
    userId: string,
    organizationId: string,
    role: string,
  ): {
    allowed: boolean;
    reason?: string;
  } {
    const [category] = eventType.split(':');

    // System events can only be published by the system or admins
    if (
      ['SYSTEM_NOTIFICATION', 'RESOURCE_UPDATE', 'STATS_UPDATE'].includes(
        category,
      )
    ) {
      if (role === 'ORG_ADMIN' || role === 'SUPER_ADMIN') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'System events require admin privileges',
      };
    }

    // Admin events require admin role
    if (['ADMIN_EVENT', 'BILLING_UPDATE'].includes(category)) {
      if (role === 'ORG_ADMIN' || role === 'SUPER_ADMIN') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Admin events require admin privileges',
      };
    }

    // Viewers cannot publish most events
    if (role === 'VIEWER') {
      return { allowed: false, reason: 'Viewers cannot publish events' };
    }

    // Cross-tenant publishing not allowed
    if (targetType === 'tenant' && organizationId) {
      return { allowed: true };
    }

    // Default allow for other event types
    return { allowed: true };
  }

  private validateRoomAccess(
    room: string,
    userId: string,
    organizationId: string,
    role: string,
  ): {
    allowed: boolean;
    reason?: string;
    permissions?: string[];
  } {
    const [roomType, roomOrgId, ...roomParams] = room.split(':');

    // Ensure room belongs to user's organization (tenant filtering)
    if (roomOrgId && roomOrgId !== organizationId) {
      return {
        allowed: false,
        reason: 'Cross-tenant room access not allowed',
      };
    }

    const permissions: string[] = [];

    switch (roomType) {
      case 'user':
        // Users can only join their own user room
        if (roomParams[0] === userId) {
          permissions.push('read', 'write');
          return { allowed: true, permissions };
        }
        return { allowed: false, reason: 'Can only join your own user room' };

      case 'org':
        // All authenticated users can join their org room
        if (roomOrgId === organizationId) {
          permissions.push('read', 'write');
          return { allowed: true, permissions };
        }
        return { allowed: false, reason: 'Organization mismatch' };

      case 'agent':
      case 'workflow':
      case 'tool':
      case 'knowledge':
        // Resource rooms within organization
        if (roomOrgId === organizationId) {
          permissions.push('read');
          if (
            role === 'ORG_ADMIN' ||
            role === 'SUPER_ADMIN' ||
            role === 'DEVELOPER'
          ) {
            permissions.push('write');
          }
          return { allowed: true, permissions };
        }
        return { allowed: false, reason: 'Resource not in your organization' };

      case 'admin':
        // Admin rooms - restricted access
        if (
          roomOrgId === organizationId &&
          (role === 'ORG_ADMIN' || role === 'SUPER_ADMIN')
        ) {
          permissions.push('read', 'write', 'admin');
          return { allowed: true, permissions };
        }
        return { allowed: false, reason: 'Admin access required' };

      case 'execution':
        // Execution monitoring rooms
        if (roomOrgId === organizationId) {
          permissions.push('read');
          if (role !== 'VIEWER') {
            permissions.push('write');
          }
          return { allowed: true, permissions };
        }
        return {
          allowed: false,
          reason: 'Execution room not in your organization',
        };

      default:
        return { allowed: false, reason: 'Unknown room type' };
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ): Promise<void> {
    try {
      await client.leave(data.room);

      const response = this.connectionService.createMessage(
        'room_left',
        { room: data.room },
        client.data?.userId,
        client.data?.organizationId,
      );

      client.emit('message', response);
      this.logger.debug(`Client ${client.id} left room: ${data.room}`);
    } catch (error) {
      this.logger.error(
        `Leave room error: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  @SubscribeMessage('subscribe_event')
  async handleSubscribeEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      eventType: string;
      targetType?: string;
      targetId?: string;
      filters?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const { userId, organizationId, connectionId, role } = client.data || {};

      if (!userId || !organizationId || !connectionId) {
        client.emit('error', {
          message: 'Unauthorized',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const success = await this.connectionService.subscribeToEvent(
        connectionId,
        data.eventType,
        (data.targetType as any) || 'tenant',
        data.targetId,
        data.filters,
      );

      const response = this.connectionService.createMessage(
        success ? 'subscription_confirmed' : 'subscription_error',
        {
          eventType: data.eventType,
          targetType: data.targetType,
          targetId: data.targetId,
          success,
          timestamp: new Date().toISOString(),
        },
        userId,
        organizationId,
      );

      client.emit('message', response);

      if (success) {
        this.logger.debug(
          `Client ${client.id} subscribed to event: ${data.eventType}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Subscribe event error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.emit('error', {
        message: 'Subscription failed',
        code: 'SUBSCRIPTION_ERROR',
      });
    }
  }

  @SubscribeMessage('unsubscribe_event')
  async handleUnsubscribeEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventType: string },
  ): Promise<void> {
    try {
      const { userId, organizationId, connectionId } = client.data || {};

      if (!userId || !organizationId || !connectionId) {
        client.emit('error', {
          message: 'Unauthorized',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const success = await this.connectionService.unsubscribeFromEvent(
        connectionId,
        data.eventType,
      );

      const response = this.connectionService.createMessage(
        'unsubscription_confirmed',
        {
          eventType: data.eventType,
          success,
          timestamp: new Date().toISOString(),
        },
        userId,
        organizationId,
      );

      client.emit('message', response);

      this.logger.debug(
        `Client ${client.id} unsubscribed from event: ${data.eventType}`,
      );
    } catch (error) {
      this.logger.error(
        `Unsubscribe event error: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  @SubscribeMessage('publish_event')
  async handlePublishEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      eventType: string;
      payload: any;
      targetType?: string;
      targetId?: string;
      priority?: string;
      correlationId?: string;
    },
  ): Promise<void> {
    try {
      const { userId, organizationId, role } = client.data || {};

      if (!userId || !organizationId) {
        client.emit('error', {
          message: 'Unauthorized',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Validate publishing permissions
      const canPublish = this.validateEventPublishing(
        data.eventType,
        data.targetType || 'tenant',
        userId,
        organizationId,
        role,
      );

      if (!canPublish.allowed) {
        client.emit('error', {
          message: 'Publishing denied',
          reason: canPublish.reason,
          code: 'PUBLISH_DENIED',
        });
        return;
      }

      const eventPublication = {
        eventId: this.connectionService.createMessage('', {}).messageId,
        eventType: data.eventType,
        sourceModule: 'websocket',
        payload: data.payload,
        targeting: {
          type: (data.targetType as any) || 'tenant',
          organizationId,
          targetId: data.targetId,
        },
        priority: (data.priority as any) || 'normal',
        correlationId: data.correlationId,
        timestamp: new Date(),
      };

      await this.connectionService.publishEvent(eventPublication);

      const response = this.connectionService.createMessage(
        'event_published',
        {
          eventId: eventPublication.eventId,
          eventType: data.eventType,
          timestamp: new Date().toISOString(),
        },
        userId,
        organizationId,
      );

      client.emit('message', response);

      this.logger.debug(
        `Client ${client.id} published event: ${data.eventType}`,
      );
    } catch (error) {
      this.logger.error(
        `Publish event error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.emit('error', {
        message: 'Publishing failed',
        code: 'PUBLISH_ERROR',
      });
    }
  }

  @SubscribeMessage('get_connection_stats')
  async handleGetConnectionStats(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const { userId, organizationId } = client.data || {};

      if (!userId || !organizationId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const stats = this.connectionService.getConnectionStats();
      const response = this.connectionService.createMessage(
        'connection_stats',
        stats,
        userId,
        organizationId,
      );

      client.emit('message', response);
    } catch (error) {
      this.logger.error(
        `Get stats error: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  @SubscribeMessage('get_subscription_stats')
  async handleGetSubscriptionStats(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const { userId, organizationId, role } = client.data || {};

      if (!userId || !organizationId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Only admins can view detailed subscription stats
      if (!['ORG_ADMIN', 'SUPER_ADMIN'].includes(role)) {
        client.emit('error', { message: 'Admin access required' });
        return;
      }

      const subscriptionStats = this.connectionService.getSubscriptionStats();
      const response = this.connectionService.createMessage(
        'subscription_stats',
        subscriptionStats,
        userId,
        organizationId,
      );

      client.emit('message', response);
    } catch (error) {
      this.logger.error(
        `Get subscription stats error: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  @SubscribeMessage('replay_events')
  async handleReplayEvents(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      fromTimestamp: string;
      toTimestamp?: string;
      eventTypes?: string[];
      userId?: string;
      correlationId?: string;
      maxEvents?: number;
    },
  ): Promise<void> {
    try {
      const { userId, organizationId, role } = client.data || {};

      if (!userId || !organizationId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Only admins can replay events
      if (!['ORG_ADMIN', 'SUPER_ADMIN'].includes(role)) {
        client.emit('error', {
          message: 'Admin access required for event replay',
        });
        return;
      }

      const replayRequest = {
        fromTimestamp: new Date(data.fromTimestamp),
        toTimestamp: data.toTimestamp ? new Date(data.toTimestamp) : undefined,
        eventTypes: data.eventTypes,
        organizationId,
        userId: data.userId,
        correlationId: data.correlationId,
        maxEvents: data.maxEvents || 1000,
      };

      await this.connectionService.replayEvents(replayRequest);

      const response = this.connectionService.createMessage(
        'event_replay_started',
        {
          replayRequest,
          timestamp: new Date().toISOString(),
        },
        userId,
        organizationId,
      );

      client.emit('message', response);

      this.logger.log(
        `Event replay initiated by user ${userId} for organization ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Event replay error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.emit('error', {
        message: 'Event replay failed',
        code: 'REPLAY_ERROR',
      });
    }
  }

  // APIX Protocol Message Handlers
  @SubscribeMessage('apx_message')
  async handleAPXMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() messageDto: APXMessageDto,
  ): Promise<void> {
    try {
      const { userId, organizationId, connectionId, role } = client.data || {};

      if (!userId || !organizationId || !connectionId) {
        this.sendAPXError(
          client,
          'AUTHENTICATION_REQUIRED',
          'User not authenticated',
        );
        return;
      }

      // Enhanced rate limiting check
      const rateLimitResult = await this.connectionService.enforceRateLimit(
        userId,
        organizationId,
        messageDto.type,
      );

      if (!rateLimitResult.allowed) {
        const rateLimitError: IAPXRateLimitExceeded = {
          error_code: 'RATE_LIMIT_EXCEEDED',
          error_message: 'Message rate limit exceeded',
          limit: this.apxPermissionService.getRateLimit(role, 'messages'),
          reset_at: new Date(
            rateLimitResult.resetTime || Date.now() + 60000,
          ).toISOString(),
        };
        this.sendAPXMessage(
          client,
          APXMessageType.RATE_LIMIT_EXCEEDED,
          rateLimitError,
          messageDto.request_id,
        );
        return;
      }

      // Enhanced message validation
      const fullMessage = {
        type: messageDto.type,
        session_id: messageDto.session_id,
        payload: messageDto.payload,
        timestamp: new Date().toISOString(),
        request_id: messageDto.request_id || uuidv4(),
        correlation_id: messageDto.correlation_id,
        user_id: userId,
        organization_id: organizationId,
        security_level:
          messageDto.security_level || this.getSecurityLevel(role),
        permissions: messageDto.permissions || this.getPermissions(role),
        metadata: messageDto.metadata,
      };

      // Validate message structure and security
      const validationResult =
        this.apxSchemaService.validateMessage(fullMessage);

      // Additional security validation
      const securityResult =
        await this.connectionService.validateMessageSecurity(
          fullMessage,
          userId,
          organizationId,
          role,
        );

      if (!securityResult.valid) {
        const securityError = {
          error_code: 'SECURITY_VIOLATION',
          error_message: securityResult.reason || 'Security validation failed',
          request_id: messageDto.request_id,
        };
        this.sendAPXMessage(
          client,
          APXMessageType.PERMISSION_DENIED,
          securityError,
          messageDto.request_id,
        );
        return;
      }

      if (!validationResult.valid && validationResult.errors) {
        this.sendAPXMessage(
          client,
          APXMessageType.VALIDATION_ERROR,
          validationResult.errors,
          messageDto.request_id,
        );
        return;
      }

      // Check permissions
      const hasPermission = this.checkMessagePermissions(
        messageDto.type,
        userId,
        organizationId,
        role,
      );
      if (!hasPermission) {
        const permissionError: IAPXPermissionDenied = {
          error_code: 'PERMISSION_DENIED',
          error_message: 'Insufficient permissions for this message type',
          required_permission: this.getRequiredPermission(messageDto.type),
          required_security_level: APXSecurityLevel.AUTHENTICATED,
          request_id: messageDto.request_id,
        };
        this.sendAPXMessage(
          client,
          APXMessageType.PERMISSION_DENIED,
          permissionError,
          messageDto.request_id,
        );
        return;
      }

      // Process the message based on type with full context
      await this.processAPXMessage(client, {
        ...messageDto,
        user_id: userId,
        organization_id: organizationId,
        security_level: fullMessage.security_level,
        permissions: fullMessage.permissions,
      } as APXMessageDto & { 
        user_id: string; 
        organization_id: string; 
        security_level: APXSecurityLevel;
        permissions: APXPermissionLevel[];
      });

      this.logger.debug(
        `Processed APIX message: ${messageDto.type} from user ${userId} in session ${messageDto.session_id}`,
      );
    } catch (error) {
      this.logger.error(
        `APIX message handling error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      this.sendAPXError(
        client,
        'PROCESSING_ERROR',
        'Failed to process message',
        messageDto.request_id,
      );
    }
  }

  @SubscribeMessage('apx_stream_control')
  async handleAPXStreamControl(
    @ConnectedSocket() client: Socket,
    @MessageBody() controlDto: APXStreamControlDto,
  ): Promise<void> {
    try {
      const { userId, organizationId, role } = client.data || {};

      if (!userId || !organizationId) {
        this.sendAPXError(
          client,
          'AUTHENTICATION_REQUIRED',
          'User not authenticated',
        );
        return;
      }

      // Check if user has permission to control this execution
      const hasPermission = await this.checkExecutionPermission(
        controlDto.execution_id,
        userId,
        organizationId,
      );
      if (!hasPermission) {
        this.sendAPXError(
          client,
          'PERMISSION_DENIED',
          'Cannot control this execution',
        );
        return;
      }

      // Process stream control
      await this.websocketService.handleStreamControl(
        controlDto.execution_id,
        controlDto.action,
        {
          userId,
          organizationId,
          reason: controlDto.reason,
        },
      );

      // Send confirmation
      this.sendAPXMessage(client, APXMessageType.STREAM_PAUSE, {
        execution_id: controlDto.execution_id,
        action: controlDto.action,
        requested_by: userId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Stream control applied: ${controlDto.action} on execution ${controlDto.execution_id} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Stream control error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      this.sendAPXError(
        client,
        'STREAM_CONTROL_ERROR',
        'Failed to control stream',
      );
    }
  }

  @SubscribeMessage('apx_subscribe')
  async handleAPXSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() subscriptionDto: APXSubscriptionDto,
  ): Promise<void> {
    try {
      const { userId, organizationId, connectionId, role } = client.data || {};

      if (!userId || !organizationId || !connectionId) {
        this.sendAPXError(
          client,
          'AUTHENTICATION_REQUIRED',
          'User not authenticated',
        );
        return;
      }

      // Check subscription permissions
      const hasPermission = this.checkSubscriptionPermissions(
        subscriptionDto.message_type,
        role,
      );
      if (!hasPermission) {
        this.sendAPXError(
          client,
          'PERMISSION_DENIED',
          'Cannot subscribe to this message type',
        );
        return;
      }

      // Create subscription
      const success = await this.connectionService.subscribeToEvent(
        connectionId,
        subscriptionDto.message_type,
        'tenant' as any,
        subscriptionDto.target_id,
        subscriptionDto.filters,
      );

      if (success) {
        this.sendAPXMessage(client, APXMessageType.CONNECTION_ACK, {
          subscription_confirmed: true,
          message_type: subscriptionDto.message_type,
          timestamp: new Date().toISOString(),
        });
      } else {
        this.sendAPXError(
          client,
          'SUBSCRIPTION_FAILED',
          'Failed to create subscription',
        );
      }
    } catch (error) {
      this.logger.error(
        `APIX subscription error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      this.sendAPXError(
        client,
        'SUBSCRIPTION_ERROR',
        'Subscription processing failed',
      );
    }
  }

  // Helper methods for APIX protocol
  private async processAPXMessage(
    client: Socket,
    message: APXMessageDto,
  ): Promise<void> {
    const { userId, organizationId } = client.data || {};

    switch (message.type) {
      case APXMessageType.AGENT_EXECUTION_STARTED:
        await this.websocketService.handleAgentExecutionStart(message.payload, {
          userId,
          organizationId,
          sessionId: message.session_id,
        });
        break;

      case APXMessageType.TOOL_CALL_START:
        await this.websocketService.handleToolCallStart(message.payload, {
          userId,
          organizationId,
          sessionId: message.session_id,
        });
        break;

      case APXMessageType.HITL_REQUEST_CREATED:
        await this.websocketService.handleHITLRequest(message.payload, {
          userId,
          organizationId,
          sessionId: message.session_id,
        });
        break;

      case APXMessageType.KB_SEARCH_PERFORMED:
        await this.websocketService.handleKnowledgeSearch(message.payload, {
          userId,
          organizationId,
          sessionId: message.session_id,
        });
        break;

      case APXMessageType.WIDGET_QUERY_SUBMITTED:
        await this.websocketService.handleWidgetQuery(message.payload, {
          userId,
          organizationId,
          sessionId: message.session_id,
        });
        break;

      default:
        this.logger.warn(`Unhandled APIX message type: ${message.type}`);
        this.sendAPXError(
          client,
          'UNSUPPORTED_MESSAGE_TYPE',
          `Message type ${message.type} is not supported`,
        );
    }
  }

  private checkMessagePermissions(
    messageType: APXMessageType,
    userId: string,
    organizationId: string,
    role: string,
  ): boolean {
    const schema = this.messageSchemas.get(messageType);
    if (!schema) return false;

    const userPermissions = this.getPermissions(role);
    const requiredPermission =
      schema.security_requirements.min_permission_level;

    return userPermissions.includes(requiredPermission);
  }

  private checkSubscriptionPermissions(
    messageType: APXMessageType,
    role: string,
  ): boolean {
    // Admin messages require admin role
    const adminMessages = [
      APXMessageType.SESSION_CREATED,
      APXMessageType.SESSION_ENDED,
    ];

    if (adminMessages.includes(messageType)) {
      return ['ORG_ADMIN', 'SUPER_ADMIN'].includes(role);
    }

    // Execution messages require execute permission
    const executionMessages = [
      APXMessageType.AGENT_EXECUTION_STARTED,
      APXMessageType.TOOL_CALL_START,
      APXMessageType.WORKFLOW_EXECUTION_STARTED,
    ];

    if (executionMessages.includes(messageType)) {
      return role !== 'VIEWER';
    }

    return true;
  }

  private async checkExecutionPermission(
    executionId: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    // This would typically check against a database or cache
    // For now, we'll assume users can control executions in their organization
    return true;
  }

  private checkRateLimit(
    userId: string,
    limitType: 'messages' | 'executions',
  ): boolean {
    const key = `${userId}:${limitType}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    const limiter = this.rateLimiters.get(key);
    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    const limit = limitType === 'messages' ? 100 : 50; // Default limits
    if (limiter.count >= limit) {
      return false;
    }

    limiter.count++;
    return true;
  }

  private getRateLimitUsage(
    userId: string,
    limitType: 'messages' | 'executions',
  ): number {
    const key = `${userId}:${limitType}`;
    const limiter = this.rateLimiters.get(key);
    return limiter?.count || 0;
  }

  // These methods are now handled by APXPermissionService
  // Keeping these as thin wrappers for backward compatibility
  private getRateLimit(
    role: string,
    limitType: 'messages' | 'executions' | 'streams',
  ): number {
    return this.apxPermissionService.getRateLimit(role, limitType);
  }

  private getSecurityLevel(role: string): APXSecurityLevel {
    return this.apxPermissionService.getSecurityLevel(role);
  }

  private getPermissions(role: string): APXPermissionLevel[] {
    return this.apxPermissionService.getPermissions(role);
  }

  private getRequiredPermission(
    messageType: APXMessageType,
  ): APXPermissionLevel {
    return this.apxPermissionService.getRequiredPermission(messageType);
  }

  private sendAPXMessage(
    client: Socket,
    type: APXMessageType,
    payload: any,
    requestId?: string,
  ): void {
    const { userId, organizationId, connectionId } = client.data || {};

    const message: IAPXMessage = {
      type,
      session_id: connectionId,
      payload,
      timestamp: new Date().toISOString(),
      request_id: requestId || uuidv4(),
      user_id: userId,
      organization_id: organizationId,
    };

    client.emit('apx_message', message);
  }

  private sendAPXError(
    client: Socket,
    errorCode: string,
    errorMessage: string,
    requestId?: string,
  ): void {
    const errorPayload = {
      error_code: errorCode,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    };

    this.sendAPXMessage(
      client,
      APXMessageType.VALIDATION_ERROR,
      errorPayload,
      requestId,
    );
  }
}