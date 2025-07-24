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
  GeolocationData
} from '@/lib/sdk/types';
import { api } from '@/lib/api';

export class SynapseWidgetRuntime implements WidgetRuntime {
  private connections: Map<string, WidgetConnection> = new Map();
  private eventQueue: WidgetEvent[] = [];
  private isOnline: boolean = navigator.onLine;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(private config: {
    baseURL: string;
    apiKey?: string;
    enableAnalytics?: boolean;
    enableCaching?: boolean;
    debug?: boolean;
  }) {
    this.setupEventListeners();
    this.startHeartbeat();
  }

  /**
   * Execute a widget with the given input and context
   */
  async executeWidget(
    widgetId: string, 
    input: any, 
    context: WidgetExecutionContext
  ): Promise<WidgetExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate widget access
      await this.validateWidgetAccess(widgetId, context);
      
      // Track execution start
      this.trackEvent({
        type: 'interaction',
        widgetId,
        sessionId: context.sessionId,
        timestamp: new Date(),
        data: { action: 'execute_start', input: typeof input }
      });

      // Execute widget through API
      const response = await this.executeWithRetry(async () => {
        return await api.post(`/widgets/${widgetId}/execute`, {
          input,
          sessionId: context.sessionId,
          context: {
            deviceInfo: context.deviceInfo,
            geolocation: context.geolocation,
            customData: context.customData,
            userAgent: navigator.userAgent,
            pageUrl: window.location.href,
            referrer: document.referrer
          }
        });
      });

      const executionTime = Date.now() - startTime;
      
      if (response.data.success) {
        const result: WidgetExecutionResult = {
          executionId: response.data.data.executionId,
          result: response.data.data.result,
          status: 'completed',
          tokensUsed: response.data.data.tokensUsed,
          executionTime,
          error: undefined
        };

        // Track successful execution
        this.trackEvent({
          type: 'conversion',
          widgetId,
          sessionId: context.sessionId,
          timestamp: new Date(),
          data: { 
            executionTime, 
            tokensUsed: result.tokensUsed,
            success: true 
          }
        });

        return result;
      } else {
        throw new Error(response.data.message || 'Widget execution failed');
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Track execution error
      this.trackEvent({
        type: 'error',
        widgetId,
        sessionId: context.sessionId,
        timestamp: new Date(),
        data: { 
          error: error.message, 
          executionTime,
          stack: error.stack 
        }
      });

      return {
        executionId: `error_${Date.now()}`,
        result: null,
        status: 'failed',
        executionTime,
        error: error.message
      };
    }
  }

  /**
   * Establish a connection with the parent platform
   */
  async establishConnection(
    widgetId: string, 
    parentOrigin: string
  ): Promise<WidgetConnection> {
    // Validate origin against allowed domains
    const isValidOrigin = await this.validateOrigin(parentOrigin, []);
    
    if (!isValidOrigin) {
      throw new Error(`Origin ${parentOrigin} is not allowed for this widget`);
    }

    const connection: WidgetConnection = {
      id: `conn_${widgetId}_${Date.now()}`,
      widgetId,
      parentOrigin,
      established: new Date(),
      lastActivity: new Date(),
      isActive: true
    };

    this.connections.set(connection.id, connection);

    // Set up message listener for this connection
    this.setupMessageListener(connection);

    // Track connection establishment
    this.trackEvent({
      type: 'view',
      widgetId,
      sessionId: `session_${connection.id}`,
      timestamp: new Date(),
      data: { 
        action: 'connection_established',
        parentOrigin,
        userAgent: navigator.userAgent
      }
    });

    return connection;
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

      return allowedDomains.some(allowed => {
        // Exact match
        if (allowed === domain) return true;
        
        // Wildcard subdomain match
        if (allowed.startsWith('*.')) {
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
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = /iPad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Detect browser
    let browserName = 'Unknown';
    let browserVersion = '0.0';
    
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (userAgent.includes('Safari')) {
      browserName = 'Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    }

    // Detect OS
    let operatingSystem = 'Unknown';
    if (userAgent.includes('Windows')) operatingSystem = 'Windows';
    else if (userAgent.includes('Mac')) operatingSystem = 'macOS';
    else if (userAgent.includes('Linux')) operatingSystem = 'Linux';
    else if (userAgent.includes('Android')) operatingSystem = 'Android';
    else if (userAgent.includes('iOS')) operatingSystem = 'iOS';

    return {
      type: deviceType,
      userAgent,
      screenResolution: {
        width: screen.width,
        height: screen.height
      },
      browserInfo: {
        name: browserName,
        version: browserVersion
      },
      operatingSystem
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
            longitude: position.coords.longitude
          });
        },
        () => {
          // Fallback to IP-based geolocation
          this.getIPGeolocation().then(resolve).catch(() => resolve(undefined));
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }

  /**
   * Private helper methods
   */
  private async validateWidgetAccess(
    widgetId: string, 
    context: WidgetExecutionContext
  ): Promise<void> {
    // Check if widget exists and is active
    try {
      const response = await api.get(`/widgets/${widgetId}`);
      if (!response.data.success || !response.data.data.isActive) {
        throw new Error('Widget is not active or does not exist');
      }

      // Validate origin if security settings exist
      const widget = response.data.data;
      if (widget.configuration?.security?.allowedDomains?.length > 0) {
        const currentOrigin = window.location.origin;
        const isAllowed = this.validateOrigin(
          currentOrigin, 
          widget.configuration.security.allowedDomains
        );
        
        if (!isAllowed) {
          throw new Error('Origin not allowed for this widget');
        }
      }

      // Check rate limiting
      if (widget.configuration?.security?.rateLimiting?.enabled) {
        await this.checkRateLimit(widgetId, context.sessionId);
      }
    } catch (error) {
      throw new Error(`Widget validation failed: ${error.message}`);
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1
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

  private async checkRateLimit(widgetId: string, sessionId: string): Promise<void> {
    // Implementation would check against rate limiting service
    // For now, we'll implement a simple client-side check
    const key = `rate_limit_${widgetId}_${sessionId}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    
    const stored = localStorage.getItem(key);
    if (stored) {
      const { count, timestamp } = JSON.parse(stored);
      
      if (now - timestamp < windowMs) {
        if (count >= 60) { // Default 60 requests per minute
          throw new Error('Rate limit exceeded');
        }
        localStorage.setItem(key, JSON.stringify({ 
          count: count + 1, 
          timestamp 
        }));
      } else {
        localStorage.setItem(key, JSON.stringify({ 
          count: 1, 
          timestamp: now 
        }));
      }
    } else {
      localStorage.setItem(key, JSON.stringify({ 
        count: 1, 
        timestamp: now 
      }));
    }
  }

  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushEventQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Page visibility for connection management
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseConnections();
      } else {
        this.resumeConnections();
      }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  private setupMessageListener(connection: WidgetConnection): void {
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== connection.parentOrigin) return;
      
      // Update connection activity
      connection.lastActivity = new Date();
      
      // Handle different message types
      switch (event.data.type) {
        case 'ping':
          // Respond to heartbeat
          window.parent.postMessage({
            type: 'pong',
            connectionId: connection.id,
            timestamp: Date.now()
          }, connection.parentOrigin);
          break;
          
        case 'resize':
          // Handle resize requests
          this.handleResize(event.data.dimensions);
          break;
          
        case 'theme':
          // Handle theme changes
          this.handleThemeChange(event.data.theme);
          break;
      }
    };

    window.addEventListener('message', messageHandler);
  }

  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0 || !this.isOnline) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await api.post('/analytics/events/batch', { events });
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
      console.warn('Failed to send analytics events:', error);
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.connections.forEach(connection => {
        if (connection.isActive) {
          window.parent.postMessage({
            type: 'heartbeat',
            connectionId: connection.id,
            timestamp: Date.now()
          }, connection.parentOrigin);
        }
      });
    }, 30000); // 30 seconds
  }

  private pauseConnections(): void {
    this.connections.forEach(connection => {
      connection.isActive = false;
    });
  }

  private resumeConnections(): void {
    this.connections.forEach(connection => {
      connection.isActive = true;
      connection.lastActivity = new Date();
    });
  }

  private handleResize(dimensions: { width: number; height: number }): void {
    // Implement widget resize logic
    const widget = document.querySelector('.synapse-widget');
    if (widget) {
      (widget as HTMLElement).style.width = `${dimensions.width}px`;
      (widget as HTMLElement).style.height = `${dimensions.height}px`;
    }
  }

  private handleThemeChange(theme: any): void {
    // Implement theme change logic
    const widget = document.querySelector('.synapse-widget');
    if (widget) {
      Object.entries(theme).forEach(([key, value]) => {
        (widget as HTMLElement).style.setProperty(`--${key}`, value as string);
      });
    }
  }

  private async getIPGeolocation(): Promise<GeolocationData | undefined> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        country: data.country_name,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude
      };
    } catch {
      return undefined;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanup(): void {
    // Flush remaining events
    this.flushEventQueue();
    
    // Close connections
    this.connections.forEach(connection => {
      connection.isActive = false;
    });
    
    this.connections.clear();
  }
}

// Export singleton instance
export const widgetRuntime = new SynapseWidgetRuntime({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  enableAnalytics: true,
  enableCaching: true,
  debug: process.env.NODE_ENV === 'development'
});