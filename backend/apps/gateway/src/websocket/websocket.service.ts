import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { ConnectionService, MessageProtocol } from './connection.service';
import {
  IEventPublication,
  ICrossModuleEvent,
  IEventTargeting,
  IAPXMessage,
  IAPXSessionContext,
  IAPXAgentExecutionStarted,
  IAPXToolCallStart,
  IAPXHITLRequestCreated,
  IAPXKBSearchPerformed,
  IAPXWidgetQuerySubmitted,
  IAPXStreamingSession,
} from '@shared/interfaces';
// Import enums directly from the enums file
import {
  EventType,
  WebSocketEventType,
  EventTargetType,
  EventPriority,
  APXMessageType,
  APXStreamState,
  APXExecutionState,
} from '@shared/enums';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebSocketService implements OnModuleInit {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;
  private activeStreams = new Map<string, IAPXStreamingSession>();
  private executionContexts = new Map<string, any>();

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

  // APIX Protocol Handlers
  async handleAgentExecutionStart(
    payload: IAPXAgentExecutionStarted,
    context: { userId: string; organizationId: string; sessionId: string },
  ): Promise<void> {
    // Validate execution limits
    const activeExecutions = this.getActiveExecutionsForUser(context.userId);
    const maxConcurrentExecutions = this.getMaxConcurrentExecutions(
      context.userId,
    );

    if (activeExecutions >= maxConcurrentExecutions) {
      throw new Error(
        `Maximum concurrent executions exceeded: ${maxConcurrentExecutions}`,
      );
    }
    try {
      // Create streaming session for agent execution
      const streamingSession: IAPXStreamingSession = {
        session_id: context.sessionId,
        stream_id: payload.execution_id,
        stream_type: 'agent_execution',
        state: APXStreamState.STREAMING,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        buffer_size: 0,
        compression_enabled: true,
        encryption_enabled: true,
      };

      this.activeStreams.set(payload.execution_id, streamingSession);

      // Store execution context
      this.executionContexts.set(payload.execution_id, {
        ...context,
        agentId: payload.agent_id,
        startTime: new Date(),
        tokenCount: 0,
        toolCalls: [],
      });

      // Broadcast execution started event
      await this.broadcastAPXMessage(
        context.organizationId,
        APXMessageType.AGENT_EXECUTION_STARTED,
        payload,
        context.sessionId,
      );

      this.logger.log(
        `Agent execution started: ${payload.execution_id} for agent ${payload.agent_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle agent execution start: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private getActiveExecutionsForUser(userId: string): number {
    let count = 0;
    for (const [executionId, context] of this.executionContexts.entries()) {
      if (context.userId === userId) {
        count++;
      }
    }
    return count;
  }

  private getMaxConcurrentExecutions(userId: string): number {
    // This would typically come from user's plan or organization settings
    return 5; // Default limit
  }

  async handleToolCallStart(
    payload: IAPXToolCallStart,
    context: { userId: string; organizationId: string; sessionId: string },
  ): Promise<void> {
    try {
      // Create streaming session for tool call
      const streamingSession: IAPXStreamingSession = {
        session_id: context.sessionId,
        stream_id: payload.tool_call_id,
        stream_type: 'tool_call',
        state: APXStreamState.STREAMING,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        buffer_size: 0,
        compression_enabled: false, // Tools usually don't need compression
        encryption_enabled: true,
      };

      this.activeStreams.set(payload.tool_call_id, streamingSession);

      // Store tool call context
      this.executionContexts.set(payload.tool_call_id, {
        ...context,
        toolId: payload.tool_id,
        startTime: new Date(),
        parameters: payload.parameters,
      });

      // Broadcast tool call started event
      await this.broadcastAPXMessage(
        context.organizationId,
        APXMessageType.TOOL_CALL_START,
        payload,
        context.sessionId,
      );

      this.logger.log(
        `Tool call started: ${payload.tool_call_id} for tool ${payload.tool_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle tool call start: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleHITLRequest(
    payload: IAPXHITLRequestCreated,
    context: { userId: string; organizationId: string; sessionId: string },
  ): Promise<void> {
    try {
      // Store HITL request context
      this.executionContexts.set(payload.request_id, {
        ...context,
        requestType: payload.request_type,
        createdAt: new Date(),
        priority: payload.priority,
      });

      // Broadcast HITL request to appropriate users
      await this.broadcastAPXMessage(
        context.organizationId,
        APXMessageType.HITL_REQUEST_CREATED,
        payload,
        context.sessionId,
        {
          targetRoles: payload.assignee_roles,
          targetUsers: payload.assignee_users,
        },
      );

      this.logger.log(
        `HITL request created: ${payload.request_id} with priority ${payload.priority}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle HITL request: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleKnowledgeSearch(
    payload: IAPXKBSearchPerformed,
    context: { userId: string; organizationId: string; sessionId: string },
  ): Promise<void> {
    try {
      // Create streaming session for knowledge search
      const streamingSession: IAPXStreamingSession = {
        session_id: context.sessionId,
        stream_id: payload.search_id,
        stream_type: 'knowledge_search',
        state: APXStreamState.STREAMING,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        buffer_size: 0,
        compression_enabled: true,
        encryption_enabled: true,
      };

      this.activeStreams.set(payload.search_id, streamingSession);

      // Store search context
      this.executionContexts.set(payload.search_id, {
        ...context,
        query: payload.query,
        searchType: payload.search_type,
        startTime: new Date(),
      });

      // Broadcast knowledge search event
      await this.broadcastAPXMessage(
        context.organizationId,
        APXMessageType.KB_SEARCH_PERFORMED,
        payload,
        context.sessionId,
      );

      this.logger.log(
        `Knowledge search performed: ${payload.search_id} with query "${payload.query}"`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle knowledge search: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleWidgetQuery(
    payload: IAPXWidgetQuerySubmitted,
    context: { userId: string; organizationId: string; sessionId: string },
  ): Promise<void> {
    try {
      // Store widget interaction context
      this.executionContexts.set(payload.interaction_id, {
        ...context,
        widgetId: payload.widget_id,
        query: payload.query,
        queryType: payload.query_type,
        startTime: new Date(),
      });

      // Broadcast widget query event
      await this.broadcastAPXMessage(
        context.organizationId,
        APXMessageType.WIDGET_QUERY_SUBMITTED,
        payload,
        context.sessionId,
      );

      this.logger.log(
        `Widget query submitted: ${payload.interaction_id} for widget ${payload.widget_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle widget query: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleStreamControl(
    executionId: string,
    action: 'pause' | 'resume',
    context: { userId: string; organizationId: string; reason?: string },
  ): Promise<void> {
    try {
      const streamingSession = this.activeStreams.get(executionId);
      if (!streamingSession) {
        throw new Error(`Streaming session not found: ${executionId}`);
      }

      // Update stream state
      streamingSession.state =
        action === 'pause' ? APXStreamState.PAUSED : APXStreamState.STREAMING;
      streamingSession.last_activity = new Date().toISOString();

      // Broadcast stream control event
      const controlPayload = {
        execution_id: executionId,
        action,
        requested_by: context.userId,
        reason: context.reason,
        timestamp: new Date().toISOString(),
      };

      await this.broadcastAPXMessage(
        context.organizationId,
        action === 'pause'
          ? APXMessageType.STREAM_PAUSE
          : APXMessageType.STREAM_RESUME,
        controlPayload,
        streamingSession.session_id,
      );

      this.logger.log(
        `Stream ${action}d: ${executionId} by user ${context.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle stream control: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Stream text chunks for agent responses
  async streamTextChunk(
    executionId: string,
    chunkId: string,
    text: string,
    isFinal: boolean = false,
    tokenCount: number = 0,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const streamingSession = this.activeStreams.get(executionId);
      const executionContext = this.executionContexts.get(executionId);

      if (!streamingSession || !executionContext) {
        this.logger.warn(
          `No active stream found for execution: ${executionId}`,
        );
        return;
      }

      // Update token count
      executionContext.tokenCount += tokenCount;

      const chunkPayload = {
        execution_id: executionId,
        chunk_id: chunkId,
        text,
        is_final: isFinal,
        token_count: tokenCount,
        cumulative_tokens: executionContext.tokenCount,
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
      };

      // Broadcast text chunk using APIX protocol
      await this.broadcastAPXMessage(
        executionContext.organizationId,
        APXMessageType.AGENT_TEXT_CHUNK,
        chunkPayload,
        streamingSession.session_id,
      );

      // Update stream state if final
      if (isFinal) {
        streamingSession.state = APXStreamState.COMPLETED;
        streamingSession.last_activity = new Date().toISOString();
      }

      this.logger.debug(
        `Streamed text chunk ${chunkId} for execution ${executionId} (${text.length} chars)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to stream text chunk: ${error.message}`,
        error.stack,
      );
    }
  }

  // Stream provider events
  async streamProviderEvent(
    eventType:
      | 'provider_selected'
      | 'provider_switched'
      | 'provider_error'
      | 'provider_complete'
      | 'cost_update',
    payload: any,
    organizationId: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      const message = {
        type: eventType,
        payload,
        timestamp: new Date().toISOString(),
        organization_id: organizationId,
        session_id: sessionId,
      };

      // Broadcast to organization
      await this.broadcastToOrganization(organizationId, eventType, message);

      this.logger.debug(
        `Streamed provider event ${eventType} to organization ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to stream provider event: ${error.message}`,
        error.stack,
      );
    }
  }

  // Complete execution and cleanup
  async completeExecution(
    executionId: string,
    finalResponse: string,
    executionStats: any,
  ): Promise<void> {
    try {
      const streamingSession = this.activeStreams.get(executionId);
      const executionContext = this.executionContexts.get(executionId);

      if (!streamingSession || !executionContext) {
        this.logger.warn(`No active execution found: ${executionId}`);
        return;
      }

      // Calculate execution time
      const executionTimeMs = Date.now() - executionContext.startTime.getTime();

      const completionPayload = {
        execution_id: executionId,
        final_response: finalResponse,
        total_tokens: executionContext.tokenCount,
        execution_time_ms: executionTimeMs,
        tools_used: executionContext.toolCalls || [],
        memory_updates: [],
        cost_breakdown: executionStats.costBreakdown || {
          model_cost: 0,
          tool_cost: 0,
          total_cost: 0,
        },
      };

      // Broadcast completion event
      await this.broadcastAPXMessage(
        executionContext.organizationId,
        APXMessageType.AGENT_EXECUTION_COMPLETE,
        completionPayload,
        streamingSession.session_id,
      );

      // Cleanup
      streamingSession.state = APXStreamState.COMPLETED;
      this.activeStreams.delete(executionId);
      this.executionContexts.delete(executionId);

      this.logger.log(
        `Execution completed: ${executionId} in ${executionTimeMs}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to complete execution: ${error.message}`,
        error.stack,
      );
    }
  }

  // Handle execution errors
  async handleExecutionError(
    executionId: string,
    errorType: string,
    errorMessage: string,
    errorDetails?: any,
  ): Promise<void> {
    try {
      const streamingSession = this.activeStreams.get(executionId);
      const executionContext = this.executionContexts.get(executionId);

      if (!streamingSession || !executionContext) {
        this.logger.warn(`No active execution found for error: ${executionId}`);
        return;
      }

      const errorPayload = {
        execution_id: executionId,
        error_type: errorType,
        error_code: `EXECUTION_${errorType.toUpperCase()}`,
        error_message: errorMessage,
        error_details: errorDetails,
        retry_possible: this.isRetryPossible(errorType),
        suggested_action: this.getSuggestedAction(errorType),
      };

      // Broadcast error event
      await this.broadcastAPXMessage(
        executionContext.organizationId,
        APXMessageType.AGENT_ERROR,
        errorPayload,
        streamingSession.session_id,
      );

      // Update stream state
      streamingSession.state = APXStreamState.ERROR;
      streamingSession.last_activity = new Date().toISOString();

      this.logger.error(
        `Execution error: ${executionId} - ${errorType}: ${errorMessage}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle execution error: ${error.message}`,
        error.stack,
      );
    }
  }

  // Broadcast APIX message to organization
  private async broadcastAPXMessage(
    organizationId: string,
    messageType: APXMessageType,
    payload: any,
    sessionId: string,
    options?: {
      targetRoles?: string[];
      targetUsers?: string[];
    },
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const message: IAPXMessage = {
      type: messageType,
      session_id: sessionId,
      payload,
      timestamp: new Date().toISOString(),
      request_id: uuidv4(),
      organization_id: organizationId,
    };

    if (options?.targetRoles || options?.targetUsers) {
      // Targeted broadcast to specific roles or users
      if (options.targetRoles) {
        for (const role of options.targetRoles) {
          this.server
            .to(`role:${role}:${organizationId}`)
            .emit('apx_message', message);
        }
      }
      if (options.targetUsers) {
        for (const userId of options.targetUsers) {
          this.server.to(`user:${userId}`).emit('apx_message', message);
        }
      }
    } else {
      // Broadcast to entire organization
      this.server.to(`org:${organizationId}`).emit('apx_message', message);
    }

    this.logger.debug(
      `Broadcasted APIX message: ${messageType} to organization ${organizationId}`,
    );
  }

  // Get active streaming sessions
  getActiveStreams(): IAPXStreamingSession[] {
    return Array.from(this.activeStreams.values());
  }

  // Get execution context
  getExecutionContext(executionId: string): any {
    return this.executionContexts.get(executionId);
  }

  // Helper methods
  private isRetryPossible(errorType: string): boolean {
    const retryableErrors = ['timeout', 'rate_limit', 'provider'];
    return retryableErrors.includes(errorType.toLowerCase());
  }

  private getSuggestedAction(errorType: string): string {
    const suggestions = {
      validation: 'Check input parameters and try again',
      timeout: 'Retry with a longer timeout or smaller input',
      rate_limit: 'Wait and retry, or upgrade your plan',
      provider: 'Try again or switch to a different AI provider',
      execution: 'Review the error details and modify your request',
    };

    return (
      suggestions[errorType.toLowerCase()] || 'Contact support for assistance'
    );
  }
}
