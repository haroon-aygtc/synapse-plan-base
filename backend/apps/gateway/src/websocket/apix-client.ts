import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import { APXMessageType, APXSecurityLevel, APXPermissionLevel } from '@shared/enums';
import { IAPXMessage } from '@shared/interfaces';
import { v4 as uuidv4 } from 'uuid';

export interface APXClientOptions {
  url: string;
  token: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  transports?: string[];
  debug?: boolean;
}

export interface APXSubscriptionOptions {
  filters?: Record<string, any>;
  targetId?: string;
}

export class APXClient extends EventEmitter {
  private socket: Socket | null = null;
  private options: APXClientOptions;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private messageQueue: IAPXMessage[] = [];
  private sessionId: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, APXSubscriptionOptions> = new Map();
  private rateLimits: {
    messagesPerMinute: number;
    executionsPerHour: number;
    concurrentStreams: number;
  } = {
    messagesPerMinute: 60,
    executionsPerHour: 10,
    concurrentStreams: 3,
  };
  private activeStreams: Set<string> = new Set();
  private readonly debug: boolean;

  constructor(options: APXClientOptions) {
    super();
    this.options = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      debug: false,
      ...options,
    };
    this.debug = this.options.debug || false;

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.socket?.connected || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    this.emit('connecting');

    if (this.debug) {
      console.log('APIX: Connecting to', this.options.url);
    }

    this.socket = io(this.options.url, {
      auth: {
        token: this.options.token,
      },
      transports: this.options.transports,
      timeout: this.options.timeout,
      reconnection: false, // We handle reconnection manually
      forceNew: true,
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState = 'disconnected';
    this.emit('disconnected');

    if (this.debug) {
      console.log('APIX: Disconnected');
    }
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Check if connected to the server
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && !!this.socket?.connected;
  }

  /**
   * Send a message to the server
   */
  sendMessage(
    type: APXMessageType,
    payload: any,
    options?: {
      correlationId?: string;
      securityLevel?: APXSecurityLevel;
      permissions?: APXPermissionLevel[];
      metadata?: Record<string, any>;
    }
  ): string {
    const requestId = uuidv4();

    const message: IAPXMessage = {
      type,
      session_id: this.sessionId || 'pending',
      payload,
      timestamp: new Date().toISOString(),
      request_id: requestId,
      correlation_id: options?.correlationId,
      security_level: options?.securityLevel,
      permissions: options?.permissions,
      metadata: options?.metadata,
    };

    if (this.isConnected()) {
      this.socket!.emit('apx_message', message);

      if (this.debug) {
        console.log('APIX: Sent message', type, requestId);
      }
    } else {
      // Queue message to be sent when connected
      this.messageQueue.push(message);

      if (this.debug) {
        console.log('APIX: Queued message', type, requestId);
      }

      // Try to connect if disconnected
      if (this.connectionState === 'disconnected') {
        this.connect();
      }
    }

    return requestId;
  }

  /**
   * Subscribe to an event type
   */
  subscribe(eventType: APXMessageType, options?: APXSubscriptionOptions): void {
    this.subscriptions.set(eventType, options || {});

    if (this.isConnected()) {
      this.sendSubscription(eventType, options);
    }
  }

  /**
   * Unsubscribe from an event type
   */
  unsubscribe(eventType: APXMessageType): void {
    this.subscriptions.delete(eventType);

    if (this.isConnected()) {
      this.socket!.emit('unsubscribe_event', { eventType });
    }
  }

  /**
   * Start an agent execution stream
   */
  startAgentExecution(
    agentId: string,
    prompt: string,
    options?: {
      model?: string;
      parameters?: Record<string, any>;
      toolsAvailable?: string[];
      knowledgeSources?: string[];
      executionContext?: Record<string, any>;
    }
  ): string {
    const executionId = uuidv4();
    this.activeStreams.add(executionId);

    this.sendMessage(APXMessageType.AGENT_EXECUTION_STARTED, {
      agent_id: agentId,
      execution_id: executionId,
      prompt,
      model: options?.model,
      parameters: options?.parameters,
      tools_available: options?.toolsAvailable,
      knowledge_sources: options?.knowledgeSources,
      execution_context: options?.executionContext,
    });

    return executionId;
  }

  /**
   * Start a tool call
   */
  startToolCall(
    toolId: string,
    functionName: string,
    parameters: Record<string, any>,
    options?: {
      timeoutMs?: number;
      executionContext?: Record<string, any>;
    }
  ): string {
    const toolCallId = uuidv4();
    this.activeStreams.add(toolCallId);

    this.sendMessage(APXMessageType.TOOL_CALL_START, {
      tool_call_id: toolCallId,
      tool_id: toolId,
      function_name: functionName,
      parameters,
      timeout_ms: options?.timeoutMs,
      execution_context: options?.executionContext,
    });

    return toolCallId;
  }

  /**
   * Control a stream (pause/resume)
   */
  controlStream(executionId: string, action: 'pause' | 'resume', reason?: string): void {
    if (!this.activeStreams.has(executionId)) {
      if (this.debug) {
        console.warn('APIX: Cannot control stream - not found:', executionId);
      }
      return;
    }

    const messageType =
      action === 'pause' ? APXMessageType.STREAM_PAUSE : APXMessageType.STREAM_RESUME;

    this.sendMessage(messageType, {
      execution_id: executionId,
      action,
      requested_by: 'client',
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create a HITL request
   */
  createHITLRequest(
    requestType: string,
    title: string,
    options?: {
      description?: string;
      context?: Record<string, any>;
      choices?: Array<{ id: string; label: string; value: any }>;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      expiration?: Date;
      assigneeRoles?: string[];
      assigneeUsers?: string[];
    }
  ): string {
    const requestId = uuidv4();

    this.sendMessage(APXMessageType.HITL_REQUEST_CREATED, {
      request_id: requestId,
      request_type: requestType,
      title,
      description: options?.description,
      context: options?.context,
      options: options?.choices,
      priority: options?.priority || 'medium',
      expiration: options?.expiration?.toISOString(),
      assignee_roles: options?.assigneeRoles,
      assignee_users: options?.assigneeUsers,
    });

    return requestId;
  }

  /**
   * Resolve a HITL request
   */
  resolveHITLRequest(requestId: string, resolution: any, notes?: string): void {
    this.sendMessage(APXMessageType.HITL_RESOLVED, {
      request_id: requestId,
      resolved_by: 'client',
      resolution,
      resolution_time_ms: 0, // Server will calculate this
      notes,
    });
  }

  /**
   * Send a heartbeat to keep the connection alive
   */
  sendHeartbeat(): void {
    if (this.isConnected()) {
      this.socket!.emit('heartbeat', { timestamp: Date.now() });
    }
  }

  /**
   * Get the current rate limits
   */
  getRateLimits(): {
    messagesPerMinute: number;
    executionsPerHour: number;
    concurrentStreams: number;
  } {
    return { ...this.rateLimits };
  }

  /**
   * Get the active stream IDs
   */
  getActiveStreams(): string[] {
    return Array.from(this.activeStreams);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.emit('connected');

      if (this.debug) {
        console.log('APIX: Connected');
      }

      // Start heartbeat
      this.startHeartbeat();

      // Send queued messages
      this.sendQueuedMessages();

      // Resubscribe to events
      this.resubscribeToEvents();
    });

    this.socket.on('disconnect', (reason: string) => {
      this.connectionState = 'disconnected';
      this.stopHeartbeat();
      this.emit('disconnected', reason);

      if (this.debug) {
        console.log('APIX: Disconnected -', reason);
      }

      // Handle reconnection
      if (this.options.reconnection) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      this.connectionState = 'error';
      this.emit('error', error);

      if (this.debug) {
        console.error('APIX: Connection error -', error.message);
      }

      // Handle reconnection
      if (this.options.reconnection) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('apx_message', (message: IAPXMessage) => {
      if (this.debug) {
        console.log('APIX: Received message', message.type, message.request_id);
      }

      // Handle connection acknowledgment
      if (message.type === APXMessageType.CONNECTION_ACK) {
        this.handleConnectionAck(message);
      }

      // Handle stream completion
      if (
        message.type === APXMessageType.AGENT_EXECUTION_COMPLETE ||
        message.type === APXMessageType.TOOL_CALL_RESULT ||
        message.type === APXMessageType.TOOL_CALL_ERROR
      ) {
        const executionId = message.payload.execution_id || message.payload.tool_call_id;
        if (executionId) {
          this.activeStreams.delete(executionId);
        }
      }

      // Emit the message event
      this.emit('message', message);

      // Emit specific event type
      this.emit(message.type, message.payload);
    });

    // Legacy message handling for backward compatibility
    this.socket.on('message', (message: any) => {
      if (this.debug) {
        console.log('APIX: Received legacy message', message.event);
      }

      this.emit('legacy_message', message);
      this.emit(`legacy_${message.event}`, message.payload);
    });

    this.socket.on('error', (error: Error) => {
      this.emit('error', error);

      if (this.debug) {
        console.error('APIX: Socket error -', error.message);
      }
    });
  }

  /**
   * Handle connection acknowledgment
   */
  private handleConnectionAck(message: IAPXMessage): void {
    const payload = message.payload;

    // Store session ID
    this.sessionId = payload.session_id;

    // Store rate limits
    if (payload.rate_limits) {
      this.rateLimits = {
        messagesPerMinute: payload.rate_limits.messages_per_minute,
        executionsPerHour: payload.rate_limits.executions_per_hour,
        concurrentStreams: payload.rate_limits.concurrent_streams,
      };
    }

    if (this.debug) {
      console.log('APIX: Connection acknowledged - Session ID:', this.sessionId);
    }
  }

  /**
   * Send queued messages
   */
  private sendQueuedMessages(): void {
    if (this.messageQueue.length === 0) return;

    if (this.debug) {
      console.log(`APIX: Sending ${this.messageQueue.length} queued messages`);
    }

    // Update session ID in queued messages
    this.messageQueue.forEach((message) => {
      message.session_id = this.sessionId || 'unknown';
      this.socket!.emit('apx_message', message);
    });

    this.messageQueue = [];
  }

  /**
   * Resubscribe to events
   */
  private resubscribeToEvents(): void {
    if (this.subscriptions.size === 0) return;

    if (this.debug) {
      console.log(`APIX: Resubscribing to ${this.subscriptions.size} events`);
    }

    for (const [eventType, options] of this.subscriptions.entries()) {
      this.sendSubscription(eventType as APXMessageType, options);
    }
  }

  /**
   * Send subscription request
   */
  private sendSubscription(eventType: APXMessageType, options?: APXSubscriptionOptions): void {
    if (!this.socket?.connected) return;

    this.socket.emit('subscribe_event', {
      eventType,
      filters: options?.filters,
      targetId: options?.targetId,
    });

    if (this.debug) {
      console.log('APIX: Sent subscription request for', eventType);
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= (this.options.reconnectionAttempts || 5)) {
      if (this.debug) {
        console.log('APIX: Max reconnection attempts reached');
      }
      return;
    }

    this.reconnectAttempts++;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.options.reconnectionDelay! * Math.pow(1.5, this.reconnectAttempts - 1),
      this.options.reconnectionDelayMax!
    );

    if (this.debug) {
      console.log(`APIX: Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    }

    this.reconnectTimer = setTimeout(() => {
      if (this.debug) {
        console.log(
          `APIX: Attempting to reconnect (${this.reconnectAttempts}/${this.options.reconnectionAttempts})`
        );
      }
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Export a factory function for creating APIX clients
export function createAPXClient(options: APXClientOptions): APXClient {
  return new APXClient(options);
}
