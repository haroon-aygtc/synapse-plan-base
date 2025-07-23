/**
 * APIX Client for Real-time Communication
 */

import { io, Socket } from "socket.io-client";
import { EventEmitter } from "events";
import {
  APXMessageType,
  APXStreamState,
  APXExecutionState,
} from "../../types/apix";
import { generateExecutionId, generateSessionId, retry } from "./utils";
import { ConnectionError, TimeoutError, AuthenticationError } from "./errors";

export interface APXClientOptions {
  url: string;
  token: string;
  autoConnect?: boolean;
  debug?: boolean;
  timeout?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface APXConnectionState {
  status: "connecting" | "connected" | "disconnected" | "error";
  lastConnected?: Date;
  reconnectAttempts: number;
  latency?: number;
  sessionId?: string;
  connectionId?: string;
}

export interface APXSessionContext {
  sessionId: string;
  userId: string;
  organizationId: string;
  permissions: Record<string, any>;
  crossModuleData: Record<string, any>;
  executionState?: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
}

export interface APXMessage {
  type: APXMessageType;
  payload: any;
  timestamp: Date;
  messageId: string;
  sessionId?: string;
  correlationId?: string;
}

export interface APXSubscription {
  messageType: APXMessageType;
  callback: (message: APXMessage) => void;
  filters?: Record<string, any>;
  target_id?: string;
}

/**
 * Production-ready APIX Client for real-time communication
 */
export class APXClient extends EventEmitter {
  private socket: Socket | null = null;
  private options: Required<APXClientOptions>;
  private connectionState: APXConnectionState = {
    status: "disconnected",
    reconnectAttempts: 0,
  };
  private sessionContext: APXSessionContext | null = null;
  private subscriptions = new Map<string, APXSubscription>();
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastPingTime = 0;

  constructor(options: APXClientOptions) {
    super();

    this.options = {
      url: options.url,
      token: options.token,
      autoConnect: options.autoConnect ?? true,
      debug: options.debug ?? false,
      timeout: options.timeout ?? 30000,
      reconnectAttempts: options.reconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 1000,
    };

    if (this.options.autoConnect) {
      this.connect().catch((error) => {
        this.emit("error", error);
      });
    }
  }

  /**
   * Connect to APIX WebSocket server
   */
  async connect(token?: string): Promise<void> {
    if (this.connectionState.status === "connected") {
      return;
    }

    const authToken = token || this.options.token;
    if (!authToken) {
      throw new AuthenticationError("No authentication token provided");
    }

    this.updateConnectionState({ status: "connecting" });

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.options.url, {
          auth: { token: authToken },
          transports: ["websocket", "polling"],
          timeout: this.options.timeout,
          autoConnect: true,
          forceNew: true,
          reconnection: false, // We handle reconnection manually
        });

        this.setupEventHandlers();

        const connectTimeout = setTimeout(() => {
          reject(new TimeoutError("Connection timeout", this.options.timeout));
        }, this.options.timeout);

        this.socket.on("connect", () => {
          clearTimeout(connectTimeout);
          this.updateConnectionState({
            status: "connected",
            lastConnected: new Date(),
            reconnectAttempts: 0,
          });
          this.startHeartbeat();
          resolve();
        });

        this.socket.on("connect_error", (error: Error) => {
          clearTimeout(connectTimeout);
          this.updateConnectionState({ status: "error" });
          reject(
            new ConnectionError(
              "Failed to connect to APIX server",
              error instanceof Error ? error.message : String(error),
            ),
          );
        });
      } catch (error) {
        reject(
          new ConnectionError(
            "Failed to initialize APIX connection",
            error instanceof Error ? error.message : String(error),
          ),
        );
      }
    });
  }

  /**
   * Disconnect from APIX server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimeout();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Reject all pending requests
    for (const request of Array.from(this.pendingRequests.values())) {
      clearTimeout(request.timeout);
      request.reject(new ConnectionError("Connection closed"));
    }
    this.pendingRequests.clear();

    this.updateConnectionState({ status: "disconnected" });
    this.sessionContext = null;
    this.subscriptions.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return (
      this.connectionState.status === "connected" &&
      this.socket?.connected === true
    );
  }

  /**
   * Get connection state
   */
  getConnectionState(): APXConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get session context
   */
  getSessionContext(): APXSessionContext | null {
    return this.sessionContext ? { ...this.sessionContext } : null;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<APXClientOptions>): void {
    this.options = { ...this.options, ...updates };
  }

  /**
   * Authenticate with new token
   */
  async authenticate(token: string): Promise<void> {
    this.options.token = token;

    if (this.isConnected()) {
      // Re-authenticate existing connection
      await this.sendMessage("authenticate", { token });
    } else {
      // Connect with new token
      await this.connect(token);
    }
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(
    callback: (state: APXConnectionState) => void,
  ): () => void {
    const listener = (state: APXConnectionState) => callback(state);
    this.on("connectionStateChanged", listener);

    return () => {
      this.off("connectionStateChanged", listener);
    };
  }

  /**
   * Subscribe to APIX messages
   */
  subscribe(
    messageType: APXMessageType,
    callback: (message: APXMessage) => void,
    options?: {
      filters?: Record<string, any>;
      target_id?: string;
    },
  ): () => void {
    const subscriptionId = `${messageType}_${Date.now()}_${Math.random()}`;

    const subscription: APXSubscription = {
      messageType,
      callback,
      filters: options?.filters,
      target_id: options?.target_id,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send subscription request to server
    if (this.isConnected()) {
      this.socket!.emit("subscribe", {
        messageType,
        filters: options?.filters,
        targetId: options?.target_id,
      });
    }

    return () => {
      this.subscriptions.delete(subscriptionId);
      if (this.isConnected()) {
        this.socket!.emit("unsubscribe", { messageType });
      }
    };
  }

  /**
   * Send message and wait for response
   */
  async sendMessage(
    type: string,
    payload: any,
    options?: {
      timeout?: number;
      correlationId?: string;
    },
  ): Promise<any> {
    if (!this.isConnected()) {
      throw new ConnectionError("Not connected to APIX server");
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timeout = options?.timeout || this.options.timeout;

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new TimeoutError(`Message timeout: ${type}`, timeout));
      }, timeout);

      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      const message: APXMessage = {
        type: type as APXMessageType,
        payload,
        timestamp: new Date(),
        messageId,
        sessionId: this.sessionContext?.sessionId,
        correlationId: options?.correlationId,
      };

      this.socket!.emit("message", message);
    });
  }

  /**
   * Start agent execution
   */
  async startAgentExecution(
    agentId: string,
    prompt: string,
    options?: {
      model?: string;
      parameters?: {
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
      };
      tools_available?: string[];
      memory_context?: Record<string, any>;
    },
  ): Promise<string> {
    const executionId = generateExecutionId();

    await this.sendMessage("agent_execute", {
      execution_id: executionId,
      agent_id: agentId,
      prompt,
      model: options?.model || "gpt-4",
      parameters: {
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
        ...options?.parameters,
      },
      tools_available: options?.tools_available || [],
      memory_context: options?.memory_context || {},
    });

    return executionId;
  }

  /**
   * Call tool
   */
  async callTool(
    toolId: string,
    functionName: string,
    parameters: Record<string, any>,
    options?: {
      caller_type?: "agent" | "workflow" | "user";
      caller_id?: string;
      timeout_ms?: number;
    },
  ): Promise<string> {
    const toolCallId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.sendMessage("tool_call", {
      tool_call_id: toolCallId,
      tool_id: toolId,
      function_name: functionName,
      parameters,
      caller_type: options?.caller_type || "user",
      caller_id: options?.caller_id,
      timeout_ms: options?.timeout_ms || 30000,
    });

    return toolCallId;
  }

  /**
   * Search knowledge base
   */
  async searchKnowledge(
    query: string,
    options?: {
      search_type?: "semantic" | "keyword" | "hybrid";
      filters?: Record<string, any>;
      max_results?: number;
      threshold?: number;
    },
  ): Promise<string> {
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.sendMessage("kb_search", {
      search_id: searchId,
      query,
      search_type: options?.search_type || "semantic",
      filters: options?.filters || {},
      max_results: options?.max_results || 10,
      threshold: options?.threshold || 0.7,
    });

    return searchId;
  }

  /**
   * Create HITL request
   */
  async createHITLRequest(
    requestType: "approval" | "input" | "decision" | "review",
    title: string,
    description: string,
    options?: {
      context?: Record<string, any>;
      options?: Array<{ id: string; label: string; value: any }>;
      priority?: "low" | "medium" | "high" | "urgent";
      expires_at?: string;
      assignee_roles?: string[];
      assignee_users?: string[];
    },
  ): Promise<string> {
    const requestId = `hitl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.sendMessage("hitl_create", {
      request_id: requestId,
      request_type: requestType,
      title,
      description,
      context: options?.context || {},
      options: options?.options || [],
      priority: options?.priority || "medium",
      expires_at:
        options?.expires_at ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      assignee_roles: options?.assignee_roles || [],
      assignee_users: options?.assignee_users || [],
    });

    return requestId;
  }

  /**
   * Submit widget query
   */
  async submitWidgetQuery(
    widgetId: string,
    query: string,
    options?: {
      query_type?: "text" | "voice" | "structured";
      context?: Record<string, any>;
    },
  ): Promise<string> {
    const interactionId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.sendMessage("widget_query", {
      widget_id: widgetId,
      interaction_id: interactionId,
      query,
      query_type: options?.query_type || "text",
      context: options?.context || {},
    });

    return interactionId;
  }

  /**
   * Pause stream
   */
  async pauseStream(executionId: string, reason?: string): Promise<void> {
    await this.sendMessage("stream_pause", {
      execution_id: executionId,
      reason: reason || "User requested pause",
    });
  }

  /**
   * Resume stream
   */
  async resumeStream(executionId: string, reason?: string): Promise<void> {
    await this.sendMessage("stream_resume", {
      execution_id: executionId,
      reason: reason || "User requested resume",
    });
  }

  // Private methods

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("disconnect", (reason: string) => {
      this.updateConnectionState({ status: "disconnected" });
      this.stopHeartbeat();
      this.handleDisconnect(reason);
    });

    this.socket.on("message", (message: APXMessage) => {
      this.handleMessage(message);
    });

    this.socket.on("response", (response: any) => {
      this.handleResponse(response);
    });

    this.socket.on("session_created", (sessionData: any) => {
      this.sessionContext = {
        sessionId: sessionData.session_id,
        userId: sessionData.user_id,
        organizationId: sessionData.organization_id,
        permissions: sessionData.permissions,
        crossModuleData: sessionData.initial_context,
        createdAt: new Date(sessionData.created_at),
        expiresAt: new Date(sessionData.expires_at),
      };
      this.updateConnectionState({ sessionId: sessionData.session_id });
    });

    this.socket.on("heartbeat_ack", () => {
      if (this.lastPingTime > 0) {
        const latency = Date.now() - this.lastPingTime;
        this.updateConnectionState({ latency });
      }
    });

    this.socket.on("error", (error: any) => {
      this.emit(
        "error",
        new ConnectionError("APIX socket error", error.message),
      );
    });
  }

  private handleMessage(message: APXMessage): void {
    // Emit to specific subscribers
    for (const subscription of Array.from(this.subscriptions.values())) {
      if (subscription.messageType === message.type) {
        try {
          subscription.callback(message);
        } catch (error) {
          this.emit("error", error);
        }
      }
    }

    // Emit generic message event
    this.emit("message", message);
  }

  private handleResponse(response: any): void {
    const { messageId, success, data, error } = response;

    const pendingRequest = this.pendingRequests.get(messageId);
    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout);
      this.pendingRequests.delete(messageId);

      if (success) {
        pendingRequest.resolve(data);
      } else {
        pendingRequest.reject(new Error(error || "Request failed"));
      }
    }
  }

  private handleDisconnect(reason: string): void {
    this.emit("disconnected", reason);

    // Auto-reconnect if not intentional disconnect
    if (
      reason !== "io client disconnect" &&
      this.connectionState.reconnectAttempts < this.options.reconnectAttempts
    ) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    const attempts = this.connectionState.reconnectAttempts;
    const delay = this.options.reconnectDelay * Math.pow(2, attempts);

    this.reconnectTimeout = setTimeout(() => {
      this.updateConnectionState({
        status: "connecting",
        reconnectAttempts: attempts + 1,
      });

      this.connect().catch((error) => {
        this.emit("error", error);
        if (attempts + 1 < this.options.reconnectAttempts) {
          this.scheduleReconnect();
        }
      });
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.lastPingTime = Date.now();
        this.socket!.emit("heartbeat", { timestamp: this.lastPingTime });
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private updateConnectionState(updates: Partial<APXConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.emit("connectionStateChanged", this.connectionState);
  }

  private debug(message: string, data?: any): void {
    if (this.options.debug) {
      console.log(`[APXClient] ${message}`, data || "");
    }
  }
}
