import { useState, useEffect, useCallback } from 'react';
import {
  hitlApi,
  HITLRequest,
  HITLRequestsResponse,
  HITLAnalytics,
  HITLDashboardData,
  CreateHITLRequestData,
} from '@/lib/hitl-api';
import { useWebSocketSubscription } from './useWebSocketSubscription';
import { useToast } from '@/components/ui/use-toast';

export function useHITLRequests(params?: {
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
}) {
  const [data, setData] = useState<HITLRequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await hitlApi.getRequests(params);
      setData(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch HITL requests';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [params, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Subscribe to real-time updates
  useWebSocketSubscription('hitl_request_created', (data) => {
    fetchRequests(); // Refresh the list when new requests are created
  });

  useWebSocketSubscription('hitl_request_updated', (data) => {
    fetchRequests(); // Refresh the list when requests are updated
  });

  return {
    data,
    loading,
    error,
    refetch: fetchRequests,
  };
}

export function useHITLRequest(id: string) {
  const [request, setRequest] = useState<HITLRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequest = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await hitlApi.getRequestById(id);
      setRequest(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch HITL request';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const resolveRequest = useCallback(
    async (data: {
      approved: boolean;
      reason?: string;
      comments?: string;
      attachments?: string[];
      metadata?: Record<string, any>;
    }) => {
      try {
        const updatedRequest = await hitlApi.resolveRequest(id, data);
        setRequest(updatedRequest);
        toast({
          title: 'Success',
          description: `Request ${data.approved ? 'approved' : 'rejected'} successfully`,
        });
        return updatedRequest;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to resolve request';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [id, toast],
  );

  const assignRequest = useCallback(
    async (data: {
      assigneeId?: string;
      assigneeRoles?: string[];
      assigneeUsers?: string[];
      reason?: string;
    }) => {
      try {
        const updatedRequest = await hitlApi.assignRequest(id, data);
        setRequest(updatedRequest);
        toast({
          title: 'Success',
          description: 'Request assigned successfully',
        });
        return updatedRequest;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to assign request';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [id, toast],
  );

  const delegateRequest = useCallback(
    async (data: {
      delegatedToId: string;
      reason?: string;
      instructions?: string;
    }) => {
      try {
        const updatedRequest = await hitlApi.delegateRequest(id, data);
        setRequest(updatedRequest);
        toast({
          title: 'Success',
          description: 'Request delegated successfully',
        });
        return updatedRequest;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delegate request';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [id, toast],
  );

  const escalateRequest = useCallback(
    async (data: {
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
    }) => {
      try {
        const updatedRequest = await hitlApi.escalateRequest(id, data);
        setRequest(updatedRequest);
        toast({
          title: 'Success',
          description: 'Request escalated successfully',
        });
        return updatedRequest;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to escalate request';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [id, toast],
  );

  const castVote = useCallback(
    async (data: {
      vote: 'approve' | 'reject' | 'abstain';
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      try {
        await hitlApi.castVote(id, data);
        await fetchRequest(); // Refresh to get updated voting data
        toast({
          title: 'Success',
          description: 'Vote cast successfully',
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to cast vote';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [id, fetchRequest, toast],
  );

  const addComment = useCallback(
    async (data: {
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
    }) => {
      try {
        await hitlApi.addComment(id, data);
        await fetchRequest(); // Refresh to get updated comments
        toast({
          title: 'Success',
          description: 'Comment added successfully',
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add comment';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [id, fetchRequest, toast],
  );

  return {
    request,
    loading,
    error,
    refetch: fetchRequest,
    resolveRequest,
    assignRequest,
    delegateRequest,
    escalateRequest,
    castVote,
    addComment,
  };
}

export function useHITLAnalytics(params?: {
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
  priority?: string;
  sourceType?: 'agent' | 'tool' | 'workflow';
  assigneeId?: string;
  category?: string;
}) {
  const [analytics, setAnalytics] = useState<HITLAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await hitlApi.getAnalytics(params);
      setAnalytics(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [params, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}

export function useHITLDashboard() {
  const [dashboard, setDashboard] = useState<HITLDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await hitlApi.getDashboard();
      setDashboard(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch dashboard';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Subscribe to real-time updates
  useWebSocketSubscription('hitl_request_created', () => {
    fetchDashboard();
  });

  useWebSocketSubscription('hitl_request_updated', () => {
    fetchDashboard();
  });

  return {
    dashboard,
    loading,
    error,
    refetch: fetchDashboard,
  };
}

export function useCreateHITLRequest() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createRequest = useCallback(
    async (data: CreateHITLRequestData) => {
      try {
        setLoading(true);
        const request = await hitlApi.createRequest(data);
        toast({
          title: 'Success',
          description: 'HITL request created successfully',
        });
        return request;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create request';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  return {
    createRequest,
    loading,
  };
}
