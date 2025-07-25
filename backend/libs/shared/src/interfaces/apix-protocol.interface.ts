import {
  APXMessageType,
  APXSecurityLevel,
  APXPermissionLevel,
  APXStreamState,
} from '../enums';

export interface IAPXMessage {
  type: APXMessageType;
  session_id: string;
  payload: any;
  timestamp: string;
  request_id: string;
  correlation_id?: string;
  user_id?: string;
  organization_id?: string;
  security_level?: APXSecurityLevel;
  permissions?: APXPermissionLevel[];
  metadata?: Record<string, any>;
  retry_count?: number;
  expires_at?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  compression?: boolean;
  encryption?: boolean;
}

export interface IAPXMessageSchema {
  type: APXMessageType;
  required_fields: string[];
  optional_fields: string[];
  payload_schema: Record<string, string>;
  security_requirements: {
    min_permission_level: APXPermissionLevel;
    required_security_level: APXSecurityLevel;
    tenant_isolation: boolean;
  };
}

export interface IAPXValidationError {
  error_code: string;
  error_message: string;
  field_errors?: Record<string, string>;
  request_id?: string;
}

export interface IAPXPermissionDenied {
  error_code: string;
  error_message: string;
  required_permission: APXPermissionLevel;
  required_security_level: APXSecurityLevel;
  request_id?: string;
}

export interface IAPXRateLimitExceeded {
  error_code: string;
  error_message: string;
  limit: number;
  reset_at: string;
  request_id?: string;
}

export interface IAPXSessionContext {
  user_id: string;
  organization_id: string;
  permissions: APXPermissionLevel[];
  security_level: APXSecurityLevel;
  features: string[];
  metadata?: Record<string, any>;
  rate_limits: {
    messages_per_minute: number;
    executions_per_hour: number;
    concurrent_streams: number;
    current_usage: {
      messages: number;
      executions: number;
      streams: number;
    };
  };
  tenant_isolation: {
    allowed_organizations: string[];
    cross_tenant_access: boolean;
  };
  session_limits: {
    max_duration_ms: number;
    max_payload_size: number;
    max_concurrent_requests: number;
  };
}

export interface IAPXStreamingSession {
  session_id: string;
  stream_id: string;
  stream_type:
    | 'agent_execution'
    | 'tool_call'
    | 'knowledge_search'
    | 'workflow_execution';
  state: APXStreamState;
  created_at: string;
  last_activity: string;
  buffer_size: number;
  compression_enabled: boolean;
  encryption_enabled: boolean;
  metadata?: Record<string, any>;
}

// Agent Execution Messages
export interface IAPXAgentExecutionStarted {
  agent_id: string;
  execution_id: string;
  prompt: string;
  model?: string;
  parameters?: Record<string, any>;
  tools_available?: string[];
  knowledge_sources?: string[];
  execution_context?: Record<string, any>;
}

export interface IAPXAgentTextChunk {
  execution_id: string;
  chunk_id: string;
  text: string;
  is_final: boolean;
  token_count: number;
  cumulative_tokens: number;
}

export interface IAPXAgentToolCall {
  execution_id: string;
  tool_call_id: string;
  tool_id: string;
  function_name: string;
  parameters: Record<string, any>;
  start_time: string;
}

export interface IAPXAgentMemoryUsed {
  execution_id: string;
  memory_id: string;
  memory_type: string;
  content: string;
  relevance_score: number;
  source: string;
}

export interface IAPXAgentError {
  execution_id: string;
  error_type: string;
  error_code: string;
  error_message: string;
  error_details?: any;
  retry_possible: boolean;
  suggested_action: string;
}

export interface IAPXAgentExecutionComplete {
  execution_id: string;
  final_response: string;
  total_tokens: number;
  execution_time_ms: number;
  tools_used: Array<{
    tool_id: string;
    function_name: string;
    execution_time_ms: number;
  }>;
  memory_updates: Array<{
    memory_id: string;
    memory_type: string;
  }>;
  cost_breakdown: {
    model_cost: number;
    tool_cost: number;
    total_cost: number;
  };
}

// Tool Invocation Messages
export interface IAPXToolCallStart {
  tool_call_id: string;
  tool_id: string;
  function_name: string;
  parameters: Record<string, any>;
  timeout_ms?: number;
  execution_context?: Record<string, any>;
}

export interface IAPXToolCallResult {
  tool_call_id: string;
  tool_id: string;
  function_name: string;
  result: any;
  execution_time_ms: number;
  cost?: number;
}

export interface IAPXToolCallError {
  tool_call_id: string;
  tool_id: string;
  function_name: string;
  error_type: string;
  error_message: string;
  error_details?: any;
  retry_possible: boolean;
}

// Knowledge Base Messages
export interface IAPXKBSearchPerformed {
  search_id: string;
  query: string;
  search_type: string;
  knowledge_sources: string[];
  filters?: Record<string, any>;
  top_k?: number;
}

export interface IAPXKBChunkInjected {
  search_id: string;
  chunk_id: string;
  content: string;
  source: string;
  relevance_score: number;
  metadata?: Record<string, any>;
}

// HITL Messages
export interface IAPXHITLRequestCreated {
  request_id: string;
  request_type: string;
  title: string;
  description?: string;
  context?: Record<string, any>;
  options?: Array<{
    id: string;
    label: string;
    value: any;
  }>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  expiration?: string;
  assignee_roles?: string[];
  assignee_users?: string[];
}

export interface IAPXHITLResolutionPending {
  request_id: string;
  assigned_to: string;
  assigned_at: string;
  expected_resolution_by?: string;
}

export interface IAPXHITLResolved {
  request_id: string;
  resolved_by: string;
  resolution: any;
  resolution_time_ms: number;
  notes?: string;
}

export interface IAPXHITLExpired {
  request_id: string;
  created_at: string;
  expired_at: string;
  fallback_action?: string;
  fallback_result?: any;
}

// Widget Events
export interface IAPXWidgetLoaded {
  widget_id: string;
  widget_type: string;
  container_id: string;
  load_time_ms: number;
  configuration?: Record<string, any>;
}

export interface IAPXWidgetOpened {
  widget_id: string;
  widget_type: string;
  session_id: string;
  referrer?: string;
  user_agent?: string;
  device_info?: Record<string, any>;
}

export interface IAPXWidgetQuerySubmitted {
  interaction_id: string;
  widget_id: string;
  query: string;
  query_type: string;
  context?: Record<string, any>;
  user_info?: Record<string, any>;
}

export interface IAPXWidgetConverted {
  widget_id: string;
  interaction_id: string;
  conversion_type: string;
  conversion_value?: number;
  conversion_details?: Record<string, any>;
}

// Control Events
export interface IAPXStreamControl {
  execution_id: string;
  action: 'pause' | 'resume';
  requested_by: string;
  reason?: string;
  timestamp: string;
}

export interface IAPXTokenLimitReached {
  execution_id: string;
  limit: number;
  current_usage: number;
  limit_type: 'user' | 'organization' | 'model';
  suggested_action: string;
}

export interface IAPXProviderFallback {
  execution_id: string;
  original_provider: string;
  fallback_provider: string;
  reason: string;
  impact_assessment: string;
}
