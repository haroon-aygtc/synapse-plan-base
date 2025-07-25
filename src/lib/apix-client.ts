'use client';

import { io, Socket } from 'socket.io-client';
import {
  APXMessageType,
  APXStreamState,
  APXExecutionState,
  APXPermissionLevel,
  APXSecurityLevel,
} from '@/types/apix';
import { getUser } from './auth';

export interface APXConnectionConfig {
  url?: string;
  token?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
}

export interface APXMessage {
  type: APXMessageType;
  session_id: string;
  payload: any;
  timestamp: string;
  request_id: string;
  user_id?: string;
  organization_id?: string;
  correlation_id?: string;
  security_level?: APXSecurityLevel;
  permissions?: APXPermissionLevel[];
  metadata?: Record<string, any>;
}

export interface APXSessionContext {
  session_id: string;
  user_id: string;
  organization_id: string;
  permissions: APXPermissionLevel[];
  security_level: APXSecurityLevel;
  created_at: string;
  expires_at: string;
  agent_context?: {
    agent_id: string;
    conversation_id: string;
    memory: Record<string, any>;
    active_tools: string[];
  };
  workflow_context?: {
    workflow_id: string;
    execution_id: string;
    current_step: string;
    variables: Record<string, any>;
    state: APXExecutionState;
  };
  tool_context?: {
    active_calls: Array<{
      tool_id: string;
      call_id: string;
      parameters: Record<string, any>;
      state: APXExecutionState;
    }>;
  };
  knowledge_context?: {
    active_searches: string[];
    document_access: string[];
    search_history: Array<{
      query: string;
      timestamp: string;
      results_count: number;
    }>;
  };
  hitl_context?: {
    pending_requests: Array<{
      request_id: string;
      type: string;
      created_at: string;
      expires_at: string;
    }>;
  };
  widget_context?: {
    widget_id: string;
    embed_context: Record<string, any>;
    interaction_history: Array<{
      action: string;
      timestamp: string;
      data: any;
    }>;
  };
}

export interface APXConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  session_id?: string;
  last_connected?: Date;
  reconnect_attempts: number;
  latency?: number;
  server_features?: string[];
  rate_limits?: {
    messages_per_minute: number;
    executions_per_hour: number;
    concurrent_streams: number;
  };
}

export interface APXSubscription {
  message_type: APXMessageType;
  callback: (message: APXMessage) => void;
  filters?: Record<string, any>;
  target_id?: string;
  subscribed_at: Date;
  is_active: boolean;
}

export interface APXStreamingSession {
  session_id: string;
  stream_id: string;
  stream_type: 'agent_execution' | 'tool_call' | 'knowledge_search';
  state: APXStreamState;
  created_at: string;
  last_activity: string;
  buffer_size: number;
  compression_enabled: boolean;
  encryption_enabled: boolean;
}

class APXClient {
  private socket: Socket | null = null;
  private connectionState: APXConnectionState = {
    status: 'disconnected',
    reconnect_attempts: 0,
  };
  private sessionContext: APXSessionContext | null = null;
  private subscriptions = new Map<string, APXSubscription>();
  private activeStreams = new Map<string, APXStreamingSession>();
  private messageQueue: APXMessage[] = [];
  private connectionStateListeners: Array<(state: APXConnectionState) => void> = [];
  private messageListeners = new Map<APXMessageType, Array<(message: APXMessage) => void>>();
  private config: APXConnectionConfig;

  constructor(config: APXConnectionConfig = {}) {
    this.config = {
      url: config.url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
      autoConnect: config.autoConnect ?? true,
      reconnection: config.reconnection ?? true,
      reconnectionAttempts: config.reconnectionAttempts ?? 5,
      reconnectionDelay: config.reconnectionDelay ?? 1000,
      timeout: config.timeout ?? 20000,
      ...config,
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  // Connection Management
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.updateConnectionState({ status: 'connecting' });

      const authToken = token || this.config.token || getUser()?.accessToken;

      this.socket = io(this.config.url!, {
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        timeout: this.config.timeout,
        autoConnect: true,
        forceNew: true,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
      });

      this.setupEventHandlers(resolve, reject);
    });
  }

  private setupEventHandlers(resolve?: () => void, reject?: (error: Error) => void): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('APIX Client connected');
      this.updateConnectionState({
        status: 'connected',
        last_connected: new Date(),
        reconnect_attempts: 0,
      });
      this.processMessageQueue();
      resolve?.();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('APIX Client disconnected:', reason);
      this.updateConnectionState({ status: 'disconnected' });
      this.sessionContext = null;
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('APIX Client connection error:', error);
      this.updateConnectionState({ status: 'error' });
      reject?.(error);
    });

    // Handle APIX protocol messages
    this.socket.on('apx_message', (message: APXMessage) => {
      this.handleAPXMessage(message);
    });

    // Handle connection acknowledgment
    this.socket.on('connection_ack', (data: any) => {
      this.sessionContext = {
        session_id: data.session_id,
        user_id: data.user_id || '',
        organization_id: data.organization_id || '',
        permissions: data.permissions || [],
        security_level: data.security_level || APXSecurityLevel.AUTHENTICATED,
        created_at: data.server_time,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      this.updateConnectionState({
        session_id: data.session_id,
        server_features: data.supported_features,
        rate_limits: data.rate_limits,
      });
    });

    // Handle errors
    this.socket.on('error', (error: any) => {
      console.error('APIX Client error:', error);
      this.emit(APXMessageType.VALIDATION_ERROR, error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateConnectionState({ status: 'disconnected' });
    this.sessionContext = null;
    this.subscriptions.clear();
    this.activeStreams.clear();
    this.messageQueue = [];
  }

  // Message Sending
  async sendMessage(
    type: APXMessageType,
    payload: any,
    options: {
      request_id?: string;
      correlation_id?: string;
      security_level?: APXSecurityLevel;
      permissions?: APXPermissionLevel[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.isConnected() || !this.sessionContext) {
      throw new Error('APIX Client not connected or session not established');
    }

    const message: APXMessage = {
      type,
      session_id: this.sessionContext.session_id,
      payload,
      timestamp: new Date().toISOString(),
      request_id: options.request_id || this.generateRequestId(),
      user_id: this.sessionContext.user_id,
      organization_id: this.sessionContext.organization_id,
      correlation_id: options.correlation_id,
      security_level: options.security_level,
      permissions: options.permissions,
      metadata: options.metadata,
    };

    if (this.socket?.connected) {
      this.socket.emit('apx_message', message);
    } else {
      this.messageQueue.push(message);
    }
  }

  // Agent Execution Methods
  async startAgentExecution(
    agentId: string,
    prompt: string,
    options: {
      model?: string;
      parameters?: {
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
      };
      tools_available?: string[];
      memory_context?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const executionId = this.generateExecutionId();
    
    await this.sendMessage(APXMessageType.AGENT_EXECUTION_STARTED, {
      agent_id: agentId,
      execution_id: executionId,
      prompt,
      model: options.model || 'gpt-4',
      parameters: {
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
        ...options.parameters,
      },
      tools_available: options.tools_available || [],
      memory_context: options.memory_context || {},
    });

    return executionId;
  }

  async callTool(
    toolId: string,
    functionName: string,
    parameters: Record<string, any>,
    options: {
      caller_type?: 'agent' | 'workflow' | 'user';
      caller_id?: string;
      timeout_ms?: number;
    } = {}
  ): Promise<string> {
    const toolCallId = this.generateToolCallId();
    
    await this.sendMessage(APXMessageType.TOOL_CALL_START, {
      tool_call_id: toolCallId,
      tool_id: toolId,
      function_name: functionName,
      parameters,
      caller_type: options.caller_type || 'user',
      caller_id: options.caller_id || this.sessionContext?.user_id,
      timeout_ms: options.timeout_ms || 30000,
    });

    return toolCallId;
  }

  // Knowledge Base Methods
  async searchKnowledge(
    query: string,
    options: {
      search_type?: 'semantic' | 'keyword' | 'hybrid';
      filters?: Record<string, any>;
      max_results?: number;
      threshold?: number;
    } = {}
  ): Promise<string> {
    const searchId = this.generateSearchId();
    
    await this.sendMessage(APXMessageType.KB_SEARCH_PERFORMED, {
      search_id: searchId,
      query,
      search_type: options.search_type || 'semantic',
      filters: options.filters,
      max_results: options.max_results || 10,
      threshold: options.threshold || 0.7,
    });

    return searchId;
  }

  // HITL Methods
  async createHITLRequest(
    requestType: 'approval' | 'input' | 'decision' | 'review',
    title: string,
    description: string,
    options: {
      context?: Record<string, any>;
      options?: Array<{ id: string; label: string; value: any }>;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      expires_at?: string;
      assignee_roles?: string[];
      assignee_users?: string[];
    } = {}
  ): Promise<string> {
    const requestId = this.generateRequestId();
    
    await this.sendMessage(APXMessageType.HITL_REQUEST_CREATED, {
      request_id: requestId,
      request_type: requestType,
      title,
      description,
      context: options.context || {},
      options: options.options,
      priority: options.priority || 'medium',
      expires_at: options.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      assignee_roles: options.assignee_roles || ['ORG_ADMIN'],
      assignee_users: options.assignee_users,
    });

    return requestId;
  }

  // Widget Methods
  async submitWidgetQuery(
    widgetId: string,
    query: string,
    options: {
      query_type?: 'text' | 'voice' | 'structured';
      context?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const interactionId = this.generateInteractionId();
    
    await this.sendMessage(APXMessageType.WIDGET_QUERY_SUBMITTED, {
      widget_id: widgetId,
      interaction_id: interactionId,
      query,
      query_type: options.query_type || 'text',
      context: options.context || {},
    });

    return interactionId;
  }

  // Stream Control Methods
  async pauseStream(executionId: string, reason?: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('APIX Client not connected');
    }

    this.socket.emit('apx_stream_control', {
      execution_id: executionId,
      action: 'pause',
      reason,
    });
  }

  async resumeStream(executionId: string, reason?: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('APIX Client not connected');
    }

    this.socket.emit('apx_stream_control', {
      execution_id: executionId,
      action: 'resume',
      reason,
    });
  }

  // Subscription Methods
  subscribe(
    messageType: APXMessageType,
    callback: (message: APXMessage) => void,
    options: {
      filters?: Record<string, any>;
      target_id?: string;
    } = {}
  ): () => void {
    const subscriptionId = `${messageType}_${Date.now()}_${Math.random()}`;
    
    const subscription: APXSubscription = {
      message_type: messageType,
      callback,
      filters: options.filters,
      target_id: options.target_id,
      subscribed_at: new Date(),
      is_active: true,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Add to message listeners
    if (!this.messageListeners.has(messageType)) {
      this.messageListeners.set(messageType, []);
    }
    this.messageListeners.get(messageType)!.push(callback);

    // Send subscription request to server
    if (this.socket?.connected) {
      this.socket.emit('apx_subscribe', {
        message_type: messageType,
        filters: options.filters,
        target_id: options.target_id,
      });
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionId);
    };
  }

  private unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Remove from message listeners
    const listeners = this.messageListeners.get(subscription.message_type);
    if (listeners) {
      const index = listeners.indexOf(subscription.callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    this.subscriptions.delete(subscriptionId);
  }

  // Event Handling
  private handleAPXMessage(message: APXMessage): void {
    // Update session context if needed
    if (message.type === APXMessageType.SESSION_CREATED && message.payload.session_context) {
      this.sessionContext = message.payload.session_context;
    }

    // Handle streaming sessions
    if (this.isStreamingMessage(message.type)) {
      this.handleStreamingMessage(message);
    }

    // Emit to specific listeners
    const listeners = this.messageListeners.get(message.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in APIX message callback:', error);
        }
      });
    }
  }

  private isStreamingMessage(type: APXMessageType): boolean {
    return [
      APXMessageType.AGENT_TEXT_CHUNK,
      APXMessageType.TOOL_CALL_RESULT,
      APXMessageType.KB_CHUNK_INJECTED,
    ].includes(type);
  }

  private handleStreamingMessage(message: APXMessage): void {
    const streamId = this.getStreamIdFromMessage(message);
    if (!streamId) return;

    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.last_activity = new Date().toISOString();
      
      // Update stream state based on message type
      if (message.type === APXMessageType.AGENT_EXECUTION_COMPLETE ||
          message.type === APXMessageType.TOOL_CALL_RESULT) {
        stream.state = APXStreamState.COMPLETED;
        this.activeStreams.delete(streamId);
      }
    }
  }

  private getStreamIdFromMessage(message: APXMessage): string | null {
    switch (message.type) {
      case APXMessageType.AGENT_TEXT_CHUNK:
      case APXMessageType.AGENT_EXECUTION_COMPLETE:
        return message.payload.execution_id;
      case APXMessageType.TOOL_CALL_RESULT:
        return message.payload.tool_call_id;
      case APXMessageType.KB_CHUNK_INJECTED:
        return message.payload.search_id;
      default:
        return null;
    }
  }

  private emit(type: APXMessageType, payload: any): void {
    const listeners = this.messageListeners.get(type);
    if (listeners) {
      const message: APXMessage = {
        type,
        session_id: this.sessionContext?.session_id || '',
        payload,
        timestamp: new Date().toISOString(),
        request_id: this.generateRequestId(),
      };
      
      listeners.forEach(callback => callback(message));
    }
  }

  // Utility Methods
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(message => {
      if (this.socket?.connected) {
        this.socket.emit('apx_message', message);
      }
    });
  }

  private updateConnectionState(updates: Partial<APXConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.connectionStateListeners.forEach(listener => listener(this.connectionState));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateToolCallId(): string {
    return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInteractionId(): string {
    return `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public Getters
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): APXConnectionState {
    return { ...this.connectionState };
  }

  getSessionContext(): APXSessionContext | null {
    return this.sessionContext;
  }

  getActiveStreams(): APXStreamingSession[] {
    return Array.from(this.activeStreams.values());
  }

  getSubscriptions(): APXSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  // Connection State Listeners
  onConnectionStateChange(callback: (state: APXConnectionState) => void): () => void {
    this.connectionStateListeners.push(callback);
    
    return () => {
      const index = this.connectionStateListeners.indexOf(callback);
      if (index > -1) {
        this.connectionStateListeners.splice(index, 1);
      }
    };
  }

  // Authentication Methods
  async authenticate(token: string): Promise<void> {
    this.config.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
    
    if (this.isConnected()) {
      // Reconnect with new token
      this.disconnect();
      await this.connect(token);
    }
  }

  async refreshAuthentication(): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      await this.authenticate(token);
    }
  }
}

// Export singleton instance
export const apixClient = new APXClient();
export default APXClient;
