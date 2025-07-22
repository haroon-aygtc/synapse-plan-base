'use client';

import { io, Socket } from 'socket.io-client';
import { ActivityItem } from '@/types/dashboard';

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  latency?: number;
}

export interface MessageProtocol {
  event: string;
  payload: any;
  timestamp: Date;
  messageId: string;
  userId?: string;
  organizationId?: string;
}

export interface SubscriptionOptions {
  targetType?: 'all' | 'tenant' | 'user' | 'flow';
  targetId?: string;
  autoResubscribe?: boolean;
}

export interface EventSubscription {
  eventType: string;
  callback: (data: any) => void;
  options: SubscriptionOptions;
  subscribedAt: Date;
  isActive: boolean;
}

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private subscriptions: Map<string, EventSubscription> = new Map();
  private pendingSubscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState = {
    status: 'disconnected',
    reconnectAttempts: 0,
  };
  private connectionStateListeners: Array<(state: ConnectionState) => void> =
    [];
  private lastPingTime: number = 0;

  connect(token?: string) {
    if (this.socket?.connected) {
      return;
    }

    this.updateConnectionState({ status: 'connecting' });

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

    this.socket = io(wsUrl, {
      auth: {
        token:
          token ||
          (typeof window !== 'undefined'
            ? localStorage.getItem('accessToken')
            : null),
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      autoConnect: true,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.updateConnectionState({
        status: 'connected',
        lastConnected: new Date(),
        reconnectAttempts: 0,
      });
      this.startHeartbeat();
      this.emit('connection_established', { connected: true });
      this.resubscribeToEvents();
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('WebSocket disconnected:', reason);
      this.updateConnectionState({ status: 'disconnected' });
      this.stopHeartbeat();
      this.emit('connection_lost', { reason });

      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      this.updateConnectionState({ status: 'error' });
      this.handleReconnect();
    });

    // Handle structured messages
    this.socket.on('message', (message: MessageProtocol) => {
      this.handleMessage(message);
    });

    // Handle legacy events for backward compatibility
    this.socket.on('activity_update', (data: ActivityItem) => {
      this.emit('activity_update', data);
    });

    this.socket.on('stats_update', (data: any) => {
      this.emit('stats_update', data);
    });

    this.socket.on('resource_update', (data: any) => {
      this.emit('resource_update', data);
    });

    // Handle heartbeat acknowledgments
    this.socket.on('heartbeat_ack', () => {
      if (this.lastPingTime > 0) {
        const latency = Date.now() - this.lastPingTime;
        this.updateConnectionState({ latency });
      }
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }
    });

    // Handle subscription confirmations
    this.socket.on('subscription_confirmed', (data: any) => {
      this.handleSubscriptionResponse(data.eventType, true);
    });

    this.socket.on('subscription_error', (data: any) => {
      this.handleSubscriptionResponse(data.eventType, false);
    });

    // Handle unsubscription confirmations
    this.socket.on('unsubscription_confirmed', (data: any) => {
      console.log(`Unsubscription confirmed for: ${data.eventType}`);
    });

    // Handle event publication confirmations
    this.socket.on('event_published', (data: any) => {
      console.log(`Event published: ${data.eventType} (ID: ${data.eventId})`);
      this.emit('event_published', data);
    });

    // Handle connection statistics
    this.socket.on('connection_stats', (data: any) => {
      this.emit('connection_stats', data);
    });

    // Handle subscription statistics
    this.socket.on('subscription_stats', (data: any) => {
      this.emit('subscription_stats', data);
    });

    // Handle room join/leave confirmations
    this.socket.on('room_joined', (data: any) => {
      console.log(`Joined room: ${data.room}`);
      this.emit('room_joined', data);
    });

    this.socket.on('room_left', (data: any) => {
      console.log(`Left room: ${data.room}`);
      this.emit('room_left', data);
    });

    // Handle errors
    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      this.emit('websocket_error', error);
    });
  }

  private handleMessage(message: MessageProtocol) {
    const { event, payload } = message;

    switch (event) {
      case 'connection_established':
        this.emit('connection_established', payload);
        break;
      case 'heartbeat_ack':
        if (this.lastPingTime > 0) {
          const latency = Date.now() - this.lastPingTime;
          this.updateConnectionState({ latency });
        }
        break;
      case 'activity_update':
        this.emit('activity_update', payload);
        break;
      case 'stats_update':
        this.emit('stats_update', payload);
        break;
      case 'resource_update':
        this.emit('resource_update', payload);
        break;
      case 'agent_execution_update':
        this.emit('agent_execution_update', payload);
        break;
      case 'workflow_execution_update':
        this.emit('workflow_execution_update', payload);
        break;
      case 'tool_execution_update':
        this.emit('tool_execution_update', payload);
        break;
      case 'system_notification':
        this.emit('system_notification', payload);
        break;
      case 'connection_stats_update':
        this.emit('connection_stats_update', payload);
        break;
      case 'subscription_confirmed':
        this.handleSubscriptionResponse(payload.eventType, true);
        break;
      case 'subscription_error':
        this.handleSubscriptionResponse(payload.eventType, false);
        break;
      case 'unsubscription_confirmed':
        console.log(`Unsubscription confirmed for: ${payload.eventType}`);
        break;
      case 'event_published':
        this.emit('event_published', payload);
        break;
      case 'connection_stats':
        this.emit('connection_stats', payload);
        break;
      case 'subscription_stats':
        this.emit('subscription_stats', payload);
        break;
      case 'room_joined':
        this.emit('room_joined', payload);
        break;
      case 'room_left':
        this.emit('room_left', payload);
        break;
      default:
        this.emit(event, payload);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.lastPingTime = Date.now();
        this.socket.emit('heartbeat', { timestamp: this.lastPingTime });

        // Set timeout for heartbeat response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Heartbeat timeout - connection may be stale');
          this.updateConnectionState({ status: 'error' });
        }, 10000); // 10 second timeout
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.updateConnectionState({
        status: 'connecting',
        reconnectAttempts: this.reconnectAttempts,
      });

      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

      setTimeout(() => {
        console.log(
          `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
        );
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.updateConnectionState({ status: 'error' });
    }
  }

  private updateConnectionState(updates: Partial<ConnectionState>) {
    this.connectionState = { ...this.connectionState, ...updates };
    this.connectionStateListeners.forEach((listener) =>
      listener(this.connectionState),
    );
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.updateConnectionState({ status: 'disconnected' });
  }

  // Send structured message
  sendMessage(
    event: string,
    payload: any,
    targetUserId?: string,
    targetOrganizationId?: string,
  ) {
    if (!this.socket?.connected) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    this.socket.emit('send_message', {
      event,
      payload,
      targetUserId,
      targetOrganizationId,
    });
  }

  // Join a room
  joinRoom(room: string) {
    if (!this.socket?.connected) {
      console.warn('Cannot join room: WebSocket not connected');
      return;
    }

    this.socket.emit('join_room', { room });
  }

  // Leave a room
  leaveRoom(room: string) {
    if (!this.socket?.connected) {
      console.warn('Cannot leave room: WebSocket not connected');
      return;
    }

    this.socket.emit('leave_room', { room });
  }

  // Get connection statistics
  getConnectionStats() {
    if (!this.socket?.connected) {
      console.warn('Cannot get stats: WebSocket not connected');
      return;
    }

    this.socket.emit('get_connection_stats');
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(callback);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    };
  }

  // Subscribe to connection state changes
  onConnectionStateChange(callback: (state: ConnectionState) => void) {
    this.connectionStateListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.connectionStateListeners.indexOf(callback);
      if (index > -1) {
        this.connectionStateListeners.splice(index, 1);
      }
    };
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // Event Subscription Management
  subscribe(
    eventType: string,
    callback: (data: any) => void,
    options: SubscriptionOptions = {},
  ): () => void {
    const subscriptionId = `${eventType}_${Date.now()}_${Math.random()}`;
    
    const subscription: EventSubscription = {
      eventType,
      callback,
      options: {
        targetType: 'tenant',
        autoResubscribe: true,
        ...options,
      },
      subscribedAt: new Date(),
      isActive: false,
    };

    this.subscriptions.set(subscriptionId, subscription);
    
    // Also add to regular listeners for backward compatibility
    this.on(eventType, callback);

    // Send subscription request to server
    this.sendSubscriptionRequest(eventType, options);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionId);
    };
  }

  private sendSubscriptionRequest(
    eventType: string,
    options: SubscriptionOptions,
  ): void {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    if (this.pendingSubscriptions.has(eventType)) {
      console.log(`Subscription already pending for: ${eventType}`);
      return;
    }

    this.pendingSubscriptions.add(eventType);
    
    this.socket.emit('subscribe_event', {
      eventType,
      targetType: options.targetType || 'tenant',
      targetId: options.targetId,
    });

    console.log(`Subscribing to event: ${eventType}`);
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Remove from local listeners
    const eventListeners = this.listeners.get(subscription.eventType);
    if (eventListeners) {
      const index = eventListeners.indexOf(subscription.callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }

    // Send unsubscription request to server
    if (this.socket?.connected && subscription.isActive) {
      this.socket.emit('unsubscribe_event', {
        eventType: subscription.eventType,
      });
    }

    this.subscriptions.delete(subscriptionId);
    console.log(`Unsubscribed from: ${subscription.eventType}`);
  }

  private unsubscribeFromAllEvents(): void {
    for (const [subscriptionId, subscription] of Array.from(this.subscriptions.entries())) {
      if (this.socket?.connected && subscription.isActive) {
        this.socket.emit('unsubscribe_event', {
          eventType: subscription.eventType,
        });
      }
    }
  }

  private resubscribeToEvents(): void {
    for (const subscription of Array.from(this.subscriptions.values())) {
      if (subscription.options.autoResubscribe !== false) {
        this.sendSubscriptionRequest(subscription.eventType, subscription.options);
      }
    }
  }

  // Publish event to other clients
  publishEvent(
    eventType: string,
    payload: any,
    targetType: 'all' | 'tenant' | 'user' | 'flow' = 'tenant',
    targetId?: string,
  ): void {
    if (!this.socket?.connected) {
      console.warn('Cannot publish event: WebSocket not connected');
      return;
    }

    this.socket.emit('publish_event', {
      eventType,
      payload,
      targetType,
      targetId,
    });

    console.log(`Published event: ${eventType} to ${targetType}${targetId ? `:${targetId}` : ''}`);
  }

  // Get current subscriptions
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  // Get subscription statistics
  getSubscriptionStats(): void {
    if (!this.socket?.connected) {
      console.warn('Cannot get subscription stats: WebSocket not connected');
      return;
    }

    this.socket.emit('get_subscription_stats');
  }

  // Force reconnection with new token
  forceReconnect(newToken?: string) {
    this.disconnect();
    this.reconnectAttempts = 0;
    
    // Update token if provided
    if (newToken && typeof window !== 'undefined') {
      localStorage.setItem('accessToken', newToken);
    }
    
    setTimeout(() => this.connect(newToken), 1000);
  }

  // Handle authentication changes (token refresh, login, logout)
  handleAuthChange(newToken?: string) {
    if (newToken) {
      // New token provided - reconnect with new token
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', newToken);
      }
      this.forceReconnect(newToken);
    } else {
      // No token (logout) - disconnect
      this.disconnect();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
  }

  // Check if current token is valid
  private isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  // Get connection metadata
  getConnectionMetadata(): {
    isConnected: boolean;
    connectionState: ConnectionState;
    hasValidToken: boolean;
  } {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      isConnected: this.isConnected(),
      connectionState: this.getConnectionState(),
      hasValidToken: token ? this.isTokenValid(token) : false,
    };
  }
}

  // Handle subscription confirmations and errors
  private handleSubscriptionResponse(eventType: string, success: boolean): void {
    this.pendingSubscriptions.delete(eventType);
    
    // Update subscription status
    for (const subscription of this.subscriptions.values()) {
      if (subscription.eventType === eventType) {
        subscription.isActive = success;
      }
    }

    if (success) {
      console.log(`Successfully subscribed to: ${eventType}`);
      this.emit('subscription_confirmed', { eventType, success });
    } else {
      console.warn(`Failed to subscribe to: ${eventType}`);
      this.emit('subscription_error', { eventType, success });
    }
  }
}

export const wsService = new WebSocketService();