// Session interfaces moved to index.ts
export interface ISession {
  id: string;
  sessionToken: string;
  userId: string;
  organizationId: string;
  context: Record<string, any>;
  metadata?: Record<string, any>;
  expiresAt: Date;
  lastAccessedAt?: Date;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
  permissions?: Record<string, any>;
  accessCount: number;
  memoryUsage: number;
  memoryLimit?: number;
  crossModuleData?: Record<string, any>;
  workflowId?: string;
  agentId?: string;
  toolId?: string;
  knowledgeId?: string;
  hitlRequestId?: string;
  executionState?: Record<string, any>;
  isRecoverable: boolean;
  recoveryData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionContext {
  userId: string;
  organizationId: string;
  sessionId: string;
  permissions: Record<string, any>;
  crossModuleData: Record<string, any>;
  executionState?: Record<string, any>;
  workflowContext?: {
    workflowId: string;
    stepId: string;
    variables: Record<string, any>;
    state: 'running' | 'paused' | 'completed' | 'failed';
  };
  agentContext?: {
    agentId: string;
    conversationId: string;
    memory: Record<string, any>;
    toolCalls: Array<{
      toolId: string;
      parameters: Record<string, any>;
      result?: any;
    }>;
  };
  toolContext?: {
    toolId: string;
    executionId: string;
    parameters: Record<string, any>;
    state: 'pending' | 'running' | 'completed' | 'failed';
  };
  knowledgeContext?: {
    searchHistory: Array<{
      query: string;
      results: any[];
      timestamp: Date;
    }>;
    documentAccess: string[];
  };
  hitlContext?: {
    requestId: string;
    approvalType: string;
    requestData: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected';
  };
}

export interface ISessionAnalytics {
  sessionId: string;
  organizationId: string;
  userId: string;
  duration: number;
  accessCount: number;
  memoryUsage: number;
  crossModuleInteractions: number;
  performanceMetrics: {
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  moduleUsage: {
    agent: number;
    tool: number;
    workflow: number;
    knowledge: number;
    hitl: number;
  };
  timestamp: Date;
}

export interface ISessionRecovery {
  sessionId: string;
  userId: string;
  organizationId: string;
  recoveryPoint: Date;
  executionState: Record<string, any>;
  crossModuleData: Record<string, any>;
  workflowState?: {
    workflowId: string;
    currentStep: string;
    completedSteps: string[];
    variables: Record<string, any>;
  };
  agentState?: {
    agentId: string;
    conversationHistory: any[];
    memory: Record<string, any>;
  };
  toolState?: {
    toolId: string;
    pendingExecutions: any[];
    results: Record<string, any>;
  };
}