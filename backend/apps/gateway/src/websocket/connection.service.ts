import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Socket } from 'socket.io';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  ConnectionStats,
  MessageTrackingInfo,
  EventLog,
  Subscription,
  ConnectionStatsEntity,
  MessageTrackingEntity,
} from '@database/entities';
import {
  IConnectionInfo,
  ISubscriptionInfo,
  IWebSocketMessage,
  IEventTargeting,
  IEventPublication,
  IEventSubscription,
  IConnectionStats,
  IEventReplay,
  ICrossModuleEvent,
} from '@shared/interfaces';
import {
  EventType,
  WebSocketEventType,
  EventTargetType,
  EventPriority,
} from '@shared/enums';

export interface ConnectionInfo extends IConnectionInfo {}
export interface MessageProtocol extends IWebSocketMessage {}

@Injectable()
export class ConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(ConnectionService.name);
  private connections = new Map<string, ConnectionInfo>();
  private socketToConnection = new Map<string, string>();
  private subscriptions = new Map<string, ISubscriptionInfo>();
  private eventSubscriptions = new Map<string, Set<string>>();
  private readonly heartbeatInterval = 30000; // 30 seconds
  private readonly connectionTimeout = 60000; // 60 seconds
  private heartbeatTimer: NodeJS.Timeout;
  private statsTimer: NodeJS.Timeout;
  private readonly REDIS_CONNECTION_PREFIX = 'ws:conn:';
  private readonly REDIS_SUBSCRIPTION_PREFIX = 'ws:sub:';
  private readonly REDIS_EVENT_PREFIX = 'ws:event:';
  private readonly REDIS_STATS_PREFIX = 'ws:stats:';
  private redisSubscriber: Redis;

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(ConnectionStatsEntity)
    private readonly connectionStatsRepository: Repository<ConnectionStatsEntity>,
    @InjectRepository(MessageTrackingEntity)
    private readonly messageTrackingRepository: Repository<MessageTrackingEntity>,
    @InjectRepository(EventLog)
    private readonly eventLogRepository: Repository<EventLog>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.startHeartbeatMonitor();
    this.startStatsCollection();
    this.setupRedisSubscriptions();
  }

  async addConnection(
    socket: Socket,
    userId: string,
    organizationId: string,
    role?: string,
  ): Promise<string> {
    const connectionId = uuidv4();
    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      userId,
      organizationId,
      role,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      userAgent: socket.handshake.headers['user-agent'],
      ipAddress: socket.handshake.address,
      subscriptions: new Set<string>(),
    };

    // Store in memory
    this.connections.set(connectionId, connectionInfo);
    this.socketToConnection.set(socket.id, connectionId);

    // Initialize subscription info
    const subscriptionInfo: ISubscriptionInfo = {
      connectionId,
      userId,
      organizationId,
      eventTypes: new Set<string>(),
      subscribedAt: new Date(),
      lastActivity: new Date(),
    };
    this.subscriptions.set(connectionId, subscriptionInfo);

    // Store in Redis for horizontal scalability
    await this.redis.hset(
      `${this.REDIS_CONNECTION_PREFIX}${connectionId}`,
      'data',
      JSON.stringify(connectionInfo),
    );
    await this.redis.sadd(`ws:user:${userId}`, connectionId);
    await this.redis.sadd(`ws:org:${organizationId}`, connectionId);
    await this.redis.expire(
      `${this.REDIS_CONNECTION_PREFIX}${connectionId}`,
      86400,
    ); // 24 hours

    // Track connection stats
    await this.updateConnectionStats('connect', organizationId, role);

    // Emit connection event
    this.eventEmitter.emit(WebSocketEventType.CONNECTION_ESTABLISHED, {
      connectionId,
      userId,
      organizationId,
      role,
      timestamp: new Date(),
    });

    this.logger.log(
      `Connection established: ${connectionId} for user ${userId} in org ${organizationId}`,
    );

    return connectionId;
  }

  async removeConnection(socketId: string): Promise<void> {
    const connectionId = this.socketToConnection.get(socketId);
    if (!connectionId) return;

    const connectionInfo = this.connections.get(connectionId);
    if (connectionInfo) {
      // Unsubscribe from all events
      await this.unsubscribeFromAllEvents(connectionId);

      // Remove from memory
      this.connections.delete(connectionId);
      this.socketToConnection.delete(socketId);
      this.subscriptions.delete(connectionId);

      // Remove from Redis
      await this.redis.del(`${this.REDIS_CONNECTION_PREFIX}${connectionId}`);
      await this.redis.srem(`ws:user:${connectionInfo.userId}`, connectionId);
      await this.redis.srem(
        `ws:org:${connectionInfo.organizationId}`,
        connectionId,
      );

      // Track disconnection stats
      await this.updateConnectionStats(
        'disconnect',
        connectionInfo.organizationId,
        connectionInfo.role,
      );

      // Emit disconnection event
      this.eventEmitter.emit(WebSocketEventType.CONNECTION_LOST, {
        connectionId,
        userId: connectionInfo.userId,
        organizationId: connectionInfo.organizationId,
        role: connectionInfo.role,
        timestamp: new Date(),
        duration: new Date().getTime() - connectionInfo.connectedAt.getTime(),
      });

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
    targetType?: EventTargetType,
    targetId?: string,
    priority: EventPriority = EventPriority.NORMAL,
    correlationId?: string,
  ): MessageProtocol {
    const message: MessageProtocol = {
      event,
      payload,
      timestamp: new Date(),
      messageId: uuidv4(),
      userId,
      organizationId,
      targetType,
      targetId,
      priority,
      correlationId,
      retryCount: 0,
    };

    // Track message for analytics
    this.trackMessage({
      messageId: message.messageId,
      event,
      organizationId: organizationId || '',
      userId,
      timestamp: message.timestamp,
      payload,
      size: JSON.stringify(payload).length,
    }).catch((error) => {
      this.logger.warn(`Failed to track message: ${error.message}`);
    });

    return message;
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

        // Find socket ID for this connection
        let socketId: string | undefined;
        for (const [sId, cId] of this.socketToConnection.entries()) {
          if (cId === connectionId) {
            socketId = sId;
            break;
          }
        }

        if (socketId) {
          await this.removeConnection(socketId);
        } else {
          // Direct cleanup if socket ID not found
          this.connections.delete(connectionId);
          this.subscriptions.delete(connectionId);
          await this.redis.del(
            `${this.REDIS_CONNECTION_PREFIX}${connectionId}`,
          );
        }
      }
    }
  }

  getConnectionStats(): IConnectionStats {
    const connections = this.getActiveConnections();
    const now = new Date();
    const connectionsByOrg: Record<string, number> = {};
    const connectionsByRole: Record<string, number> = {};
    let totalConnectionTime = 0;

    connections.forEach((conn) => {
      connectionsByOrg[conn.organizationId] =
        (connectionsByOrg[conn.organizationId] || 0) + 1;

      if (conn.role) {
        connectionsByRole[conn.role] = (connectionsByRole[conn.role] || 0) + 1;
      }

      totalConnectionTime += now.getTime() - conn.connectedAt.getTime();
    });

    const subscriptionStats = this.getSubscriptionStats();

    return {
      totalConnections: connections.length,
      connectionsByOrg,
      connectionsByRole,
      averageConnectionTime:
        connections.length > 0 ? totalConnectionTime / connections.length : 0,
      peakConnections: this.getPeakConnections(),
      messagesPerMinute: this.getMessagesPerMinute(),
      subscriptionStats,
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
        const connectionData = await this.redis.hget(
          'ws:connections',
          connectionId,
        );
        if (connectionData) {
          const connection: ConnectionInfo = JSON.parse(connectionData);
          if (connection.organizationId === organizationId) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Error validating user in organization: ${error.message}`,
      );
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
  async subscribeToEvent(
    connectionId: string,
    eventType: string,
    targetType: EventTargetType = EventTargetType.TENANT,
    targetId?: string,
    filters?: Record<string, any>,
  ): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    const subscription = this.subscriptions.get(connectionId);

    if (!connection || !subscription) {
      this.logger.warn(
        `Cannot subscribe: Connection ${connectionId} not found`,
      );
      return false;
    }

    // Validate subscription permissions
    const isAllowed = await this.validateSubscriptionPermissions(
      eventType,
      connection.userId,
      connection.organizationId,
      connection.role || 'VIEWER',
      targetType,
      targetId,
    );

    if (!isAllowed) {
      this.logger.warn(
        `Subscription denied: ${connection.userId} cannot subscribe to ${eventType}`,
      );
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

    // Store in database for persistence
    try {
      const subscriptionEntity = this.subscriptionRepository.create({
        connectionId,
        userId: connection.userId,
        organizationId: connection.organizationId,
        eventType,
        targetType,
        targetId,
        filters,
        isActive: true,
        subscribedAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
      });
      await this.subscriptionRepository.save(subscriptionEntity);
    } catch (error) {
      this.logger.error(`Failed to persist subscription: ${error.message}`);
    }

    // Store in Redis for multi-instance support
    await this.redis.sadd(
      `${this.REDIS_SUBSCRIPTION_PREFIX}${eventType}:${connection.organizationId}`,
      connectionId,
    );
    await this.redis.hset(
      `${this.REDIS_SUBSCRIPTION_PREFIX}${connectionId}`,
      eventType,
      JSON.stringify({
        targetType,
        targetId,
        filters,
        subscribedAt: new Date(),
      }),
    );
    await this.redis.expire(
      `${this.REDIS_SUBSCRIPTION_PREFIX}${connectionId}`,
      86400,
    );

    this.logger.debug(
      `Connection ${connectionId} subscribed to event: ${eventType} (${targetType}${targetId ? ':' + targetId : ''})`,
    );
    return true;
  }

  async unsubscribeFromEvent(
    connectionId: string,
    eventType: string,
  ): Promise<boolean> {
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

    // Remove from database
    try {
      await this.subscriptionRepository.update(
        {
          connectionId,
          eventType,
          isActive: true,
        },
        {
          isActive: false,
          lastActivity: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update subscription in database: ${error.message}`,
      );
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

    // Bulk update database subscriptions
    try {
      await this.subscriptionRepository.update(
        {
          connectionId,
          isActive: true,
        },
        {
          isActive: false,
          lastActivity: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to bulk unsubscribe in database: ${error.message}`,
      );
    }

    // Clean up Redis
    await this.redis.del(`${this.REDIS_SUBSCRIPTION_PREFIX}${connectionId}`);
  }

  getSubscribersForEvent(eventType: string, organizationId?: string): string[] {
    const subscribers = this.eventSubscriptions.get(eventType) || new Set();

    if (!organizationId) {
      return Array.from(subscribers);
    }

    // Filter by organization
    return Array.from(subscribers).filter((connectionId) => {
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
    targeting: IEventTargeting,
    options?: {
      priority?: EventPriority;
      correlationId?: string;
      parentEventId?: string;
      sourceModule?: string;
      targetModule?: string;
    },
  ): Promise<void>;
  async publishEvent(eventPublication: IEventPublication): Promise<void>;
  async publishEvent(
    eventTypeOrPublication: string | IEventPublication,
    payload?: any,
    targeting?: IEventTargeting,
    options?: {
      priority?: EventPriority;
      correlationId?: string;
      parentEventId?: string;
      sourceModule?: string;
      targetModule?: string;
    },
  ): Promise<void> {
    let eventPublication: IEventPublication;

    if (typeof eventTypeOrPublication === 'string') {
      eventPublication = {
        eventId: uuidv4(),
        eventType: eventTypeOrPublication,
        sourceModule: options?.sourceModule || 'websocket',
        targetModule: options?.targetModule,
        payload,
        targeting: targeting!,
        priority: options?.priority || EventPriority.NORMAL,
        correlationId: options?.correlationId,
        parentEventId: options?.parentEventId,
        timestamp: new Date(),
      };
    } else {
      eventPublication = eventTypeOrPublication;
    }
    const message = this.createMessage(
      eventPublication.eventType,
      eventPublication.payload,
      eventPublication.targeting.type === EventTargetType.USER
        ? eventPublication.targeting.targetId
        : undefined,
      eventPublication.targeting.organizationId,
      eventPublication.targeting.type,
      eventPublication.targeting.targetId,
      eventPublication.priority,
      eventPublication.correlationId,
    );

    // Log event for persistence and replay
    try {
      const eventLog = this.eventLogRepository.create({
        eventId: eventPublication.eventId,
        eventType: eventPublication.eventType as EventType,
        sourceModule: eventPublication.sourceModule,
        targetModule: eventPublication.targetModule,
        userId:
          eventPublication.targeting.type === EventTargetType.USER
            ? eventPublication.targeting.targetId
            : undefined,
        organizationId: eventPublication.targeting.organizationId,
        payload: eventPublication.payload,
        metadata: {
          targeting: eventPublication.targeting,
          priority: eventPublication.priority,
          retryPolicy: eventPublication.retryPolicy,
        },
        correlationId: eventPublication.correlationId,
        parentEventId: eventPublication.parentEventId,
        timestamp: eventPublication.timestamp,
        processed: false,
        retryCount: 0,
      });
      await this.eventLogRepository.save(eventLog);
    } catch (error) {
      this.logger.error(`Failed to log event: ${error.message}`);
    }

    // Publish to Redis for multi-instance broadcasting
    await this.redis.publish(
      `${this.REDIS_EVENT_PREFIX}${eventPublication.eventType}`,
      JSON.stringify({ eventPublication, message }),
    );

    // Also handle locally for current instance
    await this.handleEventPublication(eventPublication, message);
  }

  private async handleEventPublication(
    eventPublication: IEventPublication,
    message: MessageProtocol,
  ): Promise<void> {
    const { eventType, targeting } = eventPublication;
    let targetConnections: string[] = [];

    switch (targeting.type) {
      case EventTargetType.ALL:
        targetConnections = this.getSubscribersForEvent(eventType);
        break;
      case EventTargetType.TENANT:
        targetConnections = this.getSubscribersForEvent(
          eventType,
          targeting.organizationId,
        );
        break;
      case EventTargetType.USER:
        if (targeting.targetId) {
          const userConnections = await this.getConnectionsByUserId(
            targeting.targetId,
          );
          targetConnections = userConnections.filter((connId) => {
            const connection = this.connections.get(connId);
            return (
              connection?.subscriptions?.has(eventType) &&
              connection.organizationId === targeting.organizationId
            );
          });
        }
        break;
      case EventTargetType.FLOW:
        targetConnections = this.getSubscribersForEvent(
          `flow:${targeting.targetId}`,
          targeting.organizationId,
        );
        break;
      case EventTargetType.ROOM:
        targetConnections = this.getSubscribersForEvent(
          `room:${targeting.targetId}`,
          targeting.organizationId,
        );
        break;
    }

    // Apply additional filters if specified
    if (targeting.filters && Object.keys(targeting.filters).length > 0) {
      targetConnections = targetConnections.filter((connectionId) => {
        const connection = this.connections.get(connectionId);
        if (!connection) return false;

        // Apply role filter
        if (
          targeting.filters.role &&
          connection.role !== targeting.filters.role
        ) {
          return false;
        }

        // Apply other custom filters
        return true;
      });
    }

    // Update event log with target count
    try {
      await this.eventLogRepository.update(
        { eventId: eventPublication.eventId },
        {
          processed: true,
          processedAt: new Date(),
          metadata: {
            ...eventPublication,
            targetConnectionCount: targetConnections.length,
          },
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to update event log: ${error.message}`);
    }

    this.logger.debug(
      `Publishing event ${eventType} to ${targetConnections.length} connections (${targeting.type}${targeting.targetId ? ':' + targeting.targetId : ''})`,
    );

    // Emit internal event for WebSocketService to handle actual message delivery
    this.eventEmitter.emit('websocket.publish', {
      eventPublication,
      message,
      targetConnections,
    });
  }

  private async setupRedisSubscriptions(): Promise<void> {
    try {
      // Subscribe to Redis pub/sub for multi-instance event broadcasting
      this.redisSubscriber = this.redis.duplicate();
      await this.redisSubscriber.psubscribe(`${this.REDIS_EVENT_PREFIX}*`);

      this.redisSubscriber.on('pmessage', async (pattern, channel, message) => {
        try {
          const { eventPublication, message: eventMessage } =
            JSON.parse(message);
          const eventType = channel.replace(this.REDIS_EVENT_PREFIX, '');

          // Only handle if this is not the originating instance
          if (
            eventPublication.sourceModule !==
            this.configService.get('SERVICE_NAME', 'gateway')
          ) {
            await this.handleEventPublication(eventPublication, eventMessage);
          }
        } catch (error) {
          this.logger.error(`Error handling Redis event: ${error.message}`);
        }
      });

      this.logger.log('Redis event subscriptions established');
    } catch (error) {
      this.logger.error(
        `Error setting up Redis subscriptions: ${error.message}`,
      );
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
        (subscriptionsByOrg[subscription.organizationId] || 0) +
        subscription.eventTypes.size;
    }

    return {
      totalSubscriptions,
      subscriptionsByEvent,
      subscriptionsByOrg,
      activeSubscribers: this.subscriptions.size,
    };
  }

  // Event Replay Capability
  async replayEvents(replayRequest: IEventReplay): Promise<void> {
    try {
      const queryBuilder = this.eventLogRepository
        .createQueryBuilder('event')
        .where('event.organizationId = :organizationId', {
          organizationId: replayRequest.organizationId,
        })
        .andWhere('event.timestamp >= :fromTimestamp', {
          fromTimestamp: replayRequest.fromTimestamp,
        })
        .orderBy('event.timestamp', 'ASC');

      if (replayRequest.toTimestamp) {
        queryBuilder.andWhere('event.timestamp <= :toTimestamp', {
          toTimestamp: replayRequest.toTimestamp,
        });
      }

      if (replayRequest.eventTypes && replayRequest.eventTypes.length > 0) {
        queryBuilder.andWhere('event.eventType IN (:...eventTypes)', {
          eventTypes: replayRequest.eventTypes,
        });
      }

      if (replayRequest.userId) {
        queryBuilder.andWhere('event.userId = :userId', {
          userId: replayRequest.userId,
        });
      }

      if (replayRequest.correlationId) {
        queryBuilder.andWhere('event.correlationId = :correlationId', {
          correlationId: replayRequest.correlationId,
        });
      }

      if (replayRequest.maxEvents) {
        queryBuilder.limit(replayRequest.maxEvents);
      }

      const events = await queryBuilder.getMany();

      this.logger.log(
        `Replaying ${events.length} events for organization ${replayRequest.organizationId}`,
      );

      // Replay events in order
      for (const event of events) {
        const eventPublication: IEventPublication = {
          eventId: event.eventId,
          eventType: event.eventType,
          sourceModule: 'replay',
          targetModule: event.targetModule,
          payload: event.payload,
          targeting: {
            type: EventTargetType.TENANT,
            organizationId: event.organizationId,
            targetId: event.userId,
          },
          priority: EventPriority.NORMAL,
          correlationId: event.correlationId,
          parentEventId: event.parentEventId,
          timestamp: new Date(), // Use current timestamp for replay
        };

        await this.publishEvent(eventPublication);

        // Small delay to prevent overwhelming
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      this.logger.log(
        `Event replay completed for organization ${replayRequest.organizationId}`,
      );
    } catch (error) {
      this.logger.error(`Event replay failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Cross-Module Event Routing
  async routeCrossModuleEvent(
    crossModuleEvent: ICrossModuleEvent,
  ): Promise<void> {
    const eventPublication: IEventPublication = {
      eventId: uuidv4(),
      eventType: crossModuleEvent.eventType,
      sourceModule: crossModuleEvent.sourceModule,
      targetModule: crossModuleEvent.targetModule,
      payload: {
        ...crossModuleEvent.payload,
        context: crossModuleEvent.context,
        metadata: crossModuleEvent.metadata,
      },
      targeting: {
        type: EventTargetType.TENANT,
        organizationId: crossModuleEvent.context.organizationId,
      },
      priority: EventPriority.HIGH,
      correlationId: crossModuleEvent.context.sessionId || uuidv4(),
      timestamp: new Date(),
    };

    await this.publishEvent(eventPublication);

    this.logger.debug(
      `Cross-module event routed: ${crossModuleEvent.sourceModule} -> ${crossModuleEvent.targetModule} (${crossModuleEvent.eventType})`,
    );
  }

  // Validation Methods
  private async validateSubscriptionPermissions(
    eventType: string,
    userId: string,
    organizationId: string,
    role: string,
    targetType: EventTargetType,
    targetId?: string,
  ): Promise<boolean> {
    // System events require admin permissions
    if (
      eventType.startsWith('system.') &&
      !['ORG_ADMIN', 'SUPER_ADMIN'].includes(role)
    ) {
      return false;
    }

    // Billing events require admin permissions
    if (
      eventType.startsWith('billing.') &&
      !['ORG_ADMIN', 'SUPER_ADMIN'].includes(role)
    ) {
      return false;
    }

    // User-specific events can only be subscribed to by the user themselves or admins
    if (targetType === EventTargetType.USER && targetId) {
      if (targetId !== userId && !['ORG_ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return false;
      }
    }

    // Cross-tenant subscriptions not allowed
    if (
      targetType === EventTargetType.TENANT &&
      targetId &&
      targetId !== organizationId
    ) {
      return false;
    }

    return true;
  }

  // Stats Collection
  private startStatsCollection(): void {
    this.statsTimer = setInterval(async () => {
      await this.collectAndStoreStats();
    }, 60000); // Collect stats every minute
  }

  private async collectAndStoreStats(): Promise<void> {
    try {
      const stats = this.getConnectionStats();

      const statsEntity = this.connectionStatsRepository.create({
        organizationId: 'system', // System-wide stats
        totalConnections: stats.totalConnections,
        connectionsByOrg: stats.connectionsByOrg,
        connectionsByRole: stats.connectionsByRole,
        averageConnectionTime: stats.averageConnectionTime,
        peakConnections: stats.peakConnections,
        messagesPerMinute: stats.messagesPerMinute,
        timestamp: new Date(),
      });

      await this.connectionStatsRepository.save(statsEntity);
    } catch (error) {
      this.logger.error(`Failed to collect stats: ${error.message}`);
    }
  }

  onModuleDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
    if (this.redisSubscriber) {
      this.redisSubscriber.disconnect();
    }
  }
}
