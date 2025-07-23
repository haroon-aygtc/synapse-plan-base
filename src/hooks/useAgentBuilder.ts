'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { toast } from '@/components/ui/use-toast';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools?: string[];
  knowledgeSources?: string[];
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  version: string;
  promptTemplateId?: string;
  testingConfig?: Record<string, any>;
  performanceMetrics?: {
    successRate: number;
    averageResponseTime: number;
    totalExecutions: number;
    errorRate: number;
    lastUpdated: Date;
  };
  isActive: boolean;
  organizationId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentTestResult {
  testId: string;
  passed: boolean;
  score?: number;
  metrics: {
    responseTime: number;
    tokenUsage: number;
    cost: number;
    accuracy?: number;
    relevance?: number;
    coherence?: number;
  };
  actualOutput: Record<string, any>;
  errorMessage?: string;
}

export interface AgentExecutionResult {
  id: string;
  output: string;
  status: string;
  tokensUsed?: number;
  cost?: number;
  executionTimeMs: number;
  toolCalls?: Array<{
    toolId: string;
    input: Record<string, any>;
    output: Record<string, any>;
    executionTime: number;
  }>;
  knowledgeSearches?: Array<{
    query: string;
    results: any[];
    sources: string[];
  }>;
  metadata?: Record<string, any>;
}

export function useAgentBuilder() {
  const { user } = useAuth();
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAgents = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/agents', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      } else {
        throw new Error('Failed to fetch agents');
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch agents',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createAgent = useCallback(async (agentData: Partial<Agent>): Promise<Agent> => {
    if (!user) throw new Error('User not authenticated');

    setIsSaving(true);
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (response.ok) {
        const newAgent = await response.json();
        setAgents(prev => [...prev, newAgent]);
        setCurrentAgent(newAgent);
        return newAgent;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const updateAgent = useCallback(async (agentData: Partial<Agent>): Promise<Agent> => {
    if (!user || !currentAgent) throw new Error('User not authenticated or no current agent');

    setIsSaving(true);
    try {
      const response = await fetch(`/api/agents/${currentAgent.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (response.ok) {
        const updatedAgent = await response.json();
        setCurrentAgent(updatedAgent);
        setAgents(prev => prev.map(agent => 
          agent.id === updatedAgent.id ? updatedAgent : agent
        ));
        return updatedAgent;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update agent');
      }
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [user, currentAgent]);

  const saveAgent = useCallback(async (agentData: Partial<Agent>): Promise<Agent> => {
    if (currentAgent?.id) {
      return updateAgent(agentData);
    } else {
      return createAgent(agentData);
    }
  }, [currentAgent, updateAgent, createAgent]);

  const deleteAgent = useCallback(async (agentId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
        if (currentAgent?.id === agentId) {
          setCurrentAgent(null);
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete agent');
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }, [user, currentAgent]);

  const executeAgent = useCallback(async (
    agentId: string,
    input: string,
    options?: {
      sessionId?: string;
      context?: Record<string, any>;
      metadata?: Record<string, any>;
      stream?: boolean;
    }
  ): Promise<AgentExecutionResult> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch(`/api/agents/${agentId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          ...options,
        }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute agent');
      }
    } catch (error) {
      console.error('Error executing agent:', error);
      throw error;
    }
  }, [user]);

  const testAgent = useCallback(async (
    agentId: string,
    testData: {
      testType: string;
      testName: string;
      testInput: Record<string, any>;
      expectedOutput?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): Promise<AgentTestResult> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch(`/api/agents/${agentId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to test agent');
      }
    } catch (error) {
      console.error('Error testing agent:', error);
      throw error;
    }
  }, [user]);

  const deployAgent = useCallback(async (agentId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch(`/api/agents/${agentId}/deploy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update agent status to active
        await fetchAgents();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to deploy agent');
      }
    } catch (error) {
      console.error('Error deploying agent:', error);
      throw error;
    }
  }, [user, fetchAgents]);

  const getAgentStatistics = useCallback(async (timeRange?: { from: Date; to: Date }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const params = new URLSearchParams();
      if (timeRange) {
        params.append('from', timeRange.from.toISOString());
        params.append('to', timeRange.to.toISOString());
      }

      const response = await fetch(`/api/agents/statistics?${params}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get statistics');
      }
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }, [user]);

  const loadAgent = useCallback(async (agentId: string): Promise<void> => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const agent = await response.json();
        setCurrentAgent(agent);
      } else {
        throw new Error('Failed to load agent');
      }
    } catch (error) {
      console.error('Error loading agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agent',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createNewAgent = useCallback(() => {
    setCurrentAgent({
      id: '',
      name: '',
      description: '',
      prompt: '',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      tools: [],
      knowledgeSources: [],
      settings: {},
      metadata: {},
      version: '1.0.0',
      isActive: false,
      organizationId: user?.organizationId || '',
      userId: user?.id || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAgents();
    }
  }, [user, fetchAgents]);

  return {
    currentAgent,
    agents,
    isLoading,
    isSaving,
    setCurrentAgent,
    createAgent,
    updateAgent,
    saveAgent,
    deleteAgent,
    executeAgent,
    testAgent,
    deployAgent,
    getAgentStatistics,
    loadAgent,
    createNewAgent,
    fetchAgents,
  };
}