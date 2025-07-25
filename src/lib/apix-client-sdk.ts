import { EventEmitter } from "events";
import { io, Socket } from "socket.io-client";
import {
  APXMessageType,
  APXSecurityLevel,
  APXPermissionLevel,
} from "@/types/apix";

interface APXMessage {
  type: APXMessageType;
  session_id: string;
  payload: any;
  timestamp: string;
  request_id: string;
  correlation_id?: string;
  user_id?: string;
  organization_id?: string;
  security_level?: APXSecurityLevel;
  permissions?: APXPermissionLevel[];
  metadata?: Record<string, any>;
  retry_count?: number;
  expires_at?: string;
  priority?: "low" | "normal" | "high" | "critical";
}

interface APXClientConfig {
  url: string;
  token: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  messageTimeout?: number;
  compression?: boolean;
  encryption?: boolean;
}

interface QueuedMessage {
  message: APXMessage;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class APXClient extends EventEmitter {
  private socket: Socket | null = null;
  private config: Required<APXClientConfig>;
  private sessionId: string | null = null;
  private connectionState:
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting" = "disconnected";
  private messageQueue: QueuedMessage[] = [];
  private pendingRequests = new Map<string, QueuedMessage>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private lastHeartbeat = 0;

  constructor(config: APXClientConfig) {
    super();
    this.config = {
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      messageTimeout: 30000,
      compression: true,
      encryption: true,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (
      this.connectionState === "connected" ||
      this.connectionState === "connecting"
    ) {
      return;
    }

    this.connectionState = "connecting";
    this.emit("connecting");

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.config.url, {
          auth: { token: this.config.token },
          transports: ["websocket", "polling"],
          timeout: 10000,
          autoConnect: true,
          forceNew: true,
        });

        this.socket.on("connect", () => {
          this.connectionState = "connected";
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          this.emit("connected");
          resolve();
        });

        this.socket.on("apx_message", (message: APXMessage) => {
          this.handleMessage(JSON.stringify(message));
        });

        this.socket.on("disconnect", (reason: string) => {
          this.handleDisconnection(1000, reason);
        });

        this.socket.on("connect_error", (error: Error) => {
          this.emit("error", error);
          if (this.connectionState === "connecting") {
            reject(new Error("Connection failed"));
          }
        });

        // Connection timeout
        setTimeout(() => {
          if (this.connectionState === "connecting") {
            this.socket?.disconnect();
            reject(new Error("Connection timeout"));
          }
        }, 10000);
      } catch (error) {
        this.connectionState = "disconnected";
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.config.autoReconnect = false;
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState = "disconnected";
    this.sessionId = null;
    this.emit("disconnected");
  }

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
    const message: APXMessage = {
      type,
      session_id: this.sessionId || "",
      payload,
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      correlation_id: options?.correlation_id,
      priority: options?.priority || "normal",
      expires_at: options?.expires_in_ms
        ? new Date(Date.now() + options.expires_in_ms).toISOString()
        : undefined,
      metadata: options?.metadata,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.request_id);
        reject(new Error(`Message timeout: ${type}`));
      }, this.config.messageTimeout);

      const queuedMessage: QueuedMessage = {
        message,
        resolve,
        reject,
        timeout,
      };

      if (this.connectionState === "connected" && this.ws) {
        this.sendQueuedMessage(queuedMessage);
      } else {
        this.messageQueue.push(queuedMessage);
        if (this.connectionState === "disconnected") {
          this.connect().catch(reject);
        }
      }
    });
  }

  subscribe(
    messageType: APXMessageType,
    callback: (payload: any) => void,
  ): () => void {
    const eventName = `message:${messageType}`;
    this.on(eventName, callback);

    // Return unsubscribe function
    return () => {
      this.off(eventName, callback);
    };
  }

  subscribeToExecution(
    executionId: string,
    callback: (message: APXMessage) => void,
  ): () => void {
    const eventName = `execution:${executionId}`;
    this.on(eventName, callback);

    return () => {
      this.off(eventName, callback);
    };
  }

  // Agent execution methods
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
    const executionId = this.generateRequestId();

    await this.sendMessage(APXMessageType.AGENT_EXECUTION_STARTED, {
      agent_id: agentId,
      execution_id: executionId,
      prompt,
      ...options,
    });

    return executionId;
  }

  async pauseStream(executionId: string, reason?: string) {
    return this.sendMessage(APXMessageType.STREAM_PAUSE, {
      execution_id: executionId,
      action: "pause",
      reason,
    });
  }

  async resumeStream(executionId: string) {
    return this.sendMessage(APXMessageType.STREAM_RESUME, {
      execution_id: executionId,
      action: "resume",
    });
  }

  // Tool execution methods
  async callTool(
    toolId: string,
    functionName: string,
    parameters: Record<string, any>,
  ) {
    const toolCallId = this.generateRequestId();

    await this.sendMessage(APXMessageType.TOOL_CALL_START, {
      tool_call_id: toolCallId,
      tool_id: toolId,
      function_name: functionName,
      parameters,
    });

    return toolCallId;
  }

  // HITL methods
  async createHITLRequest(
    requestType: string,
    title: string,
    options?: {
      description?: string;
      context?: Record<string, any>;
      priority?: "low" | "medium" | "high" | "urgent";
      expiration?: Date;
      assignee_roles?: string[];
      assignee_users?: string[];
    },
  ) {
    const requestId = this.generateRequestId();

    await this.sendMessage(APXMessageType.HITL_REQUEST_CREATED, {
      request_id: requestId,
      request_type: requestType,
      title,
      description: options?.description,
      context: options?.context,
      priority: options?.priority,
      expiration: options?.expiration?.toISOString(),
      assignee_roles: options?.assignee_roles,
      assignee_users: options?.assignee_users,
    });

    return requestId;
  }

  // Widget methods
  async submitWidgetQuery(
    widgetId: string,
    query: string,
    queryType: string,
    context?: Record<string, any>,
  ) {
    const interactionId = this.generateRequestId();

    await this.sendMessage(APXMessageType.WIDGET_QUERY_SUBMITTED, {
      interaction_id: interactionId,
      widget_id: widgetId,
      query,
      query_type: queryType,
      context,
    });

    return interactionId;
  }

  // Knowledge base methods
  async searchKnowledge(
    query: string,
    searchType: string,
    knowledgeSources: string[],
    options?: {
      filters?: Record<string, any>;
      top_k?: number;
    },
  ) {
    const searchId = this.generateRequestId();

    await this.sendMessage(APXMessageType.KB_SEARCH_PERFORMED, {
      search_id: searchId,
      query,
      search_type: searchType,
      knowledge_sources: knowledgeSources,
      filters: options?.filters,
      top_k: options?.top_k,
    });

    return searchId;
  }

  // Connection status
  isConnected(): boolean {
    return this.connectionState === "connected";
  }

  getConnectionState(): string {
    return this.connectionState;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  // Private methods
  private handleMessage(data: string): void {
    try {
      const message: APXMessage = JSON.parse(data);

      // Handle connection acknowledgment
      if (message.type === APXMessageType.CONNECTION_ACK) {
        this.sessionId = message.payload.session_id;
        this.emit("session_established", message.payload);
        return;
      }

      // Handle heartbeat
      if (message.type === APXMessageType.CONNECTION_HEARTBEAT) {
        this.lastHeartbeat = Date.now();
        return;
      }

      // Handle pending request responses
      if (message.request_id && this.pendingRequests.has(message.request_id)) {
        const pending = this.pendingRequests.get(message.request_id)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.request_id);
        pending.resolve(message.payload);
        return;
      }

      // Emit specific message type events
      this.emit(`message:${message.type}`, message.payload, message);

      // Emit execution-specific events
      if (message.payload.execution_id) {
        this.emit(`execution:${message.payload.execution_id}`, message);
      }

      // Emit general message event
      this.emit("message", message);
    } catch (error) {
      this.emit(
        "error",
        new Error(`Failed to parse message: ${error.message}`),
      );
    }
  }

  private handleDisconnection(code: number, reason: string): void {
    this.connectionState = "disconnected";
    this.stopHeartbeat();
    this.socket = null;

    // Reject all pending requests
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection lost"));
    }
    this.pendingRequests.clear();

    this.emit("disconnected", { code, reason });

    // Auto-reconnect if enabled
    if (
      this.config.autoReconnect &&
      this.reconnectAttempts < this.config.maxReconnectAttempts
    ) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    this.connectionState = "reconnecting";
    this.reconnectAttempts++;

    const delay =
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.emit("reconnecting", { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        this.emit("reconnect_failed", error);
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.emit("reconnect_exhausted");
        }
      });
    }, delay);
  }

  private sendQueuedMessage(queuedMessage: QueuedMessage): void {
    if (!this.socket || !this.socket.connected) {
      this.messageQueue.push(queuedMessage);
      return;
    }

    try {
      this.socket.emit("apx_message", queuedMessage.message);
      this.pendingRequests.set(queuedMessage.message.request_id, queuedMessage);
    } catch (error) {
      clearTimeout(queuedMessage.timeout);
      queuedMessage.reject(error as Error);
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.connected) {
      const queuedMessage = this.messageQueue.shift()!;
      this.sendQueuedMessage(queuedMessage);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastHeartbeat = Date.now();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("apx_message", {
          type: APXMessageType.CONNECTION_HEARTBEAT,
          session_id: this.sessionId || "",
          payload: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
          request_id: this.generateRequestId(),
        });

        // Check for missed heartbeats
        if (
          Date.now() - this.lastHeartbeat >
          this.config.heartbeatInterval * 2
        ) {
          this.socket.disconnect();
        }
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export factory function for easier usage
export function createAPXClient(config: APXClientConfig): APXClient {
  return new APXClient(config);
}

// Export types for TypeScript users
export type { APXMessage, APXClientConfig };
