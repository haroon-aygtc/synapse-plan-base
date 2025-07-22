import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionStats, MessageTrackingInfo } from '@database/entities';

export interface ConnectionInfo {
  id: string;
  userId: string;
  organizationId: string;
  role?: string;
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

  async trackConnection(
    userId: string,
    organizationId: string,
    role?: string,
  ): Promise<void> {
    try {
      const connectionId = await this.addConnection(
        this.socket,
        userId,
        organizationId,
      );

      await this.updateConnectionStats('connect', organizationId, role);
    } catch (error) {
      this.logger.error(`Error tracking connection: ${error.message}`);
    }
  }

  async trackDisconnection(
    userId: string,
    organizationId: string,
    role?: string,
  ): Promise<void> {
    try {
      await this.updateConnectionStats('disconnect', organizationId, role);
    } catch (error) {
      this.logger.error(`Error tracking disconnection: ${error.message}`);
    }
  }   

  
  getConnectionStats(): ConnectionStats {
    const connections = this.getActiveConnections();
    const now = new Date();
    const connectionsByOrg: Record<string, number> = {};
    const connectionsByRole: Record<string, number> = {};
    let totalConnectionTime = 0;

    connections.forEach((conn) => {
      connectionsByOrg[conn.organizationId] =
        (connectionsByOrg[conn.organizationId] || 0) + 1;
      
      if (conn.role) {
        connectionsByRole[conn.role] =
          (connectionsByRole[conn.role] || 0) + 1;
      }
      
      totalConnectionTime += now.getTime() - conn.connectedAt.getTime();
    });

    return {
      totalConnections: connections.length,
      connectionsByOrg,
      connectionsByRole,
      averageConnectionTime:
        connections.length > 0 ? totalConnectionTime / connections.length : 0,
      peakConnections: this.getPeakConnections(),
      messagesPerMinute: this.getMessagesPerMinute(),
    };
  }

  private getPeakConnections(): number {
    // This would typically be calculated from connection tracking data
    // For now, return 0 as a placeholder
    return 0;
  }

  private getMessagesPerMinute(): number {
    // This would typically be calculated from message tracking data
    // For now, return 0 as a placeholder
    return 0;
  }

  async validateUserInOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      // Check if user has any active connections in the specified organization
      const userConnections = await this.redis.smembers(`ws:user:${userId}`);
      
      for (const connectionId of userConnections) {
        const connectionData = await this.redis.hget('ws:connections', connectionId);
        if (connectionData) {
          const connection: ConnectionInfo = JSON.parse(connectionData);
          if (connection.organizationId === organizationId) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error validating user in organization: ${error.message}`);
      return false;
    }
  }

  async trackMessage(messageInfo: MessageTrackingInfo): Promise<void> {
    try {
      const key = `ws:messages:${messageInfo.organizationId}:${new Date().toISOString().slice(0, 16)}`; // Per minute
      await this.redis.incr(key);
      await this.redis.expire(key, 3600); // Keep for 1 hour
      
      // Store detailed message info for analytics (optional)
      const detailKey = `ws:message_details:${messageInfo.organizationId}`;
      await this.redis.lpush(detailKey, JSON.stringify(messageInfo));
      await this.redis.ltrim(detailKey, 0, 999); // Keep last 1000 messages
      await this.redis.expire(detailKey, 86400); // Keep for 24 hours
    } catch (error) {
      this.logger.error(`Error tracking message: ${error.message}`);
    }
  }

  private async updateConnectionStats(
    action: 'connect' | 'disconnect',
    organizationId: string,
    role?: string,
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString().slice(0, 16); // Per minute
      const key = `ws:stats:${organizationId}:${timestamp}`;
      
      if (action === 'connect') {
        await this.redis.hincrby(key, 'connections', 1);
        if (role) {
          await this.redis.hincrby(key, `role:${role}`, 1);
        }
      } else {
        await this.redis.hincrby(key, 'disconnections', 1);
        if (role) {
          await this.redis.hincrby(key, `role:${role}`, -1);
        }
      }
      
      await this.redis.expire(key, 86400); // Keep for 24 hours
    } catch (error) {
      this.logger.error(`Error updating connection stats: ${error.message}`);
    }
  }

  // Subscription Management Methods
  async subscribeToEvent(connectionId: string, eventType: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    const subscription = this.subscriptions.get(connectionId);
    
    if (!connection || !subscription) {
      this.logger.warn(`Cannot subscribe: Connection ${connectionId} not found`);
      return false;
    }

    // Add to local subscription tracking
    connection.subscriptions?.add(eventType);
    subscription.eventTypes.add(eventType);
    subscription.lastActivity = new Date();

    // Add to event-based lookup
    if (!this.eventSubscriptions.has(eventType)) {
      this.eventSubscriptions.set(eventType, new Set());
    }
    this.eventSubscriptions.get(eventType)!.add(connectionId);

    // Store in Redis for multi-instance support
    await this.redis.sadd(
      `${this.REDIS_SUBSCRIPTION_PREFIX}${eventType}:${connection.organizationId}`,
      connectionId,
    );
    await this.redis.hset(
      `${this.REDIS_SUBSCRIPTION_PREFIX}${connectionId}`,
      eventType,
      new Date().toISOString(),
    );

    this.logger.debug(
      `Connection ${connectionId} subscribed to event: ${eventType}`,
    );
    return true;
  }

  async unsubscribeFromEvent(connectionId: string, eventType: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    const subscription = this.subscriptions.get(connectionId);
    
    if (!connection || !subscription) {
      return false;
    }

    // Remove from local tracking
    connection.subscriptions?.delete(eventType);
    subscription.eventTypes.delete(eventType);
    subscription.lastActivity = new Date();

    // Remove from event-based lookup
    this.eventSubscriptions.get(eventType)?.delete(connectionId);
    if (this.eventSubscriptions.get(eventType)?.size === 0) {
      this.eventSubscriptions.delete(eventType);
    }

    // Remove from Redis
    await this.redis.srem(
      `${this.REDIS_SUBSCRIPTION_PREFIX}${eventType}:${connection.organizationId}`,
      connectionId,
    );
    await this.redis.hdel(
      `${this.REDIS_SUBSCRIPTION_PREFIX}${connectionId}`,
      eventType,
    );

    this.logger.debug(
      `Connection ${connectionId} unsubscribed from event: ${eventType}`,
    );
    return true;
  }

  async unsubscribeFromAllEvents(connectionId: string): Promise<void> {
    const subscription = this.subscriptions.get(connectionId);
    if (!subscription) return;

    const eventTypes = Array.from(subscription.eventTypes);
    for (const eventType of eventTypes) {
      await this.unsubscribeFromEvent(connectionId, eventType);
    }
  }

  getSubscribersForEvent(eventType: string, organizationId?: string): string[] {
    const subscribers = this.eventSubscriptions.get(eventType) || new Set();
    
    if (!organizationId) {
      return Array.from(subscribers);
    }

    // Filter by organization
    return Array.from(subscribers).filter(connectionId => {
      const connection = this.connections.get(connectionId);
      return connection?.organizationId === organizationId;
    });
  }

  async getSubscribersForEventFromRedis(
    eventType: string,
    organizationId: string,
  ): Promise<string[]> {
    try {
      return await this.redis.smembers(
        `${this.REDIS_SUBSCRIPTION_PREFIX}${eventType}:${organizationId}`,
      );
    } catch (error) {
      this.logger.error(`Error getting Redis subscribers: ${error.message}`);
      return [];
    }
  }

  getConnectionSubscriptions(connectionId: string): string[] {
    const subscription = this.subscriptions.get(connectionId);
    return subscription ? Array.from(subscription.eventTypes) : [];
  }

  // Event Publishing with Targeting
  async publishEvent(
    eventType: string,
    payload: any,
    targeting: EventTargeting,
  ): Promise<void> {
    const message = this.createMessage(
      eventType,
      payload,
      targeting.type === 'user' ? targeting.targetId : undefined,
      targeting.organizationId,
      targeting.type,
      targeting.targetId,
    );

    // Publish to Redis for multi-instance broadcasting
    await this.redis.publish(
      `${this.REDIS_EVENT_PREFIX}${eventType}`,
      JSON.stringify({ message, targeting }),
    );

    // Also handle locally for current instance
    await this.handleEventPublication(eventType, message, targeting);
  }

  private async handleEventPublication(
    eventType: string,
    message: MessageProtocol,
    targeting: EventTargeting,
  ): Promise<void> {
    let targetConnections: string[] = [];

    switch (targeting.type) {
      case 'all':
        targetConnections = this.getSubscribersForEvent(eventType);
        break;
      case 'tenant':
        targetConnections = this.getSubscribersForEvent(eventType, targeting.organizationId);
        break;
      case 'user':
        if (targeting.targetId) {
          const userConnections = await this.getConnectionsByUserId(targeting.targetId);
          targetConnections = userConnections.filter(connId => {
            const connection = this.connections.get(connId);
            return connection?.subscriptions?.has(eventType);
          });
        }
        break;
      case 'flow':
        // For flow-specific targeting, we'd need additional logic
        // This could involve checking flow participants or specific room memberships
        targetConnections = this.getSubscribersForEvent(`flow:${targeting.targetId}`, targeting.organizationId);
        break;
    }

    // Emit to target connections (this would be handled by WebSocketService)
    this.logger.debug(
      `Publishing event ${eventType} to ${targetConnections.length} connections`,
    );
  }

  private async setupRedisSubscriptions(): Promise<void> {
    try {
      // Subscribe to Redis pub/sub for multi-instance event broadcasting
      const subscriber = this.redis.duplicate();
      await subscriber.psubscribe(`${this.REDIS_EVENT_PREFIX}*`);
      
      subscriber.on('pmessage', async (pattern, channel, message) => {
        try {
          const { message: eventMessage, targeting } = JSON.parse(message);
          const eventType = channel.replace(this.REDIS_EVENT_PREFIX, '');
          await this.handleEventPublication(eventType, eventMessage, targeting);
        } catch (error) {
          this.logger.error(`Error handling Redis event: ${error.message}`);
        }
      });

      this.logger.log('Redis event subscriptions established');
    } catch (error) {
      this.logger.error(`Error setting up Redis subscriptions: ${error.message}`);
    }
  }

  // Statistics and Monitoring
  getSubscriptionStats(): {
    totalSubscriptions: number;
    subscriptionsByEvent: Record<string, number>;
    subscriptionsByOrg: Record<string, number>;
    activeSubscribers: number;
  } {
    const subscriptionsByEvent: Record<string, number> = {};
    const subscriptionsByOrg: Record<string, number> = {};
    let totalSubscriptions = 0;

    for (const [eventType, subscribers] of this.eventSubscriptions) {
      subscriptionsByEvent[eventType] = subscribers.size;
      totalSubscriptions += subscribers.size;
    }

    for (const subscription of this.subscriptions.values()) {
      subscriptionsByOrg[subscription.organizationId] = 
        (subscriptionsByOrg[subscription.organizationId] || 0) + subscription.eventTypes.size;
    }

    return {
      totalSubscriptions,
      subscriptionsByEvent,
      subscriptionsByOrg,
      activeSubscribers: this.subscriptions.size,
    };
  }

  onModuleDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }
}
