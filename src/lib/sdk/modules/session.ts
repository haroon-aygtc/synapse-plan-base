/**
 * Session Module
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import { SessionContext, APIResponse, PaginatedResponse } from "../types";
import { ValidationError } from "../errors";
import { generateSessionId } from "../utils";
import { APXMessageType } from "@/types/apix";

export interface CreateSessionRequest {
  userId?: string;
  organizationId?: string;
  initialContext?: Record<string, any>;
  expiresIn?: number; // seconds
  permissions?: Record<string, any>;
}

export interface UpdateSessionRequest {
  context?: Record<string, any>;
  expiresAt?: Date;
  permissions?: Record<string, any>;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  organizationId: string;
  context: Record<string, any>;
  permissions: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
  isActive: boolean;
  executionCount: number;
  totalCost: number;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
  totalExecutions: number;
  totalCost: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
}

/**
 * Session module for managing user sessions and cross-module context
 */
export class SessionModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/sessions");
  }

  /**
   * Create a new session
   */
  async create(request: CreateSessionRequest = {}): Promise<SessionData> {
    const sessionId = generateSessionId();
    const currentUser = this.getCurrentUser();
    const currentOrg = this.getCurrentOrganization();

    try {
      const response = await this.post<SessionData>("", {
        sessionId,
        userId: request.userId || currentUser?.id,
        organizationId: request.organizationId || currentOrg?.id,
        initialContext: request.initialContext || {},
        expiresIn: request.expiresIn || 3600, // 1 hour default
        permissions: request.permissions || {},
      });

      if (response.success && response.data) {
        this.emit("session:created", response.data);
        this.debug("Session created successfully", { sessionId });
        return response.data;
      }

      throw new Error("Failed to create session");
    } catch (error) {
      this.debug("Session creation failed", error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async get(sessionId: string): Promise<SessionData> {
    this.validateRequired({ sessionId }, ["sessionId"]);

    try {
      const response = await this.get<SessionData>(`/${sessionId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Session not found");
    } catch (error) {
      this.debug("Failed to get session", { sessionId, error });
      throw error;
    }
  }

  /**
   * Get current session context
   */
  getCurrentSession(): SessionContext | null {
    return this.client.getSessionContext();
  }

  /**
   * Update session context and permissions
   */
  async update(
    sessionId: string,
    updates: UpdateSessionRequest,
  ): Promise<SessionData> {
    this.validateRequired({ sessionId }, ["sessionId"]);

    try {
      const response = await this.patch<SessionData>(`/${sessionId}`, {
        context: updates.context,
        expiresAt: updates.expiresAt?.toISOString(),
        permissions: updates.permissions,
      });

      if (response.success && response.data) {
        // Update client session context if this is the current session
        const currentSession = this.getCurrentSession();
        if (currentSession && currentSession.sessionId === sessionId) {
          this.client.updateSessionContext({
            ...currentSession,
            crossModuleData: {
              ...currentSession.crossModuleData,
              ...updates.context,
            },
            permissions: {
              ...currentSession.permissions,
              ...updates.permissions,
            },
          });
        }

        this.emit("session:updated", response.data);
        this.debug("Session updated successfully", { sessionId });
        return response.data;
      }

      throw new Error("Failed to update session");
    } catch (error) {
      this.debug("Session update failed", { sessionId, error });
      throw error;
    }
  }

  /**
   * Extend session expiration
   */
  async extend(
    sessionId: string,
    additionalSeconds: number,
  ): Promise<SessionData> {
    this.validateRequired({ sessionId, additionalSeconds }, [
      "sessionId",
      "additionalSeconds",
    ]);

    if (additionalSeconds <= 0) {
      throw new ValidationError(
        "Additional seconds must be positive",
        "additionalSeconds",
        "positive number",
        additionalSeconds,
      );
    }

    try {
      const response = await this.post<SessionData>(`/${sessionId}/extend`, {
        additionalSeconds,
      });

      if (response.success && response.data) {
        this.emit("session:extended", response.data);
        this.debug("Session extended successfully", {
          sessionId,
          additionalSeconds,
        });
        return response.data;
      }

      throw new Error("Failed to extend session");
    } catch (error) {
      this.debug("Session extension failed", { sessionId, error });
      throw error;
    }
  }

  /**
   * Terminate session
   */
  async terminate(sessionId: string, reason?: string): Promise<void> {
    this.validateRequired({ sessionId }, ["sessionId"]);

    try {
      const response = await this.post(`/${sessionId}/terminate`, {
        reason: reason || "User requested termination",
      });

      if (response.success) {
        // Clear client session context if this is the current session
        const currentSession = this.getCurrentSession();
        if (currentSession && currentSession.sessionId === sessionId) {
          this.client.updateSessionContext(null);
        }

        this.emit("session:terminated", { sessionId, reason });
        this.debug("Session terminated successfully", { sessionId });
      } else {
        throw new Error("Failed to terminate session");
      }
    } catch (error) {
      this.debug("Session termination failed", { sessionId, error });
      throw error;
    }
  }

  /**
   * List sessions with pagination and filtering
   */
  async list(
    params: {
      page?: number;
      limit?: number;
      userId?: string;
      organizationId?: string;
      isActive?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<PaginatedResponse<SessionData>> {
    try {
      const queryParams = {
        ...params,
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString(),
      };

      const response = await this.getPaginated<SessionData>("", queryParams);
      return response;
    } catch (error) {
      this.debug("Failed to list sessions", error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  async getStats(
    params: {
      userId?: string;
      organizationId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<SessionStats> {
    try {
      const queryParams = {
        userId: params.userId,
        organizationId: params.organizationId,
        startDate: params.startDate?.toISOString(),
        endDate: params.endDate?.toISOString(),
      };

      const queryString = this.buildQueryString(queryParams);
      const response = await this.get<SessionStats>(`/stats${queryString}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Failed to get session statistics");
    } catch (error) {
      this.debug("Failed to get session stats", error);
      throw error;
    }
  }

  /**
   * Set cross-module data in current session
   */
  async setCrossModuleData(key: string, value: any): Promise<void> {
    const currentSession = this.getCurrentSession();
    if (!currentSession) {
      throw new Error("No active session");
    }

    this.validateRequired({ key, value }, ["key", "value"]);

    try {
      await this.update(currentSession.sessionId, {
        context: {
          ...currentSession.crossModuleData,
          [key]: value,
        },
      });

      this.emit("session:cross_module_data_set", { key, value });
      this.debug("Cross-module data set", { key });
    } catch (error) {
      this.debug("Failed to set cross-module data", { key, error });
      throw error;
    }
  }

  /**
   * Get cross-module data from current session
   */
  getCrossModuleData(key?: string): any {
    const currentSession = this.getCurrentSession();
    if (!currentSession) {
      return null;
    }

    if (key) {
      return currentSession.crossModuleData[key];
    }

    return currentSession.crossModuleData;
  }

  /**
   * Remove cross-module data from current session
   */
  async removeCrossModuleData(key: string): Promise<void> {
    const currentSession = this.getCurrentSession();
    if (!currentSession) {
      throw new Error("No active session");
    }

    this.validateRequired({ key }, ["key"]);

    try {
      const updatedContext = { ...currentSession.crossModuleData };
      delete updatedContext[key];

      await this.update(currentSession.sessionId, {
        context: updatedContext,
      });

      this.emit("session:cross_module_data_removed", { key });
      this.debug("Cross-module data removed", { key });
    } catch (error) {
      this.debug("Failed to remove cross-module data", { key, error });
      throw error;
    }
  }

  /**
   * Subscribe to session events
   */
  subscribeToSessionEvents(sessionId?: string): () => void {
    const targetSessionId = sessionId || this.getCurrentSession()?.sessionId;

    if (!targetSessionId) {
      throw new Error("No session ID provided and no active session");
    }

    const unsubscribers = [
      this.subscribe(APXMessageType.SESSION_CREATED, (message) => {
        if (message.payload.session_id === targetSessionId) {
          this.emit("session:created_event", message.payload);
        }
      }),

      this.subscribe(APXMessageType.SESSION_ENDED, (message) => {
        if (message.payload.session_id === targetSessionId) {
          this.emit("session:ended_event", message.payload);

          // Clear client session context if this is the current session
          const currentSession = this.getCurrentSession();
          if (currentSession && currentSession.sessionId === targetSessionId) {
            this.client.updateSessionContext(null);
          }
        }
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Refresh current session
   */
  async refreshCurrentSession(): Promise<SessionData | null> {
    const currentSession = this.getCurrentSession();
    if (!currentSession) {
      return null;
    }

    try {
      const sessionData = await this.get(currentSession.sessionId);

      // Update client session context
      this.client.updateSessionContext({
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        organizationId: sessionData.organizationId,
        permissions: sessionData.permissions,
        crossModuleData: sessionData.context,
        createdAt: sessionData.createdAt,
        expiresAt: sessionData.expiresAt,
      });

      this.emit("session:refreshed", sessionData);
      return sessionData;
    } catch (error) {
      this.debug("Failed to refresh current session", error);
      throw error;
    }
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(sessionData?: SessionData): boolean {
    const session = sessionData || this.getCurrentSession();
    if (!session) {
      return true;
    }

    const expiresAt = sessionData ? sessionData.expiresAt : session.expiresAt;
    return new Date() > new Date(expiresAt);
  }

  /**
   * Get session time remaining in seconds
   */
  getSessionTimeRemaining(sessionData?: SessionData): number {
    const session = sessionData || this.getCurrentSession();
    if (!session) {
      return 0;
    }

    const expiresAt = sessionData ? sessionData.expiresAt : session.expiresAt;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * Auto-extend session before expiration
   */
  async autoExtendSession(
    sessionId?: string,
    extensionSeconds: number = 3600,
    warningThresholdSeconds: number = 300,
  ): Promise<void> {
    const targetSessionId = sessionId || this.getCurrentSession()?.sessionId;

    if (!targetSessionId) {
      throw new Error("No session ID provided and no active session");
    }

    const checkAndExtend = async () => {
      try {
        const sessionData = await this.get(targetSessionId);
        const timeRemaining = this.getSessionTimeRemaining(sessionData);

        if (timeRemaining <= warningThresholdSeconds && timeRemaining > 0) {
          await this.extend(targetSessionId, extensionSeconds);
          this.emit("session:auto_extended", {
            sessionId: targetSessionId,
            extensionSeconds,
          });
        }
      } catch (error) {
        this.debug("Auto-extend session failed", {
          sessionId: targetSessionId,
          error,
        });
      }
    };

    // Check immediately and then every minute
    await checkAndExtend();
    const interval = setInterval(checkAndExtend, 60000);

    // Return cleanup function
    return () => {
      clearInterval(interval);
    };
  }
}
