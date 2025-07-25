import { useEffect, useRef, useState, useCallback } from "react";
import {
  APXClient,
  createAPXClient,
  APXClientConfig,
} from "@/lib/apix-client-sdk";
import { APXMessageType } from "@/types/apix";
import { useAuth } from "./useAuth";

interface UseAPXClientOptions {
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: (event: { code: number; reason: string }) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: any) => void;
}

export function useAPXClient(options: UseAPXClientOptions = {}) {
  const { user } = useAuth();
  const accessToken = localStorage.getItem("synapse_access_token");
  const clientRef = useRef<APXClient | null>(null);
  const [connectionState, setConnectionState] =
    useState<string>("disconnected");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Initialize client
  useEffect(() => {
    if (!accessToken || !user) return;

    const config: APXClientConfig = {
      url: process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001",
      token: accessToken,
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      messageTimeout: 30000,
      compression: true,
      encryption: true, 
      debug: process.env.NODE_ENV === "development",
      debugLevel: process.env.NODE_ENV === "development" ? "debug" : "info",
      debugFile: process.env.NODE_ENV === "development" ? "apix-debug.log" : undefined,
      debugMaxSize: process.env.NODE_ENV === "development" ? 1024 * 1024 * 10 : undefined,
      debugMaxFiles: process.env.NODE_ENV === "development" ? 10 : undefined,
      debugMaxFileAge: process.env.NODE_ENV === "development" ? 1000 * 60 * 60 * 24 : undefined,
      debugMaxFileCount: process.env.NODE_ENV === "development" ? 10 : undefined,
    };

    const client = createAPXClient(config);
    clientRef.current = client;

    // Set up event listeners
    client.on("connecting", () => setConnectionState("connecting"));
    client.on("connected", () => {
      setConnectionState("connected");
      setError(null);
      options.onConnected?.();
    });

    client.on("disconnected", (event) => {
      setConnectionState("disconnected");
      setSessionId(null);
      options.onDisconnected?.(event);
    });

    client.on("reconnecting", () => setConnectionState("reconnecting"));

    client.on("session_established", (payload) => {
      setSessionId(payload.session_id);
    });

    client.on("error", (err) => {
      setError(err);
      options.onError?.(err);
    });

    client.on("message", options.onMessage || (() => {}));

    // Auto-connect if enabled
    if (options.autoConnect !== false) {
      client.connect().catch(setError);
    }

    return () => {
      client.disconnect();
    };
  }, [accessToken, user, options.autoConnect]);

  // Connection methods
  const connect = useCallback(async () => {
    if (!clientRef.current) return;
    try {
      await clientRef.current.connect();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  // Message sending methods
  const sendMessage = useCallback(
    async <T = any>(
      type: APXMessageType,
      payload: any,
      options?: {
        correlation_id?: string;
        priority?: "low" | "normal" | "high" | "critical";
        expires_in_ms?: number;
        metadata?: Record<string, any>;
      },
    ): Promise<T> => {
      if (!clientRef.current) {
        throw new Error("APIX client not initialized");
      }
      return clientRef.current.sendMessage<T>(type, payload, options);
    },
    [],
  );

  // Subscription methods
  const subscribe = useCallback(
    (messageType: APXMessageType, callback: (payload: any) => void) => {
      if (!clientRef.current) {
        throw new Error("APIX client not initialized");
      }
      return clientRef.current.subscribe(messageType, callback);
    },
    [],
  );

  const subscribeToExecution = useCallback(
    (executionId: string, callback: (message: any) => void) => {
      if (!clientRef.current) {
        throw new Error("APIX client not initialized");
      }
      return clientRef.current.subscribeToExecution(executionId, callback);
    },
    [],
  );

  // Agent execution methods
  const startAgentExecution = useCallback(
    async (
      agentId: string,
      prompt: string,
      options?: {
        model?: string;
        parameters?: Record<string, any>;
        tools_available?: string[];
        knowledge_sources?: string[];
      },
    ) => {
      if (!clientRef.current) {
        throw new Error("APIX client not initialized");
      }
      return clientRef.current.startAgentExecution(agentId, prompt, options);
    },
    [],
  );

  const pauseStream = useCallback(
    async (executionId: string, reason?: string) => {
      if (!clientRef.current) {
        throw new Error("APIX client not initialized");
      }
      return clientRef.current.pauseStream(executionId, reason);
    },
    [],
  );

  const resumeStream = useCallback(async (executionId: string) => {
    if (!clientRef.current) {
      throw new Error("APIX client not initialized");
    }
    return clientRef.current.resumeStream(executionId);
  }, []);

  // Tool execution methods
  const callTool = useCallback(
    async (
      toolId: string,
      functionName: string,
      parameters: Record<string, any>,
    ) => {
      if (!clientRef.current) {
        throw new Error("APIX client not initialized");
      }
      return clientRef.current.callTool(toolId, functionName, parameters);
    },
    [],
  );

  // HITL methods
  const createHITLRequest = useCallback(
    async (
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
    ) => {
      if (!clientRef.current) {
        throw new Error("APIX client not initialized");
      }
      return clientRef.current.createHITLRequest(requestType, title, options);
    },
    [],
  );

  // Widget methods
  const submitWidgetQuery = useCallback(
    async (
      widgetId: string,
      query: string,
      queryType: string,
      context?: Record<string, any>,
    ) => {
      if (!clientRef.current) {
        throw new Error("APIX client not initialized");
      }
      return clientRef.current.submitWidgetQuery(
        widgetId,
        query,
        queryType,
        context,
      );
    },
    [],
  );

  // Knowledge base methods
  const searchKnowledge = useCallback(
    async (
      query: string,
      searchType: string,
      knowledgeSources: string[],
      options?: {
        filters?: Record<string, any>;
        top_k?: number;
      },
    ) => {
      if (!clientRef.current) {
        throw new Error("APIX client not initialized");
      }
      return clientRef.current.searchKnowledge(
        query,
        searchType,
        knowledgeSources,
        options,
      );
    },
    [],
  );

  return {
    // Connection state
    connectionState,
    sessionId,
    error,
    isConnected: connectionState === "connected",

    // Connection methods
    connect,
    disconnect,

    // Messaging methods
    sendMessage,
    subscribe,
    subscribeToExecution,

    // Agent methods
    startAgentExecution,
    pauseStream,
    resumeStream,

    // Tool methods
    callTool,

    // HITL methods
    createHITLRequest,

    // Widget methods
    submitWidgetQuery,

    // Knowledge methods
    searchKnowledge,

    // Direct client access for advanced usage
    client: clientRef.current,
  };
}
