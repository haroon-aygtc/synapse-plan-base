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

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
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
      pingTimeout: 60000,
      pingInterval: 25000,
      forceNew: true,
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

  // Force reconnection
  forceReconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    setTimeout(() => this.connect(), 1000);
  }
}

export const wsService = new WebSocketService();
