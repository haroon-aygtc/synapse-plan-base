import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface ConnectionInfo {
  id: string;
  userId: string;
  organizationId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface MessageProtocol {
  event: string;
  payload: any;
  timestamp: Date;
  messageId: string;
  userId?: string;
  organizationId?: string;
}

@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);
  private connections = new Map<string, ConnectionInfo>();
  private socketToConnection = new Map<string, string>();
  private readonly heartbeatInterval = 30000; // 30 seconds
  private readonly connectionTimeout = 60000; // 60 seconds
  private heartbeatTimer: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.startHeartbeatMonitor();
  }

  async addConnection(
    socket: Socket,
    userId: string,
    organizationId: string,
  ): Promise<string> {
    const connectionId = uuidv4();
    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      userId,
      organizationId,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      userAgent: socket.handshake.headers['user-agent'],
      ipAddress: socket.handshake.address,
    };

    // Store in memory
    this.connections.set(connectionId, connectionInfo);
    this.socketToConnection.set(socket.id, connectionId);

    // Store in Redis for horizontal scalability
    await this.redis.hset(
      'ws:connections',
      connectionId,
      JSON.stringify(connectionInfo),
    );
    await this.redis.sadd(`ws:user:${userId}`, connectionId);
    await this.redis.sadd(`ws:org:${organizationId}`, connectionId);

    this.logger.log(
      `Connection established: ${connectionId} for user ${userId}`,
    );

    return connectionId;
  }

  async removeConnection(socketId: string): Promise<void> {
    const connectionId = this.socketToConnection.get(socketId);
    if (!connectionId) return;

    const connectionInfo = this.connections.get(connectionId);
    if (connectionInfo) {
      // Remove from memory
      this.connections.delete(connectionId);
      this.socketToConnection.delete(socketId);

      // Remove from Redis
      await this.redis.hdel('ws:connections', connectionId);
      await this.redis.srem(`ws:user:${connectionInfo.userId}`, connectionId);
      await this.redis.srem(
        `ws:org:${connectionInfo.organizationId}`,
        connectionId,
      );

      this.logger.log(
        `Connection removed: ${connectionId} for user ${connectionInfo.userId}`,
      );
    }
  }

  async updateHeartbeat(socketId: string): Promise<void> {
    const connectionId = this.socketToConnection.get(socketId);
    if (!connectionId) return;

    const connectionInfo = this.connections.get(connectionId);
    if (connectionInfo) {
      connectionInfo.lastHeartbeat = new Date();
      this.connections.set(connectionId, connectionInfo);

      // Update in Redis
      await this.redis.hset(
        'ws:connections',
        connectionId,
        JSON.stringify(connectionInfo),
      );
    }
  }

  getConnectionBySocketId(socketId: string): ConnectionInfo | undefined {
    const connectionId = this.socketToConnection.get(socketId);
    return connectionId ? this.connections.get(connectionId) : undefined;
  }

  getActiveConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  async getConnectionsByUserId(userId: string): Promise<string[]> {
    return await this.redis.smembers(`ws:user:${userId}`);
  }

  async getConnectionsByOrganizationId(
    organizationId: string,
  ): Promise<string[]> {
    return await this.redis.smembers(`ws:org:${organizationId}`);
  }

  createMessage(
    event: string,
    payload: any,
    userId?: string,
    organizationId?: string,
  ): MessageProtocol {
    return {
      event,
      payload,
      timestamp: new Date(),
      messageId: uuidv4(),
      userId,
      organizationId,
    };
  }

  private startHeartbeatMonitor(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkStaleConnections();
    }, this.heartbeatInterval);
  }

  private async checkStaleConnections(): Promise<void> {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [connectionId, connectionInfo] of this.connections) {
      const timeSinceHeartbeat =
        now.getTime() - connectionInfo.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > this.connectionTimeout) {
        staleConnections.push(connectionId);
      }
    }

    for (const connectionId of staleConnections) {
      const connectionInfo = this.connections.get(connectionId);
      if (connectionInfo) {
        this.logger.warn(
          `Removing stale connection: ${connectionId} for user ${connectionInfo.userId}`,
        );
        await this.removeConnection(connectionId);
      }
    }
  }

  getConnectionStats(): {
    totalConnections: number;
    connectionsByOrg: Record<string, number>;
    averageConnectionTime: number;
  } {
    const connections = this.getActiveConnections();
    const now = new Date();
    const connectionsByOrg: Record<string, number> = {};
    let totalConnectionTime = 0;

    connections.forEach((conn) => {
      connectionsByOrg[conn.organizationId] =
        (connectionsByOrg[conn.organizationId] || 0) + 1;
      totalConnectionTime += now.getTime() - conn.connectedAt.getTime();
    });

    return {
      totalConnections: connections.length,
      connectionsByOrg,
      averageConnectionTime:
        connections.length > 0 ? totalConnectionTime / connections.length : 0,
    };
  }

  onModuleDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }
}
