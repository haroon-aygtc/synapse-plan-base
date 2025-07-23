// APIX WebSocket Protocol Types

// Core Message Types
export enum APXMessageType {
    // Lifecycle Events
    SESSION_CREATED = 'session_created',
    SESSION_ENDED = 'session_ended',
    CONNECTION_ACK = 'connection_ack',
    CONNECTION_HEARTBEAT = 'connection_heartbeat',
  
    // Agent Execution
    AGENT_EXECUTION_STARTED = 'agent_execution_started',
    AGENT_TEXT_CHUNK = 'agent_text_chunk',
    AGENT_TOOL_CALL = 'agent_tool_call',
    AGENT_MEMORY_USED = 'agent_memory_used',
    AGENT_ERROR = 'agent_error',
    AGENT_EXECUTION_COMPLETE = 'agent_execution_complete',
  
    // Tool Invocation
    TOOL_CALL_START = 'tool_call_start',
    TOOL_CALL_RESULT = 'tool_call_result',
    TOOL_CALL_ERROR = 'tool_call_error',
  
    // Knowledge Base
    KB_SEARCH_PERFORMED = 'kb_search_performed',
    KB_CHUNK_INJECTED = 'kb_chunk_injected',
  
    // HITL (Human-in-the-Loop)
    HITL_REQUEST_CREATED = 'hitl_request_created',
    HITL_RESOLUTION_PENDING = 'hitl_resolution_pending',
    HITL_RESOLVED = 'hitl_resolved',
    HITL_EXPIRED = 'hitl_expired',
  
    // Widget Events
    WIDGET_LOADED = 'widget_loaded',
    WIDGET_OPENED = 'widget_opened',
    WIDGET_QUERY_SUBMITTED = 'widget_query_submitted',
    WIDGET_CONVERTED = 'widget_converted',
  
    // Control Events
    STREAM_PAUSE = 'stream_pause',
    STREAM_RESUME = 'stream_resume',
    TOKEN_LIMIT_REACHED = 'token_limit_reached',
    PROVIDER_FALLBACK = 'provider_fallback',
  
    // Error Events
    VALIDATION_ERROR = 'validation_error',
    PERMISSION_DENIED = 'permission_denied',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    SESSION_EXPIRED = 'session_expired',
  }
  
  export enum APXStreamState {
    IDLE = 'idle',
    STREAMING = 'streaming',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    ERROR = 'error',
  }
  
  export enum APXExecutionState {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    PAUSED = 'paused',
  }
  
  export enum APXPermissionLevel {
    READ = 'read',
    WRITE = 'write',
    ADMIN = 'admin',
    EXECUTE = 'execute',
  }
  
  export enum APXSecurityLevel {
    PUBLIC = 'public',
    AUTHENTICATED = 'authenticated',
    ORGANIZATION = 'organization',
    PRIVATE = 'private',
  }
  
  // Agent Execution Payloads
  export interface APXAgentExecutionStarted {
    agent_id: string;
    execution_id: string;
    prompt: string;
    model: string;
    parameters: {
      temperature: number;
      max_tokens: number;
      stream: boolean;
    };
    tools_available: string[];
    memory_context: Record<string, any>;
  }
  
  export interface APXAgentTextChunk {
    execution_id: string;
    chunk_id: string;
    text: string;
    is_final: boolean;
    token_count: number;
    cumulative_tokens: number;
  }
  
  export interface APXAgentToolCall {
    execution_id: string;
    tool_call_id: string;
    tool_id: string;
    function_name: string;
    parameters: Record<string, any>;
    reasoning?: string;
  }
  
  export interface APXAgentMemoryUsed {
    execution_id: string;
    memory_type: 'short_term' | 'long_term' | 'episodic';
    memory_key: string;
    memory_value: any;
    context_relevance: number;
  }
  
  export interface APXAgentError {
    execution_id: string;
    error_type: 'validation' | 'execution' | 'timeout' | 'rate_limit' | 'provider';
    error_code: string;
    error_message: string;
    error_details?: Record<string, any>;
    retry_possible: boolean;
    suggested_action?: string;
  }
  
  export interface APXAgentExecutionComplete {
    execution_id: string;
    final_response: string;
    total_tokens: number;
    execution_time_ms: number;
    tools_used: Array<{
      tool_id: string;
      call_count: number;
      success_rate: number;
    }>;
    memory_updates: Array<{
      type: string;
      key: string;
      operation: 'create' | 'update' | 'delete';
    }>;
    cost_breakdown: {
      model_cost: number;
      tool_cost: number;
      total_cost: number;
    };
  }
  
  // Tool Invocation Payloads
  export interface APXToolCallStart {
    tool_call_id: string;
    tool_id: string;
    function_name: string;
    parameters: Record<string, any>;
    caller_type: 'agent' | 'workflow' | 'user';
    caller_id: string;
    timeout_ms: number;
  }
  
  export interface APXToolCallResult {
    tool_call_id: string;
    success: boolean;
    result: any;
    execution_time_ms: number;
    cost: number;
    metadata?: {
      api_calls_made: number;
      data_processed: number;
      cache_hit: boolean;
    };
  }
  
  export interface APXToolCallError {
    tool_call_id: string;
    error_type: 'validation' | 'execution' | 'timeout' | 'auth' | 'rate_limit';
    error_code: string;
    error_message: string;
    retry_possible: boolean;
    retry_after_ms?: number;
  }
  
  // Knowledge Base Payloads
  export interface APXKBSearchPerformed {
    search_id: string;
    query: string;
    search_type: 'semantic' | 'keyword' | 'hybrid';
    filters?: Record<string, any>;
    max_results: number;
    threshold: number;
  }
  
  export interface APXKBChunkInjected {
    search_id: string;
    chunk_id: string;
    document_id: string;
    content: string;
    relevance_score: number;
    metadata: {
      document_title: string;
      chunk_index: number;
      source_url?: string;
      last_updated: string;
    };
  }
  
  // HITL Payloads
  export interface APXHITLRequestCreated {
    request_id: string;
    request_type: 'approval' | 'input' | 'decision' | 'review';
    title: string;
    description: string;
    context: Record<string, any>;
    options?: Array<{
      id: string;
      label: string;
      value: any;
    }>;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    expires_at: string;
    assignee_roles: string[];
    assignee_users?: string[];
  }
  
  export interface APXHITLResolutionPending {
    request_id: string;
    assigned_to: string;
    assigned_at: string;
    estimated_resolution_time?: string;
  }
  
  export interface APXHITLResolved {
    request_id: string;
    resolution: {
      decision: any;
      reasoning?: string;
      resolved_by: string;
      resolved_at: string;
    };
    execution_should_continue: boolean;
    next_action?: string;
  }
  
  export interface APXHITLExpired {
    request_id: string;
    expired_at: string;
    default_action: 'continue' | 'halt' | 'retry';
    fallback_decision?: any;
  }
  
  // Widget Event Payloads
  export interface APXWidgetLoaded {
    widget_id: string;
    embed_url: string;
    configuration: Record<string, any>;
    user_context?: {
      ip_address: string;
      user_agent: string;
      referrer?: string;
    };
  }
  
  export interface APXWidgetOpened {
    widget_id: string;
    interaction_id: string;
    opened_at: string;
    trigger: 'user_click' | 'auto_open' | 'api_call';
  }
  
  export interface APXWidgetQuerySubmitted {
    widget_id: string;
    interaction_id: string;
    query: string;
    query_type: 'text' | 'voice' | 'structured';
    context: Record<string, any>;
  }
  
  export interface APXWidgetConverted {
    widget_id: string;
    interaction_id: string;
    conversion_type: 'lead' | 'sale' | 'signup' | 'custom';
    conversion_value?: number;
    conversion_data: Record<string, any>;
  }
  
  // Control Event Payloads
  export interface APXStreamControl {
    execution_id: string;
    action: 'pause' | 'resume';
    reason?: string;
    requested_by: string;
  }
  
  export interface APXTokenLimitReached {
    execution_id: string;
    current_tokens: number;
    token_limit: number;
    suggested_action: 'truncate' | 'summarize' | 'split' | 'upgrade';
  }
  
  export interface APXProviderFallback {
    execution_id: string;
    original_provider: string;
    fallback_provider: string;
    reason: 'rate_limit' | 'error' | 'timeout' | 'cost_optimization';
    impact_on_quality?: 'none' | 'minimal' | 'moderate' | 'significant';
  }
  
  // Session Lifecycle Payloads
  export interface APXSessionCreated {
    session_id: string;
    user_id: string;
    organization_id: string;
    created_at: string;
    expires_at: string;
    permissions: APXPermissionLevel[];
    security_level: APXSecurityLevel;
    initial_context: Record<string, any>;
  }
  
  export interface APXSessionEnded {
    session_id: string;
    ended_at: string;
    reason: 'user_logout' | 'timeout' | 'admin_action' | 'system_shutdown';
    duration_ms: number;
    final_stats: {
      messages_sent: number;
      messages_received: number;
      executions_performed: number;
      total_cost: number;
    };
  }
  
  // Connection Acknowledgment
  export interface APXConnectionAck {
    connection_id: string;
    session_id: string;
    server_time: string;
    protocol_version: string;
    supported_features: string[];
    rate_limits: {
      messages_per_minute: number;
      executions_per_hour: number;
      concurrent_streams: number;
    };
  }
  
  // Error Response Payloads
  export interface APXValidationError {
    field: string;
    message: string;
    code: string;
    received_value?: any;
    expected_format?: string;
  }
  
  export interface APXPermissionDenied {
    required_permission: APXPermissionLevel;
    current_permissions: APXPermissionLevel[];
    resource_type: string;
    resource_id?: string;
    suggested_action: string;
  }
  
  export interface APXRateLimitExceeded {
    limit_type: 'messages' | 'executions' | 'bandwidth' | 'cost';
    current_usage: number;
    limit: number;
    reset_time: string;
    retry_after_ms: number;
  }
  
  // Utility Types
  export type APXPayloadMap = {
    [APXMessageType.AGENT_EXECUTION_STARTED]: APXAgentExecutionStarted;
    [APXMessageType.AGENT_TEXT_CHUNK]: APXAgentTextChunk;
    [APXMessageType.AGENT_TOOL_CALL]: APXAgentToolCall;
    [APXMessageType.AGENT_MEMORY_USED]: APXAgentMemoryUsed;
    [APXMessageType.AGENT_ERROR]: APXAgentError;
    [APXMessageType.AGENT_EXECUTION_COMPLETE]: APXAgentExecutionComplete;
    [APXMessageType.TOOL_CALL_START]: APXToolCallStart;
    [APXMessageType.TOOL_CALL_RESULT]: APXToolCallResult;
    [APXMessageType.TOOL_CALL_ERROR]: APXToolCallError;
    [APXMessageType.KB_SEARCH_PERFORMED]: APXKBSearchPerformed;
    [APXMessageType.KB_CHUNK_INJECTED]: APXKBChunkInjected;
    [APXMessageType.HITL_REQUEST_CREATED]: APXHITLRequestCreated;
    [APXMessageType.HITL_RESOLUTION_PENDING]: APXHITLResolutionPending;
    [APXMessageType.HITL_RESOLVED]: APXHITLResolved;
    [APXMessageType.HITL_EXPIRED]: APXHITLExpired;
    [APXMessageType.WIDGET_LOADED]: APXWidgetLoaded;
    [APXMessageType.WIDGET_OPENED]: APXWidgetOpened;
    [APXMessageType.WIDGET_QUERY_SUBMITTED]: APXWidgetQuerySubmitted;
    [APXMessageType.WIDGET_CONVERTED]: APXWidgetConverted;
    [APXMessageType.STREAM_PAUSE]: APXStreamControl;
    [APXMessageType.STREAM_RESUME]: APXStreamControl;
    [APXMessageType.TOKEN_LIMIT_REACHED]: APXTokenLimitReached;
    [APXMessageType.PROVIDER_FALLBACK]: APXProviderFallback;
    [APXMessageType.SESSION_CREATED]: APXSessionCreated;
    [APXMessageType.SESSION_ENDED]: APXSessionEnded;
    [APXMessageType.CONNECTION_ACK]: APXConnectionAck;
    [APXMessageType.VALIDATION_ERROR]: APXValidationError[];
    [APXMessageType.PERMISSION_DENIED]: APXPermissionDenied;
    [APXMessageType.RATE_LIMIT_EXCEEDED]: APXRateLimitExceeded;
  };

  export type APXMessagePayload<T extends APXMessageType> = APXPayloadMap[T];
  