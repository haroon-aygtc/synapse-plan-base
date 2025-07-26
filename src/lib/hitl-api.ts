import { apiClient } from './api';

export interface HITLRequest {
  [x: string]: any;
  id: string;
  title: string;
  description: string;
  type:
    | 'APPROVAL'
    | 'REVIEW'
    | 'DECISION'
    | 'VALIDATION'
    | 'ESCALATION'
    | 'CONSULTATION';
  status:
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'APPROVED'
    | 'REJECTED'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'DELEGATED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';
  sourceType: 'agent' | 'tool' | 'workflow';
  sourceId: string;
  executionId?: string;
  requesterId: string;
  assigneeId?: string;
  assigneeRoles?: string[];
  assigneeUsers?: string[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  decisionData?: {
    approved?: boolean;
    reason?: string;
    comments?: string;
    attachments?: string[];
    metadata?: Record<string, any>;
  };
  votingData?: {
    totalVotes: number;
    approvalVotes: number;
    rejectionVotes: number;
    abstainVotes: number;
    requiredVotes: number;
    voters: Array<{
      userId: string;
      vote: 'approve' | 'reject' | 'abstain';
      reason?: string;
      votedAt: string;
    }>;
  };
  performanceMetrics?: {
    responseTimeMs: number;
    decisionTimeMs: number;
    escalationCount: number;
    discussionMessages: number;
    expertsConsulted: number;
  };
  requester: {
    id: string;
    name: string;
    email: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  comments: HITLComment[];
  votes: HITLVote[];
}

export interface HITLComment {
  id: string;
  requestId: string;
  userId: string;
  content: string;
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
  parentCommentId?: string;
  isInternal: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  replies: HITLComment[];
}

export interface HITLVote {
  id: string;
  requestId: string;
  userId: string;
  vote: 'approve' | 'reject' | 'abstain';
  reason?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateHITLRequestData {
  title: string;
  description: string;
  type?:
    | 'APPROVAL'
    | 'REVIEW'
    | 'DECISION'
    | 'VALIDATION'
    | 'ESCALATION'
    | 'CONSULTATION';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';
  sourceType: 'agent' | 'tool' | 'workflow';
  sourceId: string;
  executionId?: string;
  executionContext?: Record<string, any>;
  assigneeId?: string;
  assigneeRoles?: string[];
  assigneeUsers?: string[];
  expiresAt?: string;
  timeoutMs?: number;
  escalationRules?: {
    enabled: boolean;
    timeoutMinutes: number;
    escalationChain: Array<{
      level: number;
      assigneeRoles?: string[];
      assigneeUsers?: string[];
      timeoutMinutes: number;
    }>;
    autoEscalate: boolean;
    maxEscalationLevel: number;
  };
  allowDiscussion?: boolean;
  requireExpertConsultation?: boolean;
  expertConsultants?: string[];
  votingData?: {
    requiredVotes: number;
  };
  metadata?: Record<string, any>;
  tags?: string[];
  category?: string;
}

export interface HITLRequestsResponse {
  requests: HITLRequest[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface HITLAnalytics {
  summary: {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    expiredRequests: number;
    averageResponseTime: number;
    averageDecisionTime: number;
    escalationRate: number;
  };
  trends: {
    daily: Array<{
      date: string;
      created: number;
      resolved: number;
      expired: number;
    }>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  };
  performance: {
    topPerformers: Array<{
      userId: string;
      userName: string;
      resolvedCount: number;
      averageResponseTime: number;
      approvalRate: number;
    }>;
    bottlenecks: Array<{
      type: string;
      count: number;
      averageTime: number;
      impact: 'low' | 'medium' | 'high';
    }>;
  };
}

export interface HITLDashboardData {
  myRequests: HITLRequest[];
  assignedToMe: HITLRequest[];
  recentActivity: HITLRequest[];
  analytics: HITLAnalytics['summary'];
  trends: HITLAnalytics['trends'];
}

class HITLApi {
  async createRequest(data: CreateHITLRequestData): Promise<HITLRequest> {
    const response = await apiClient.post('/hitl/requests', data);
    return response.data.data;
  }

  async getRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    assignedToMe?: boolean;
    createdByMe?: boolean;
    sourceType?: 'agent' | 'tool' | 'workflow';
    category?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<HITLRequestsResponse> {
    const response = await apiClient.get('/hitl/requests', { params });
    return {
      requests: response.data.data,
      total: response.data.total,
      pagination: response.data.pagination,
    };
  }

  async getRequestById(id: string): Promise<HITLRequest> {
    const response = await apiClient.get(`/hitl/requests/${id}`);
    return response.data.data;
  }

  async updateRequest(
    id: string,
    data: Partial<CreateHITLRequestData>,
  ): Promise<HITLRequest> {
    const response = await apiClient.put(`/hitl/requests/${id}`, data);
    return response.data.data;
  }

  async resolveRequest(
    id: string,
    data: {
      approved: boolean;
      reason?: string;
      comments?: string;
      attachments?: string[];
      metadata?: Record<string, any>;
    },
  ): Promise<HITLRequest> {
    const response = await apiClient.post(`/hitl/requests/${id}/resolve`, data);
    return response.data.data;
  }

  async assignRequest(
    id: string,
    data: {
      assigneeId?: string;
      assigneeRoles?: string[];
      assigneeUsers?: string[];
      reason?: string;
    },
  ): Promise<HITLRequest> {
    const response = await apiClient.post(`/hitl/requests/${id}/assign`, data);
    return response.data.data;
  }

  async delegateRequest(
    id: string,
    data: {
      delegatedToId: string;
      reason?: string;
      instructions?: string;
    },
  ): Promise<HITLRequest> {
    const response = await apiClient.post(`/hitl/requests/${id}/delegate`, data);
    return response.data.data;
  }

  async escalateRequest(
    id: string,
    data: {
      reason:
        | 'TIMEOUT'
        | 'COMPLEXITY'
        | 'CONFLICT'
        | 'EXPERTISE_REQUIRED'
        | 'POLICY_VIOLATION'
        | 'MANUAL_ESCALATION';
      description?: string;
      targetLevel?: number;
      justification?: string;
    },
  ): Promise<HITLRequest> {
    const response = await apiClient.post(`/hitl/requests/${id}/escalate`, data);
    return response.data.data;
  }

  async castVote(
    id: string,
    data: {
      vote: 'approve' | 'reject' | 'abstain';
      reason?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<HITLVote> {
    const response = await apiClient.post(`/hitl/requests/${id}/vote`, data);
    return response.data.data;
  }

  async addComment(
    id: string,
    data: {
      content: string;
      attachments?: Array<{
        filename: string;
        url: string;
        size: number;
        mimeType: string;
      }>;
      parentCommentId?: string;
      isInternal?: boolean;
      metadata?: Record<string, any>;
    },
  ): Promise<HITLComment> {
    const response = await apiClient.post(`/hitl/requests/${id}/comments`, data);
    return response.data.data;
  }

  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    status?: string;
    priority?: string;
    sourceType?: 'agent' | 'tool' | 'workflow';
    assigneeId?: string;
    category?: string;
  }): Promise<HITLAnalytics> {
    const response = await apiClient.get('/hitl/analytics', { params });
    return response.data.data;
  }

  async getDashboard(): Promise<HITLDashboardData> {
    const response = await apiClient.get('/hitl/dashboard');
    return response.data.data;
  }
}

export const hitlApi = new HITLApi();
