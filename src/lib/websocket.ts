"use client";

import { io, Socket } from "socket.io-client";
import { ActivityItem } from "@/types/dashboard";

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token?: string) {
    if (this.socket?.connected) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

    this.socket = io(wsUrl, {
      auth: {
        token:
          token ||
          (typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null),
      },
      transports: ["websocket", "polling"],
      timeout: 20000,
    });

    this.socket.on("connect", () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason: any) => {
      console.log("WebSocket disconnected:", reason);
      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on("connect_error", (error: Error) => {
      console.error("WebSocket connection error:", error);
      this.handleReconnect();
    });

    // Listen for real-time events
    this.socket.on("activity_update", (data: ActivityItem) => {
      this.emit("activity_update", data);
    });

    this.socket.on("stats_update", (data: any) => {
      this.emit("stats_update", data);
    });

    this.socket.on("resource_update", (data: any) => {
      this.emit("resource_update", data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(
          `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
        );
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
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

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();
