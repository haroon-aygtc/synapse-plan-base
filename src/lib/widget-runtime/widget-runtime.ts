/**
 * Widget Runtime Engine
 * Handles secure execution of widgets in embedded environments
 */

import {
  WidgetRuntime,
  WidgetExecutionContext,
  WidgetExecutionResult,
  WidgetConnection,
  WidgetEvent,
  DeviceInfo,
  GeolocationData,
} from "@/lib/sdk/types";
import { apiClient } from "@/lib/api";

export class SynapseWidgetRuntime implements WidgetRuntime {
  private connections: Map<string, WidgetConnection> = new Map();
  private eventQueue: WidgetEvent[] = [];
  private isOnline: boolean = navigator.onLine;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(
    private config: {
      baseURL: string;
      apiKey?: string;
      enableAnalytics?: boolean;
      enableCaching?: boolean;
      debug?: boolean;
      enableAPX?: boolean;
    },
  ) {
    this.setupEventListeners();
    this.startHeartbeat();
  }

  /**
   * Execute a widget with the given input and context
   */
  async executeWidget(
    widgetId: string,
    input: any,
    context: WidgetExecutionContext,
  ): Promise<WidgetExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec_${widgetId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Validate widget access and security
      await this.validateWidgetAccess(widgetId, context);

      // Check rate limiting
      await this.checkRateLimit(widgetId, context.sessionId);

      // Track execution start
      this.trackEvent({
        type: "interaction",
        widgetId,
        sessionId: context.sessionId,
        timestamp: new Date(),
        data: {
          action: "execute_start",
          executionId,
          inputType: typeof input,
          inputSize: JSON.stringify(input).length,
        },
      });

      // Prepare execution context with enhanced data
      const enhancedContext = {
        ...context,
        executionId,
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        clientInfo: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
        },
      };

      // Execute widget through API with retry logic
      const response = await this.executeWithRetry(async () => {
        return await apiClient.post(
          `/widgets/${widgetId}/execute`,
          {
            input,
            sessionId: context.sessionId,
            executionId,
            context: enhancedContext,
          },
          {
            timeout: 30000, // 30 second timeout
            headers: {
              "X-Widget-Execution-ID": executionId,
              "X-Widget-Session-ID": context.sessionId,
            },
          },
        );
      });

      const executionTime = Date.now() - startTime;

      if (response.data.success) {
        const result: WidgetExecutionResult = {
          executionId: response.data.data.executionId || executionId,
          result: response.data.data.result,
          status: "completed",
          tokensUsed: response.data.data.tokensUsed || 0,
          executionTime,
          error: undefined,
          cost: response.data.data.cost || 0,
          cacheHit: response.data.data.cacheHit || false,
        };

        // Track successful execution
        this.trackEvent({
          type: "conversion",
          widgetId,
          sessionId: context.sessionId,
          timestamp: new Date(),
          data: {
            executionId,
            executionTime,
            tokensUsed: result.tokensUsed,
            success: true,
            cost: result.cost || 0,
            cacheHit: result.cacheHit || false,
            apiCalls: result.apiCalls || 0,
            model: result.model || '',
            provider: result.provider || '',
          },
        });

        return result;
      } else {
        throw new Error(response.data.message || "Widget execution failed");
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Determine error type for better handling
      let errorType = "execution_error";
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        errorType = "timeout_error";
      } else if (error.response?.status === 429) {
        errorType = "rate_limit_error";
      } else if (error.response?.status === 403) {
        errorType = "permission_error";
      } else if (error.response?.status >= 500) {
        errorType = "server_error";
      }

      // Track execution error with detailed information
      this.trackEvent({
        type: "error",
        widgetId,
        sessionId: context.sessionId,
        timestamp: new Date(),
        data: {
          executionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime,
          statusCode: error.response?.status,
          stack: error.stack?.substring(0, 1000),
        },
      });

      return {
        executionId,
        result: null,
        tokensUsed: 0,
        cost: 0,
        cacheHit: false,
        apiCalls: 0,
        model: '',
        provider: '',
        status: "failed",
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Establish a connection with the parent platform
   */
  async establishConnection(
    widgetId: string,
    parentOrigin: string,
    sessionId?: string,
    token?: string,
  ): Promise<WidgetConnection> {
    try {
      // Fetch widget configuration to validate origin
      const widgetResponse = await apiClient.get(`/widgets/${widgetId}`);
      if (!widgetResponse.data.success) {
        throw new Error("Widget not found or inactive");
      }

      const widget = widgetResponse.data.data;
      const allowedDomains =
        widget.configuration?.security?.allowedDomains || [];

      // Validate origin against allowed domains
      const isValidOrigin = this.validateOrigin(parentOrigin, allowedDomains);

      if (!isValidOrigin) {
        throw new Error(
          `Origin ${parentOrigin} is not allowed for this widget`,
        );
      }

      // Validate token if provided
      if (token) {
        try {
          const tokenPayload = JSON.parse(atob(token));
          if (tokenPayload.widgetId !== widgetId) {
            throw new Error("Invalid widget token");
          }
          if (Date.now() - tokenPayload.timestamp > 24 * 60 * 60 * 1000) {
            // 24 hours
            throw new Error("Widget token expired");
          }
        } catch (error) {
          throw new Error("Invalid or expired widget token");
        }
      }

      const connectionId = `conn_${widgetId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const connection: WidgetConnection = {
        id: connectionId,
        widgetId,
        parentOrigin,
        established: new Date(),
        lastActivity: new Date(),
        isActive: true,
        sessionId: sessionId || '',
        metadata: {
          userAgent: navigator.userAgent,
          deviceInfo: this.getDeviceInfo(),
          geolocation: await this.getGeolocation(),
          connectionType:
            (navigator as any).connection?.effectiveType || "unknown",
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      this.connections.set(connection.id, connection);

      // Set up secure message listener for this connection
      this.setupMessageListener(connection);

      // Initialize APIX connection if available
      if (this.config.enableAPX) {
        await this.initializeAPXConnection(connection);
      }

      // Track connection establishment with enhanced data
      this.trackEvent({
        type: "view",
        widgetId,
        sessionId: connection.sessionId || '',
        timestamp: new Date(),
        data: {
          action: "connection_established",
          connectionId: connection.id,
          parentOrigin,
          deviceInfo: connection.deviceInfo,
          geolocation: connection.geolocation,
          userAgent: navigator.userAgent,
          connectionType: (navigator as any).connection?.effectiveType || "unknown",
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      // Send connection acknowledgment to parent
      this.sendMessageToParent(parentOrigin, {
        type: "widget_connection_established",
        connectionId: connection.id,
        sessionId: connection.sessionId || '',
        timestamp: new Date().toISOString(),
      });

      return connection;
    } catch (error) {
      // Track connection failure
      this.trackEvent({
        type: "error",
        widgetId,
        sessionId: sessionId || '',
        timestamp: new Date(),
        data: {
          action: "connection_failed",
          error: error instanceof Error ? error.message : 'Unknown error',
          parentOrigin,
        },
      });

      throw error;
    }
  }

  /**
   * Track widget events for analytics
   */
  trackEvent(event: WidgetEvent): void {
    if (!this.config.enableAnalytics) return;

    // Add to event queue
    this.eventQueue.push(event);

    // Send events in batches
    if (this.eventQueue.length >= 10 || !this.isOnline) {
      this.flushEventQueue();
    }
  }

  /**
   * Validate origin against allowed domains
   */
  validateOrigin(origin: string, allowedDomains: string[]): boolean {
    // If no domains specified, allow all (for development)
    if (allowedDomains.length === 0) {
      return true;
    }

    try {
      const url = new URL(origin);
      const domain = url.hostname;

      return allowedDomains.some((allowed) => {
        // Exact match
        if (allowed === domain) return true;

        // Wildcard subdomain match
        if (allowed.startsWith("*.")) {
          const baseDomain = allowed.substring(2);
          return domain.endsWith(baseDomain);
        }

        return false;
      });
    } catch {
      return false;
    }
  }

  /**
   * Get device information for context
   */
  getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const screen = window.screen;

    // Detect device type
    let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = /iPad|tablet/i.test(userAgent) ? "tablet" : "mobile";
    }

    // Detect browser
    let browserName = "Unknown";
    let browserVersion = "0.0";

    if (userAgent.includes("Chrome")) {
      browserName = "Chrome";
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (userAgent.includes("Firefox")) {
      browserName = "Firefox";
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (userAgent.includes("Safari")) {
      browserName = "Safari";
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    }

    // Detect OS
    let operatingSystem = "Unknown";
    if (userAgent.includes("Windows")) operatingSystem = "Windows";
    else if (userAgent.includes("Mac")) operatingSystem = "macOS";
    else if (userAgent.includes("Linux")) operatingSystem = "Linux";
    else if (userAgent.includes("Android")) operatingSystem = "Android";
    else if (userAgent.includes("iOS")) operatingSystem = "iOS";

    return {
      type: deviceType,
      userAgent,
      screenResolution: {
        width: screen.width,
        height: screen.height,
      },
      browserInfo: {
        name: browserName,
        version: browserVersion,
      },
      operatingSystem,
    };
  }

  /**
   * Get geolocation data (with user permission)
   */
  async getGeolocation(): Promise<GeolocationData | undefined> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // Fallback to IP-based geolocation
          this.getIPGeolocation()
            .then(resolve)
            .catch(() => resolve(undefined));
        },
        { timeout: 5000, enableHighAccuracy: false },
      );
    });
  }

  /**
   * Private helper methods
   */
  private async validateWidgetAccess(
    widgetId: string,
    context: WidgetExecutionContext,
  ): Promise<void> {
    // Check if widget exists and is active
    try {
      const response = await apiClient.get(`/widgets/${widgetId}`);
      if (!response.data.success || !response.data.data.isActive) {
        throw new Error("Widget is not active or does not exist");
      }

      const widget = response.data.data;

      // Check if widget is deployed
      if (!widget.isDeployed) {
        throw new Error("Widget is not deployed");
      }

      // Validate origin if security settings exist
      if (widget.configuration?.security?.allowedDomains?.length > 0) {
        const currentOrigin = window.location.origin;
        const isAllowed = this.validateOrigin(
          currentOrigin,
          widget.configuration.security.allowedDomains,
        );

        if (!isAllowed) {
          throw new Error("Origin not allowed for this widget");
        }
      }

      // Check authentication requirements
      if (widget.configuration?.security?.requireAuth) {
        if (!context.userId) {
          throw new Error("Authentication required for this widget");
        }
      }

      // Validate session
      if (!context.sessionId || context.sessionId.length < 10) {
        throw new Error("Invalid session ID");
      }

      // Check widget usage limits (if any)
      await this.checkUsageLimits(widgetId, context);
    } catch (error) {
      throw new Error(`Widget validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkUsageLimits(
    widgetId: string,
    context: WidgetExecutionContext,
  ): Promise<void> {
    // Check daily usage limits
    const today = new Date().toISOString().split("T")[0];
    const usageKey = `widget_usage_${widgetId}_${today}`;

    try {
      const stored = localStorage.getItem(usageKey);
      const usage = stored ? JSON.parse(stored) : { count: 0, date: today };

      // Reset if different day
      if (usage.date !== today) {
        usage.count = 0;
        usage.date = today;
      }

      // Check against daily limit (default 1000 requests per day)
      const dailyLimit = 1000;
      if (usage.count >= dailyLimit) {
        throw new Error("Daily usage limit exceeded");
      }

      // Increment usage
      usage.count++;
      localStorage.setItem(usageKey, JSON.stringify(usage));
    } catch (error) {
      // If localStorage is not available, skip usage tracking
      console.warn("Usage tracking unavailable:", error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt < this.retryAttempts) {
        await this.delay(this.retryDelay * attempt);
        return this.executeWithRetry(operation, attempt + 1);
      }
      throw error;
    }
  }

  private async checkRateLimit(
    widgetId: string,
    sessionId: string,
  ): Promise<void> {
    // Implementation would check against rate limiting service
    // For now, we'll implement a simple client-side check
    const key = `rate_limit_${widgetId}_${sessionId}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    const stored = localStorage.getItem(key);
    if (stored) {
      const { count, timestamp } = JSON.parse(stored);

      if (now - timestamp < windowMs) {
        if (count >= 60) {
          // Default 60 requests per minute
          throw new Error("Rate limit exceeded");
        }
        localStorage.setItem(
          key,
          JSON.stringify({
            count: count + 1,
            timestamp,
          }),
        );
      } else {
        localStorage.setItem(
          key,
          JSON.stringify({
            count: 1,
            timestamp: now,
          }),
        );
      }
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({
          count: 1,
          timestamp: now,
        }),
      );
    }
  }

  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.flushEventQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });

    // Page visibility for connection management
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pauseConnections();
      } else {
        this.resumeConnections();
      }
    });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  private setupMessageListener(connection: WidgetConnection): void {
    const messageHandler = (event: MessageEvent) => {
      // Validate message origin
      if (event.origin !== connection.parentOrigin) {
        console.warn(
          "Received message from unauthorized origin:",
          event.origin,
        );
        return;
      }

      // Update connection activity
      connection.lastActivity = new Date();

      // Validate message structure
      if (!event.data || typeof event.data !== "object") {
        console.warn("Invalid message format received");
        return;
      }

      // Handle different message types
      switch (event.data.type) {
        case "ping":
          // Respond to heartbeat with connection status
          this.sendMessageToParent(connection.parentOrigin, {
            type: "pong",
            connectionId: connection.id,
            sessionId: connection.sessionId,
            timestamp: Date.now(),
            status: "active",
          });
          break;

        case "init_config":
          // Handle initial configuration from parent
          this.handleInitialConfig(event.data.config, connection);
          break;

        case "resize":
          // Handle resize requests
          this.handleResize(event.data.dimensions);
          break;

        case "theme_update":
          // Handle theme changes
          this.handleThemeChange(event.data.theme);
          break;

        case "user_input":
          // Handle user input from parent
          this.handleUserInput(event.data.input, connection);
          break;

        case "widget_command":
          // Handle widget commands (pause, resume, reset, etc.)
          this.handleWidgetCommand(
            event.data.command,
            event.data.params,
            connection,
          );
          break;

        case "analytics_event":
          // Handle analytics events from parent
          this.handleAnalyticsEvent(event.data.event, connection);
          break;

        default:
          console.warn("Unknown message type received:", event.data.type);
      }
    };

    // Store message handler for cleanup
    connection.messageHandler = messageHandler;
    window.addEventListener("message", messageHandler);
  }

  private sendMessageToParent(parentOrigin: string, message: any): void {
    try {
      window.parent.postMessage(message, parentOrigin);
    } catch (error) {
      console.error("Failed to send message to parent:", error);
    }
  }

  private handleInitialConfig(config: any, connection: WidgetConnection): void {
    // Store configuration in connection metadata
    connection.metadata = {
      ...connection.metadata,
      config,
      initialized: true,
      initTime: new Date(),
    };

    // Send ready signal to parent
    this.sendMessageToParent(connection.parentOrigin, {
      type: "widget_ready",
      connectionId: connection.id,
      sessionId: connection.sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  private handleUserInput(input: any, connection: WidgetConnection): void {
    // Process user input and execute widget
    const context: WidgetExecutionContext = {
      sessionId: connection.sessionId || '',
      userId: connection.userId || '',
      deviceInfo: connection.deviceInfo || this.getDeviceInfo(),
      geolocation: connection.geolocation,
      customData: {
        connectionId: connection.id,
        parentOrigin: connection.parentOrigin,
      },
    };

    this.executeWidget(connection.widgetId, input, context)
      .then((result) => {
        this.sendMessageToParent(connection.parentOrigin, {
          type: "widget_response",
          connectionId: connection.id,
          sessionId: connection.sessionId,  
          result,
          timestamp: new Date().toISOString(),
        });
      })
      .catch((error) => {
        this.sendMessageToParent(connection.parentOrigin, {
          type: "widget_error",
          connectionId: connection.id,
          sessionId: connection.sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      });
  }

  private handleWidgetCommand(
    command: string,
    params: any,
    connection: WidgetConnection,
  ): void {
    switch (command) {
      case "pause":
        // Pause widget execution
        connection.isActive = false;
        this.sendMessageToParent(connection.parentOrigin, {
          type: "widget_paused",
          connectionId: connection.id,
          timestamp: new Date().toISOString(),
        });
        break;

      case "resume":
        // Resume widget execution
        connection.isActive = true;
        this.sendMessageToParent(connection.parentOrigin, {
          type: "widget_resumed",
          connectionId: connection.id,
          timestamp: new Date().toISOString(),
        });
        break;

      case "reset":
        // Reset widget state
        this.resetWidgetState(connection);
        break;

      case "close":
        // Close widget connection
        this.closeConnection(connection.id);
        break;

      default:
        console.warn("Unknown widget command:", command);
    }
  }

  private handleAnalyticsEvent(event: any, connection: WidgetConnection): void {
    // Forward analytics event with connection context
    this.trackEvent({
      ...event,
      widgetId: connection.widgetId,
      sessionId: connection.sessionId,
      data: {
        ...event.data,
        connectionId: connection.id,
        parentOrigin: connection.parentOrigin,
      },
    });
  }

  private resetWidgetState(connection: WidgetConnection): void {
    // Clear any cached state for this connection
    const stateKey = `widget_state_${connection.widgetId}_${connection.sessionId}`;
    try {
      localStorage.removeItem(stateKey);
      sessionStorage.removeItem(stateKey);
    } catch (error) {
      console.warn("Failed to clear widget state:", error);
    }

    // Notify parent of reset
    this.sendMessageToParent(connection.parentOrigin, {
      type: "widget_reset",
      connectionId: connection.id,
      // @ts-ignore
      sessionId: connection.sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  private closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove message listener
    // @ts-ignore
    if (connection.messageHandler) {
      // @ts-ignore
      window.removeEventListener("message", connection.messageHandler);
    }

    // Mark as inactive
    connection.isActive = false;

    // Remove from connections map
    this.connections.delete(connectionId);

    // Track connection closure
    this.trackEvent({
      type: "view",
      widgetId: connection.widgetId,
      // @ts-ignore
      sessionId: connection.sessionId,
      timestamp: new Date(),
      data: {
        action: "connection_closed",
        connectionId,
        duration: Date.now() - connection.established.getTime(),
      },
    });
  }

  private async initializeAPXConnection(
    connection: WidgetConnection,
  ): Promise<void> {
    // Initialize APIX connection for real-time features
    try {
      // This would connect to the APIX WebSocket for real-time updates
      // Implementation depends on APIX client availability
      console.log(
        "APIX connection initialized for widget:",
        connection.widgetId,
      );
    } catch (error) {
      console.warn("Failed to initialize APIX connection:", error);
    }
  }

  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0 || !this.isOnline) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await apiClient.post("/analytics/events/batch", { events });
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
      console.warn("Failed to send analytics events:", error);
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.connections.forEach((connection) => {
        if (connection.isActive) {
          window.parent.postMessage(
            {
              type: "heartbeat",
              connectionId: connection.id,
              timestamp: Date.now(),
            },
            connection.parentOrigin,
          );
        }
      });
    }, 30000); // 30 seconds
  }

  private pauseConnections(): void {
    this.connections.forEach((connection) => {
      connection.isActive = false;
    });
  }

  private resumeConnections(): void {
    this.connections.forEach((connection) => {
      connection.isActive = true;
      connection.lastActivity = new Date();
    });
  }

  private handleResize(dimensions: { width: number; height: number }): void {
    // Implement widget resize logic
    const widget = document.querySelector(".synapse-widget");
    if (widget) {
      (widget as HTMLElement).style.width = `${dimensions.width}px`;
      (widget as HTMLElement).style.height = `${dimensions.height}px`;
    }
  }

  private handleThemeChange(theme: any): void {
    // Implement theme change logic
    const widget = document.querySelector(".synapse-widget");
    if (widget) {
      Object.entries(theme).forEach(([key, value]) => {
        (widget as HTMLElement).style.setProperty(`--${key}`, value as string);
      });
    }
  }

  private async getIPGeolocation(): Promise<GeolocationData | undefined> {
    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();

      return {
        country: data.country_name,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
      };
    } catch {
      return undefined;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private cleanup(): void {
    // Flush remaining events
    this.flushEventQueue();

    // Close connections
    this.connections.forEach((connection) => {
      connection.isActive = false;
    });

    this.connections.clear();
  }
}

// Export singleton instance
export const widgetRuntime = new SynapseWidgetRuntime({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  enableAnalytics: true,
  enableCaching: true,
  debug: process.env.NODE_ENV === "development",
});
