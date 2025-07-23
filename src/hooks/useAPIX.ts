'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { apixClient, APXMessage, APXConnectionState, APXSessionContext } from '@/lib/apix-client';
import { APXMessageType, APXStreamState, APXExecutionState } from '@/types/apix';
import { useAuth } from './useAuth';

export interface UseAPXOptions {
  autoConnect?: boolean;
  reconnectOnAuthChange?: boolean;
}

export interface UseAPXReturn {
  // Connection state
  isConnected: boolean;
  connectionState: APXConnectionState;
  sessionContext: APXSessionContext | null;
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Agent methods
  startAgentExecution: (
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
    }
  ) => Promise<string>;
  
  // Tool methods
  callTool: (
    toolId: string,
    functionName: string,
    parameters: Record<string, any>,
    options?: {
      caller_type?: 'agent' | 'workflow' | 'user';
      caller_id?: string;
      timeout_ms?: number;
    }
  ) => Promise<string>;
  
  // Knowledge methods
  searchKnowledge: (
    query: string,
    options?: {
      search_type?: 'semantic' | 'keyword' | 'hybrid';
      filters?: Record<string, any>;
      max_results?: number;
      threshold?: number;
    }
  ) => Promise<string>;
  
  // HITL methods
  createHITLRequest: (
    requestType: 'approval' | 'input' | 'decision' | 'review',
    title: string,
    description: string,
    options?: {
      context?: Record<string, any>;
      options?: Array<{ id: string; label: string; value: any }>;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      expires_at?: string;
      assignee_roles?: string[];
      assignee_users?: string[];
    }
  ) => Promise<string>;
  
  // Widget methods
  submitWidgetQuery: (
    widgetId: string,
    query: string,
    options?: {
      query_type?: 'text' | 'voice' | 'structured';
      context?: Record<string, any>;
    }
  ) => Promise<string>;
  
  // Stream control methods
  pauseStream: (executionId: string, reason?: string) => Promise<void>;
  resumeStream: (executionId: string, reason?: string) => Promise<void>;
  
  // Subscription methods
  subscribe: (
    messageType: APXMessageType,
    callback: (message: APXMessage) => void,
    options?: {
      filters?: Record<string, any>;
      target_id?: string;
    }
  ) => () => void;
  
  // Utility methods
  sendMessage: (
    type: APXMessageType,
    payload: any,
    options?: {
      request_id?: string;
      correlation_id?: string;
    }
  ) => Promise<void>;
}

export function useAPIX(options: UseAPXOptions = {}): UseAPXReturn {
  const { isAuthenticated, user } = useAuth();
  const [connectionState, setConnectionState] = useState<APXConnectionState>(apixClient.getConnectionState());
  const [sessionContext, setSessionContext] = useState<APXSessionContext | null>(apixClient.getSessionContext());
  const connectionStateUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionContextUnsubscribeRef = useRef<(() => void) | null>(null);
  
  const {
    autoConnect = true,
    reconnectOnAuthChange = true,
  } = options;

  // Connection methods
  const connect = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to connect to APIX');
    }
    
    try {
      await apixClient.connect();
    } catch (error) {
      console.error('Failed to connect to APIX:', error);
      throw error;
    }
  }, [isAuthenticated]);

  const disconnect = useCallback(() => {
    apixClient.disconnect();
  }, []);

  // Agent methods
  const startAgentExecution = useCallback(async (
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
    }
  ) => {
    if (!apixClient.isConnected()) {
      throw new Error('APIX client is not connected');
    }
    
    return await apixClient.startAgentExecution(agentId, prompt, options);
  }, []);

  // Tool methods
  const callTool = useCallback(async (
    toolId: string,
    functionName: string,
    parameters: Record<string, any>,
    options?: {
      caller_type?: 'agent' | 'workflow' | 'user';
      caller_id?: string;
      timeout_ms?: number;
    }
  ) => {
    if (!apixClient.isConnected()) {
      throw new Error('APIX client is not connected');
    }
    
    return await apixClient.callTool(toolId, functionName, parameters, options);
  }, []);

  // Knowledge methods
  const searchKnowledge = useCallback(async (
    query: string,
    options?: {
      search_type?: 'semantic' | 'keyword' | 'hybrid';
      filters?: Record<string, any>;
      max_results?: number;
      threshold?: number;
    }
  ) => {
    if (!apixClient.isConnected()) {
      throw new Error('APIX client is not connected');
    }
    
    return await apixClient.searchKnowledge(query, options);
  }, []);

  // HITL methods
  const createHITLRequest = useCallback(async (
    requestType: 'approval' | 'input' | 'decision' | 'review',
    title: string,
    description: string,
    options?: {
      context?: Record<string, any>;
      options?: Array<{ id: string; label: string; value: any }>;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      expires_at?: string;
      assignee_roles?: string[];
      assignee_users?: string[];
    }
  ) => {
    if (!apixClient.isConnected()) {
      throw new Error('APIX client is not connected');
    }
    
    return await apixClient.createHITLRequest(requestType, title, description, options);
  }, []);

  // Widget methods
  const submitWidgetQuery = useCallback(async (
    widgetId: string,
    query: string,
    options?: {
      query_type?: 'text' | 'voice' | 'structured';
      context?: Record<string, any>;
    }
  ) => {
    if (!apixClient.isConnected()) {
      throw new Error('APIX client is not connected');
    }
    
    return await apixClient.submitWidgetQuery(widgetId, query, options);
  }, []);

  // Stream control methods
  const pauseStream = useCallback(async (executionId: string, reason?: string) => {
    if (!apixClient.isConnected()) {
      throw new Error('APIX client is not connected');
    }
    
    await apixClient.pauseStream(executionId, reason);
  }, []);

  const resumeStream = useCallback(async (executionId: string, reason?: string) => {
    if (!apixClient.isConnected()) {
      throw new Error('APIX client is not connected');
    }
    
    await apixClient.resumeStream(executionId, reason);
  }, []);

  // Subscription methods
  const subscribe = useCallback((
    messageType: APXMessageType,
    callback: (message: APXMessage) => void,
    options?: {
      filters?: Record<string, any>;
      target_id?: string;
    }
  ) => {
    return apixClient.subscribe(messageType, callback, options);
  }, []);

  // Utility methods
  const sendMessage = useCallback(async (
    type: APXMessageType,
    payload: any,
    options?: {
      request_id?: string;
      correlation_id?: string;
    }
  ) => {
    if (!apixClient.isConnected()) {
      throw new Error('APIX client is not connected');
    }
    
    await apixClient.sendMessage(type, payload, options);
  }, []);

  // Setup connection state listener
  useEffect(() => {
    if (connectionStateUnsubscribeRef.current) {
      connectionStateUnsubscribeRef.current();
    }
    
    connectionStateUnsubscribeRef.current = apixClient.onConnectionStateChange((state) => {
      setConnectionState(state);
      
      // Update session context when connection state changes
      const newSessionContext = apixClient.getSessionContext();
      setSessionContext(newSessionContext);
    });
    
    return () => {
      if (connectionStateUnsubscribeRef.current) {
        connectionStateUnsubscribeRef.current();
      }
    };
  }, []);

  // Setup session context updates
  useEffect(() => {
    if (sessionContextUnsubscribeRef.current) {
      sessionContextUnsubscribeRef.current();
    }
    
    sessionContextUnsubscribeRef.current = subscribe(
      APXMessageType.SESSION_CREATED,
      (message) => {
        if (message.payload.session_context) {
          setSessionContext(message.payload.session_context);
        }
      }
    );
    
    return () => {
      if (sessionContextUnsubscribeRef.current) {
        sessionContextUnsubscribeRef.current();
      }
    };
  }, [subscribe]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && autoConnect && !apixClient.isConnected()) {
      connect().catch((error) => {
        console.error('Auto-connect failed:', error);
      });
    } else if (!isAuthenticated && apixClient.isConnected()) {
      disconnect();
    }
  }, [isAuthenticated, autoConnect, connect, disconnect]);

  // Reconnect on auth changes
  useEffect(() => {
    if (reconnectOnAuthChange && isAuthenticated && user) {
      // Refresh authentication with new token
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) {
        apixClient.authenticate(token).catch((error) => {
          console.error('Failed to refresh APIX authentication:', error);
        });
      }
    }
  }, [user, isAuthenticated, reconnectOnAuthChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionStateUnsubscribeRef.current) {
        connectionStateUnsubscribeRef.current();
      }
      if (sessionContextUnsubscribeRef.current) {
        sessionContextUnsubscribeRef.current();
      }
    };
  }, []);

  return {
    // Connection state
    isConnected: connectionState.status === 'connected',
    connectionState,
    sessionContext,
    
    // Connection methods
    connect,
    disconnect,
    
    // Agent methods
    startAgentExecution,
    
    // Tool methods
    callTool,
    
    // Knowledge methods
    searchKnowledge,
    
    // HITL methods
    createHITLRequest,
    
    // Widget methods
    submitWidgetQuery,
    
    // Stream control methods
    pauseStream,
    resumeStream,
    
    // Subscription methods
    subscribe,
    
    // Utility methods
    sendMessage,
  };
}

// Specialized hooks for specific use cases
export function useAgentExecution() {
  const apix = useAPIX();
  const [executions, setExecutions] = useState<Map<string, {
    id: string;
    agent_id: string;
    status: APXExecutionState;
    chunks: string[];
    final_response?: string;
    error?: string;
    started_at: Date;
    completed_at?: Date;
  }>>(new Map());

  // Subscribe to agent execution events
  useEffect(() => {
    const unsubscribers = [
      apix.subscribe(APXMessageType.AGENT_EXECUTION_STARTED, (message) => {
        const payload = message.payload;
        setExecutions(prev => new Map(prev.set(payload.execution_id, {
          id: payload.execution_id,
          agent_id: payload.agent_id,
          status: APXExecutionState.RUNNING,
          chunks: [],
          started_at: new Date(),
        })));
      }),
      
      apix.subscribe(APXMessageType.AGENT_TEXT_CHUNK, (message) => {
        const payload = message.payload;
        setExecutions(prev => {
          const execution = prev.get(payload.execution_id);
          if (execution) {
            const updated = {
              ...execution,
              chunks: [...execution.chunks, payload.text],
            };
            return new Map(prev.set(payload.execution_id, updated));
          }
          return prev;
        });
      }),
      
      apix.subscribe(APXMessageType.AGENT_EXECUTION_COMPLETE, (message) => {
        const payload = message.payload;
        setExecutions(prev => {
          const execution = prev.get(payload.execution_id);
          if (execution) {
            const updated = {
              ...execution,
              status: APXExecutionState.COMPLETED,
              final_response: payload.final_response,
              completed_at: new Date(),
            };
            return new Map(prev.set(payload.execution_id, updated));
          }
          return prev;
        });
      }),
      
      apix.subscribe(APXMessageType.AGENT_ERROR, (message) => {
        const payload = message.payload;
        setExecutions(prev => {
          const execution = prev.get(payload.execution_id);
          if (execution) {
            const updated = {
              ...execution,
              status: APXExecutionState.FAILED,
              error: payload.error_message,
              completed_at: new Date(),
            };
            return new Map(prev.set(payload.execution_id, updated));
          }
          return prev;
        });
      }),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [apix]);

  return {
    ...apix,
    executions: Array.from(executions.values()),
    getExecution: (id: string) => executions.get(id),
  };
}

export function useToolExecution() {
  const apix = useAPIX();
  const [toolCalls, setToolCalls] = useState<Map<string, {
    id: string;
    tool_id: string;
    function_name: string;
    parameters: Record<string, any>;
    status: APXExecutionState;
    result?: any;
    error?: string;
    started_at: Date;
    completed_at?: Date;
  }>>(new Map());

  // Subscribe to tool execution events
  useEffect(() => {
    const unsubscribers = [
      apix.subscribe(APXMessageType.TOOL_CALL_START, (message) => {
        const payload = message.payload;
        setToolCalls(prev => new Map(prev.set(payload.tool_call_id, {
          id: payload.tool_call_id,
          tool_id: payload.tool_id,
          function_name: payload.function_name,
          parameters: payload.parameters,
          status: APXExecutionState.RUNNING,
          started_at: new Date(),
        })));
      }),
      
      apix.subscribe(APXMessageType.TOOL_CALL_RESULT, (message) => {
        const payload = message.payload;
        setToolCalls(prev => {
          const toolCall = prev.get(payload.tool_call_id);
          if (toolCall) {
            const updated = {
              ...toolCall,
              status: payload.success ? APXExecutionState.COMPLETED : APXExecutionState.FAILED,
              result: payload.result,
              error: payload.success ? undefined : 'Tool execution failed',
              completed_at: new Date(),
            };
            return new Map(prev.set(payload.tool_call_id, updated));
          }
          return prev;
        });
      }),
      
      apix.subscribe(APXMessageType.TOOL_CALL_ERROR, (message) => {
        const payload = message.payload;
        setToolCalls(prev => {
          const toolCall = prev.get(payload.tool_call_id);
          if (toolCall) {
            const updated = {
              ...toolCall,
              status: APXExecutionState.FAILED,
              error: payload.error_message,
              completed_at: new Date(),
            };
            return new Map(prev.set(payload.tool_call_id, updated));
          }
          return prev;
        });
      }),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [apix]);

  return {
    ...apix,
    toolCalls: Array.from(toolCalls.values()),
    getToolCall: (id: string) => toolCalls.get(id),
  };
}

export function useHITLRequests() {
  const apix = useAPIX();
  const [requests, setRequests] = useState<Map<string, {
    id: string;
    request_type: string;
    title: string;
    description: string;
    context: Record<string, any>;
    priority: string;
    status: 'pending' | 'assigned' | 'resolved' | 'expired';
    created_at: Date;
    expires_at: Date;
    assigned_to?: string;
    resolution?: any;
  }>>(new Map());

  // Subscribe to HITL events
  useEffect(() => {
    const unsubscribers = [
      apix.subscribe(APXMessageType.HITL_REQUEST_CREATED, (message) => {
        const payload = message.payload;
        setRequests(prev => new Map(prev.set(payload.request_id, {
          id: payload.request_id,
          request_type: payload.request_type,
          title: payload.title,
          description: payload.description,
          context: payload.context,
          priority: payload.priority,
          status: 'pending',
          created_at: new Date(),
          expires_at: new Date(payload.expires_at),
        })));
      }),
      
      apix.subscribe(APXMessageType.HITL_RESOLUTION_PENDING, (message) => {
        const payload = message.payload;
        setRequests(prev => {
          const request = prev.get(payload.request_id);
          if (request) {
            const updated = {
              ...request,
              status: 'assigned' as const,
              assigned_to: payload.assigned_to,
            };
            return new Map(prev.set(payload.request_id, updated));
          }
          return prev;
        });
      }),
      
      apix.subscribe(APXMessageType.HITL_RESOLVED, (message) => {
        const payload = message.payload;
        setRequests(prev => {
          const request = prev.get(payload.request_id);
          if (request) {
            const updated = {
              ...request,
              status: 'resolved' as const,
              resolution: payload.resolution,
            };
            return new Map(prev.set(payload.request_id, updated));
          }
          return prev;
        });
      }),
      
      apix.subscribe(APXMessageType.HITL_EXPIRED, (message) => {
        const payload = message.payload;
        setRequests(prev => {
          const request = prev.get(payload.request_id);
          if (request) {
            const updated = {
              ...request,
              status: 'expired' as const,
            };
            return new Map(prev.set(payload.request_id, updated));
          }
          return prev;
        });
      }),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [apix]);

  return {
    ...apix,
    requests: Array.from(requests.values()),
    getRequest: (id: string) => requests.get(id),
    pendingRequests: Array.from(requests.values()).filter(r => r.status === 'pending'),
    assignedRequests: Array.from(requests.values()).filter(r => r.status === 'assigned'),
  };
}
