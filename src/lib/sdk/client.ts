import { EventEmitter } from "events";
import { io, Socket } from "socket.io-client";
import { AuthModule } from "./modules/auth";
import { AgentModule } from "./modules/agent";
import { ToolModule } from "./modules/tool";
import { SessionModule } from "./modules/session";
import { WorkflowModule } from "./modules/workflow";
import { KnowledgeModule } from "./modules/knowledge";
import { BillingModule } from "./modules/billing";
import { AnalyticsModule } from "./modules/analytics";
import { AdminModule } from "./modules/admin";
import { WidgetModule } from "./modules/widget";
import { HITLModule } from "./modules/hitl";
import { ProviderModule } from "./modules/provider";
import { APXClient } from "./apix";
import {
  SynapseAIConfig,
  ConnectionState,
  SDKError,
  AuthState,
  SessionContext,
  EventSubscription,
  APIResponse,
} from "./types";
import { SDKError as SDKErrorClass } from "./errors";
import { validateConfig, createHeaders, handleAPIError } from "./utils";

/**
 * Main SynapseAI SDK Client
 * Provides unified access to all platform features
 */
export class SynapseAI extends EventEmitter {
  private config: Required<SynapseAIConfig>;
  private socket: Socket | null = null;
  public apixClient: APXClient;
  private connectionState: ConnectionState = {
    status: "disconnected",
    reconnectAttempts: 0,
  };
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    organization: null,
    permissions: [],
  };
  private sessionContext: SessionContext | null = null;
  private subscriptions = new Map<string, EventSubscription>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  // Module instances
  public readonly auth: AuthModule;
  public readonly agents: AgentModule;
  public readonly tools: ToolModule;
  public readonly sessions: SessionModule;
  public readonly workflows: WorkflowModule;
  public readonly knowledge: KnowledgeModule;
  public readonly billing: BillingModule;
  public readonly analytics: AnalyticsModule;
  public readonly admin: AdminModule;
  public readonly widgets: WidgetModule;
  public readonly hitl: HITLModule;
  public readonly providers: ProviderModule;

  constructor(config: SynapseAIConfig) {
    super();

    // Validate and set default config
    this.config = {
      baseURL: config.baseURL || "http://localhost:3001/api",
      wsURL: config.wsURL || "http://localhost:3001",
      apiKey: config.apiKey || "",
      organizationId: config.organizationId || "",
      environment: config.environment || "development",
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      autoConnect: config.autoConnect ?? true,
      enableCache: config.enableCache ?? true,
      cacheSize: config.cacheSize || 100,
      debug: config.debug ?? false,
      rateLimiting: {
        enabled: config.rateLimiting?.enabled ?? true,
        requestsPerMinute: config.rateLimiting?.requestsPerMinute || 100,
        ...config.rateLimiting,
      },
    };

    validateConfig(this.config);

    // Initialize APIX client
    this.apixClient = new APXClient({
      url: this.config.wsURL,
      token: this.config.apiKey,
      autoConnect: false,
      debug: this.config.debug,
    });

    // Initialize modules
    this.auth = new AuthModule(this);
    this.agents = new AgentModule(this);
    this.tools = new ToolModule(this);
    this.sessions = new SessionModule(this);
    this.workflows = new WorkflowModule(this);
    this.knowledge = new KnowledgeModule(this);
    this.billing = new BillingModule(this);
    this.analytics = new AnalyticsModule(this);
    this.admin = new AdminModule(this);
    this.widgets = new WidgetModule(this);
    this.hitl = new HITLModule(this);
    this.providers = new ProviderModule(this);

    // Setup event handlers
    this.setupEventHandlers();

    // Auto-connect if enabled
    if (this.config.autoConnect) {
      this.connect().catch((error) => {
        this.emit(
          "error",
          new SDKErrorClass("CONNECTION_FAILED", error instanceof Error ? error.message : String(error)),
        );
      });
    }
  }

  /**
   * Connect to SynapseAI platform
   */
  async connect(): Promise<void> {
    if (this.connectionState.status === "connected") {
      return;
    }

    this.updateConnectionState({ status: "connecting" });

    try {
      // First, authenticate if we have an API key
      if (this.config.apiKey && !this.authState.isAuthenticated) {
        await this.auth.validateToken(this.config.apiKey);
      }

      // Connect WebSocket
      await this.connectWebSocket();

      // Connect APIX client
      await this.apixClient.connect(this.config.apiKey);

      this.updateConnectionState({
        status: "connected",
        lastConnected: new Date(),
        reconnectAttempts: 0,
      });

      this.startHeartbeat();
      this.emit("connected");
    } catch (error) {
      this.updateConnectionState({ status: "error" });
      throw new SDKErrorClass("CONNECTION_FAILED", error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Disconnect from SynapseAI platform
   */
  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.stopReconnectTimer();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.apixClient.disconnect();

    this.updateConnectionState({ status: "disconnected" });
    this.sessionContext = null;
    this.subscriptions.clear();

    this.emit("disconnected");
  }

  /**
   * Make authenticated HTTP request
   */
  async request<T = any>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    data?: any,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    } = {},
  ): Promise<APIResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;
    const headers = createHeaders(this.config.apiKey, options.headers);
    const timeout = options.timeout || this.config.timeout;
    const retries = options.retries ?? this.config.retryAttempts;

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw handleAPIError(lastError!);
  }

  /**
   * Subscribe to real-time events
   */
  subscribe(
    eventType: string,
    callback: (data: any) => void,
    options: {
      targetType?: "all" | "tenant" | "user" | "flow";
      targetId?: string;
      filters?: Record<string, any>;
    } = {},
  ): () => void {
    const subscriptionId = `${eventType}_${Date.now()}_${Math.random()}`;

    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      callback,
      options,
      subscribedAt: new Date(),
      isActive: true,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Subscribe via WebSocket
    if (this.socket?.connected) {
      this.socket.emit("subscribe_event", {
        eventType,
        targetType: options.targetType || "tenant",
        targetId: options.targetId,
        filters: options.filters,
      });
    }

    // Subscribe via APIX if applicable
    if (this.isAPXEvent(eventType)) {
      this.apixClient.subscribe(eventType as any, callback, {
        filters: options.filters,
        target_id: options.targetId,
      });
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionId);
    };
  }

  /**
   * Unsubscribe from events
   */
  private unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    subscription.isActive = false;
    this.subscriptions.delete(subscriptionId);

    if (this.socket?.connected) {
      this.socket.emit("unsubscribe_event", {
        eventType: subscription.eventType,
      });
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Get current session context
   */
  getSessionContext(): SessionContext | null {
    return this.sessionContext ? { ...this.sessionContext } : null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState.status === "connected";
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Get SDK configuration
   */
  getConfig(): Required<SynapseAIConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SynapseAIConfig>): void {
    this.config = { ...this.config, ...updates };
    validateConfig(this.config);

    // Update APIX client config if needed
    if (updates.wsURL || updates.apiKey) {
      this.apixClient.updateConfig({
        url: updates.wsURL,
        token: updates.apiKey,
      });
    }
  }

  /**
   * Internal method to update auth state
   */
  updateAuthState(updates: Partial<AuthState>): void {
    this.authState = { ...this.authState, ...updates };
    this.emit("authStateChanged", this.authState);
  }

  /**
   * Internal method to update session context
   */
  updateSessionContext(context: SessionContext | null): void {
    this.sessionContext = context;
    this.emit("sessionContextChanged", context);
  }

  // Private methods

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.config.wsURL, {
        auth: { token: this.config.apiKey },
        transports: ["websocket", "polling"],
        timeout: this.config.timeout,
        autoConnect: true,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.config.retryAttempts,
        reconnectionDelay: this.config.retryDelay,
      });

      this.socket.on("connect", () => {
        resolve();
      });

      this.socket.on("connect_error", (error: Error) => {
        reject(error);
      });

      this.socket.on("disconnect", (reason: string) => {
        this.handleDisconnect(reason);
      });

      this.socket.on("message", (message: any) => {
        this.handleMessage(message);
      });
    });
  }

  private setupEventHandlers(): void {
    // APIX client events
    this.apixClient.onConnectionStateChange((state) => {
      this.emit("apixStateChanged", state);
    });

    // Handle auth state changes
    this.on("authStateChanged", (authState: AuthState) => {
      if (authState.isAuthenticated && this.config.autoConnect) {
        this.apixClient.authenticate(this.config.apiKey).catch((error) => {
          this.emit(
            "error",
            new SDKErrorClass("APIX_AUTH_FAILED", error instanceof Error ? error.message : String(error)),
          );
        });
      }
    });
  }

  private handleMessage(message: any): void {
    const { event, payload } = message;

    // Emit to specific event listeners
    this.emit(event, payload);

    // Handle subscription callbacks
    for (const subscription of Array.from(this.subscriptions.values())) {
      if (subscription.isActive && subscription.eventType === event) {
        try {
          subscription.callback(payload);
        } catch (error) {
          this.emit(
            "error",
            new SDKErrorClass("CALLBACK_ERROR", error instanceof Error ? error.message : String(error)),
          );
        }
      }
    }
  }

  private handleDisconnect(reason: string): void {
    this.updateConnectionState({ status: "disconnected" });
    this.emit("disconnected", reason);

    // Auto-reconnect if enabled
    if (this.config.autoConnect && reason !== "io client disconnect") {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const attempts = this.connectionState.reconnectAttempts || 0;
    if (attempts >= this.config.retryAttempts) {
      this.emit(
        "error",
        new SDKErrorClass(
          "MAX_RECONNECT_ATTEMPTS",
          "Maximum reconnection attempts reached",
        ),
      );
      return;
    }

    const delay = this.config.retryDelay * Math.pow(2, attempts);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.updateConnectionState({
        status: "connecting",
        reconnectAttempts: attempts + 1,
      });

      this.connect().catch((error) => {
        this.emit(
          "error",
          new SDKErrorClass("RECONNECT_FAILED", error instanceof Error ? error.message : String(error)),
        );
        this.scheduleReconnect();
      });
    }, delay);
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("heartbeat", { timestamp: Date.now() });
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.emit("connectionStateChanged", this.connectionState);
  }

  private isAPXEvent(eventType: string): boolean {
    const apxEvents = [
      "agent_execution_started",
      "agent_text_chunk",
      "agent_execution_complete",
      "tool_call_start",
      "tool_call_result",
      "kb_search_performed",
      "hitl_request_created",
      "widget_query_submitted",
    ];
    return apxEvents.includes(eventType);
  }
}

/**
 * Factory function to create SynapseAI client
 */
export function createClient(config: SynapseAIConfig): SynapseAI {
  return new SynapseAI(config);
}

/**
 * Default export
 */
export default SynapseAI;
