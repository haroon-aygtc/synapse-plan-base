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
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConnectionService, MessageProtocol } from './connection.service';
import { WebSocketService } from './websocket.service';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';

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

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly connectionService: ConnectionService,
    private readonly websocketService: WebSocketService,
  ) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket Gateway initialized');
    this.websocketService.setServer(server);
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
      const { userId, organizationId } = payload;

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
      );

      // Store user info in socket
      client.data = {
        userId,
        organizationId,
        connectionId,
      };

      // Join user and organization rooms
      await client.join(`user:${userId}`);
      await client.join(`org:${organizationId}`);

      // Send connection confirmation
      const confirmationMessage = this.connectionService.createMessage(
        'connection_established',
        {
          connectionId,
          userId,
          organizationId,
          serverTime: new Date().toISOString(),
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
        `Client connected: ${client.id} (User: ${userId}, Org: ${organizationId})`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, error.stack);
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
      this.logger.error(`Disconnect error: ${error.message}`, error.stack);
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
      this.logger.error(`Heartbeat error: ${error.message}`, error.stack);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() messageDto: WebSocketMessageDto,
  ): Promise<void> {
    try {
      const { userId, organizationId } = client.data;

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
        `Message handling error: ${error.message}`,
        error.stack,
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
      const { userId, organizationId, role } = client.data;

      if (!userId || !organizationId) {
        client.emit('error', { message: 'Unauthorized - missing authentication data' });
        return;
      }

      // Enhanced room access validation with tenant filtering
      const roomValidation = this.validateRoomAccess(data.room, userId, organizationId, role);
      
      if (!roomValidation.allowed) {
        this.logger.warn(`Room access denied for user ${userId}: ${data.room} - ${roomValidation.reason}`);
        client.emit('error', { 
          message: 'Room access denied',
          reason: roomValidation.reason,
          code: 'ROOM_ACCESS_DENIED'
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
      this.logger.debug(`Client ${client.id} joined room: ${data.room} with permissions: ${JSON.stringify(roomValidation.permissions)}`);
    } catch (error) {
      this.logger.error(`Join room error: ${error.message}`, error.stack);
      client.emit('error', { 
        message: 'Failed to join room',
        code: 'ROOM_JOIN_ERROR'
      });
    }
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
          if (role === 'ORG_ADMIN' || role === 'SUPER_ADMIN' || role === 'DEVELOPER') {
            permissions.push('write');
          }
          return { allowed: true, permissions };
        }
        return { allowed: false, reason: 'Resource not in your organization' };

      case 'admin':
        // Admin rooms - restricted access
        if (roomOrgId === organizationId && (role === 'ORG_ADMIN' || role === 'SUPER_ADMIN')) {
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
        return { allowed: false, reason: 'Execution room not in your organization' };

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
      this.logger.error(`Leave room error: ${error.message}`, error.stack);
    }
  }

  @SubscribeMessage('get_connection_stats')
  async handleGetConnectionStats(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const { userId, organizationId } = client.data;

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
      this.logger.error(`Get stats error: ${error.message}`, error.stack);
    }
  }
}
