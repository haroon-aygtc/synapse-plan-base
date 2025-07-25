/**
 * APIX Client Integration
 * Provides real-time WebSocket communication using Socket.IO
 */

import { APXClient } from "../apix-client-sdk";
import { SynapseAIConfig } from "./types";
import { APXMessageType } from "../../types/apix";

/**
 * Create and configure APIX client
 */
export function createAPXClient(config: SynapseAIConfig): APXClient {
  return new APXClient({
    url: config.wsURL || "http://localhost:3001",
    token: config.apiKey || "",
    autoReconnect: true,
    maxReconnectAttempts: config.retryAttempts || 10,
    reconnectDelay: config.retryDelay || 1000,
    heartbeatInterval: 30000,
    messageTimeout: config.timeout || 30000,
    compression: true,
    encryption: true,
  });
}

/**
 * APIX event types for type safety
 */
export const APIX_EVENTS = {
  // Connection events
  CONNECTION_ACK: APXMessageType.CONNECTION_ACK,
  CONNECTION_HEARTBEAT: APXMessageType.CONNECTION_HEARTBEAT,

  // Session events
  SESSION_CREATED: APXMessageType.SESSION_CREATED,
  SESSION_ENDED: APXMessageType.SESSION_ENDED,

  // Agent events
  AGENT_EXECUTION_STARTED: APXMessageType.AGENT_EXECUTION_STARTED,
  AGENT_TEXT_CHUNK: APXMessageType.AGENT_TEXT_CHUNK,
  AGENT_TOOL_CALL: APXMessageType.AGENT_TOOL_CALL,
  AGENT_MEMORY_USED: APXMessageType.AGENT_MEMORY_USED,
  AGENT_ERROR: APXMessageType.AGENT_ERROR,
  AGENT_EXECUTION_COMPLETE: APXMessageType.AGENT_EXECUTION_COMPLETE,

  // Tool events
  TOOL_CALL_START: APXMessageType.TOOL_CALL_START,
  TOOL_CALL_RESULT: APXMessageType.TOOL_CALL_RESULT,
  TOOL_CALL_ERROR: APXMessageType.TOOL_CALL_ERROR,

  // Knowledge events
  KB_SEARCH_PERFORMED: APXMessageType.KB_SEARCH_PERFORMED,
  KB_CHUNK_INJECTED: APXMessageType.KB_CHUNK_INJECTED,

  // HITL events
  HITL_REQUEST_CREATED: APXMessageType.HITL_REQUEST_CREATED,
  HITL_RESOLUTION_PENDING: APXMessageType.HITL_RESOLUTION_PENDING,
  HITL_RESOLVED: APXMessageType.HITL_RESOLVED,
  HITL_EXPIRED: APXMessageType.HITL_EXPIRED,

  // Widget events
  WIDGET_LOADED: APXMessageType.WIDGET_LOADED,
  WIDGET_OPENED: APXMessageType.WIDGET_OPENED,
  WIDGET_QUERY_SUBMITTED: APXMessageType.WIDGET_QUERY_SUBMITTED,
  WIDGET_CONVERTED: APXMessageType.WIDGET_CONVERTED,

  // Stream control
  STREAM_PAUSE: APXMessageType.STREAM_PAUSE,
  STREAM_RESUME: APXMessageType.STREAM_RESUME,

  // System events
  TOKEN_LIMIT_REACHED: APXMessageType.TOKEN_LIMIT_REACHED,
  PROVIDER_FALLBACK: APXMessageType.PROVIDER_FALLBACK,

  // Error events
  VALIDATION_ERROR: APXMessageType.VALIDATION_ERROR,
  PERMISSION_DENIED: APXMessageType.PERMISSION_DENIED,
  RATE_LIMIT_EXCEEDED: APXMessageType.RATE_LIMIT_EXCEEDED,
  SESSION_EXPIRED: APXMessageType.SESSION_EXPIRED,
} as const;

/**
 * APIX client wrapper with enhanced error handling and reconnection
 */
export class EnhancedAPXClient {
  private client: APXClient;
  private connectionRetries = 0;
  private maxRetries = 5;
  private isReconnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: SynapseAIConfig) {
    this.client = createAPXClient(config);
    this.setupErrorHandling();
    this.setupEventForwarding();
  }

  private setupErrorHandling(): void {
    this.client.on("error", (error: Error) => {
      console.error("APIX Client Error:", error);

      // Attempt reconnection on certain errors
      if (this.shouldRetryConnection(error) && !this.isReconnecting) {
        this.scheduleReconnection();
      }
    });

    this.client.on("connected", () => {
      this.connectionRetries = 0;
      this.isReconnecting = false;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.client.on("disconnected", (data: any) => {
      if (data.reason !== "io client disconnect" && !this.isReconnecting) {
        this.scheduleReconnection();
      }
    });
  }

  private setupEventForwarding(): void {
    // Forward all APIX events with proper typing
    Object.values(APIX_EVENTS).forEach((eventType) => {
      this.client.on(`message:${eventType}`, (payload: any, message: any) => {
        this.client.emit(eventType, { payload, message });
      });
    });
  }

  private shouldRetryConnection(error: Error): boolean {
    // Retry on network errors, but not on authentication errors
    const nonRetryableErrors = [
      "authentication",
      "unauthorized",
      "forbidden",
      "invalid_token",
      "token_expired",
    ];

    return !nonRetryableErrors.some((errorType) =>
      error.message.toLowerCase().includes(errorType),
    );
  }

  private scheduleReconnection(): void {
    if (this.connectionRetries >= this.maxRetries || this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.connectionRetries++;

    const delay = Math.min(
      1000 * Math.pow(2, this.connectionRetries - 1),
      30000,
    );

    this.reconnectTimer = setTimeout(() => {
      this.client.connect().catch((error) => {
        console.error("Reconnection failed:", error);
        this.isReconnecting = false;

        if (this.connectionRetries < this.maxRetries) {
          this.scheduleReconnection();
        }
      });
    }, delay);
  }

  async connect(): Promise<void> {
    return this.client.connect();
  }

  disconnect(): void {
    this.isReconnecting = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.client.disconnect();
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }

  getConnectionState(): string {
    return this.client.getConnectionState();
  }

  getSessionId(): string | null {
    return this.client.getSessionId();
  }

  // Delegate all other methods to the underlying client
  async sendMessage<T = any>(
    type: APXMessageType,
    payload: any,
    options?: {
      correlation_id?: string;
      priority?: "low" | "normal" | "high" | "critical";
      expires_in_ms?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<T> {
    return this.client.sendMessage(type, payload, options);
  }

  subscribe(
    messageType: APXMessageType,
    callback: (payload: any) => void,
  ): () => void {
    return this.client.subscribe(messageType, callback);
  }

  subscribeToExecution(
    executionId: string,
    callback: (message: any) => void,
  ): () => void {
    return this.client.subscribeToExecution(executionId, callback);
  }

  // Agent methods
  async startAgentExecution(
    agentId: string,
    prompt: string,
    options?: {
      model?: string;
      parameters?: Record<string, any>;
      tools_available?: string[];
      knowledge_sources?: string[];
    },
  ) {
    return this.client.startAgentExecution(agentId, prompt, options);
  }

  async pauseStream(executionId: string, reason?: string) {
    return this.client.pauseStream(executionId, reason);
  }

  async resumeStream(executionId: string) {
    return this.client.resumeStream(executionId);
  }

  // Tool methods
  async callTool(
    toolId: string,
    functionName: string,
    parameters: Record<string, any>,
  ) {
    return this.client.callTool(toolId, functionName, parameters);
  }

  // HITL methods
  async createHITLRequest(
    requestType: string,
    title: string,
    description?: string,
    options?: {
      context?: Record<string, any>;
      priority?: "low" | "medium" | "high" | "urgent";
      expiration?: Date;
      assignee_roles?: string[];
      assignee_users?: string[];
    },
  ) {
    return this.client.createHITLRequest(requestType, title, {
      description,
      ...options,
    });
  }

  // Widget methods
  async submitWidgetQuery(
    widgetId: string,
    query: string,
    queryType: string,
    context?: Record<string, any>,
  ) {
    return this.client.submitWidgetQuery(widgetId, query, queryType, context);
  }

  // Knowledge methods
  async searchKnowledge(
    query: string,
    searchType: string,
    knowledgeSources: string[],
    options?: {
      filters?: Record<string, any>;
      top_k?: number;
    },
  ) {
    return this.client.searchKnowledge(
      query,
      searchType,
      knowledgeSources,
      options,
    );
  }

  // Event delegation
  on(event: string, listener: (...args: any[]) => void): this {
    this.client.on(event, listener);
    return this;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    this.client.off(event, listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    return this.client.emit(event, ...args);
  }

  // Utility methods for common patterns

  /**
   * Subscribe to all events for a specific execution
   */
  subscribeToExecutionEvents(
    executionId: string,
    callbacks: {
      onStart?: (data: any) => void;
      onChunk?: (data: any) => void;
      onComplete?: (data: any) => void;
      onError?: (data: any) => void;
    },
  ): () => void {
    const unsubscribers: (() => void)[] = [];

    if (callbacks.onStart) {
      unsubscribers.push(
        this.subscribe(APIX_EVENTS.AGENT_EXECUTION_STARTED, (payload) => {
          if (payload.execution_id === executionId) {
            callbacks.onStart!(payload);
          }
        }),
      );
    }

    if (callbacks.onChunk) {
      unsubscribers.push(
        this.subscribe(APIX_EVENTS.AGENT_TEXT_CHUNK, (payload) => {
          if (payload.execution_id === executionId) {
            callbacks.onChunk!(payload);
          }
        }),
      );
    }

    if (callbacks.onComplete) {
      unsubscribers.push(
        this.subscribe(APIX_EVENTS.AGENT_EXECUTION_COMPLETE, (payload) => {
          if (payload.execution_id === executionId) {
            callbacks.onComplete!(payload);
          }
        }),
      );
    }

    if (callbacks.onError) {
      unsubscribers.push(
        this.subscribe(APIX_EVENTS.AGENT_ERROR, (payload) => {
          if (payload.execution_id === executionId) {
            callbacks.onError!(payload);
          }
        }),
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Subscribe to all HITL events for a specific request
   */
  subscribeToHITLEvents(
    requestId: string,
    callbacks: {
      onCreated?: (data: any) => void;
      onAssigned?: (data: any) => void;
      onResolved?: (data: any) => void;
      onExpired?: (data: any) => void;
    },
  ): () => void {
    const unsubscribers: (() => void)[] = [];

    if (callbacks.onCreated) {
      unsubscribers.push(
        this.subscribe(APIX_EVENTS.HITL_REQUEST_CREATED, (payload) => {
          if (payload.request_id === requestId) {
            callbacks.onCreated!(payload);
          }
        }),
      );
    }

    if (callbacks.onAssigned) {
      unsubscribers.push(
        this.subscribe(APIX_EVENTS.HITL_RESOLUTION_PENDING, (payload) => {
          if (payload.request_id === requestId) {
            callbacks.onAssigned!(payload);
          }
        }),
      );
    }

    if (callbacks.onResolved) {
      unsubscribers.push(
        this.subscribe(APIX_EVENTS.HITL_RESOLVED, (payload) => {
          if (payload.request_id === requestId) {
            callbacks.onResolved!(payload);
          }
        }),
      );
    }

    if (callbacks.onExpired) {
      unsubscribers.push(
        this.subscribe(APIX_EVENTS.HITL_EXPIRED, (payload) => {
          if (payload.request_id === requestId) {
            callbacks.onExpired!(payload);
          }
        }),
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }
}

export default EnhancedAPXClient;
