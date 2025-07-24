'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  GitBranch,
  Plus,
  ExternalLink,
  Play,
  Settings,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  version: string;
  lastExecuted?: Date;
  executionCount: number;
}

interface ToolWorkflowConnectionProps {
  toolId: string;
}

export function ToolWorkflowConnection({
  toolId,
}: ToolWorkflowConnectionProps) {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [connectedWorkflows, setConnectedWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflows();
    loadConnectedWorkflows();
  }, [toolId]);

  const loadWorkflows = async () => {
    try {
      const response = await api.get('/workflows');
      if (response.data.success) {
        setWorkflows(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadConnectedWorkflows = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tools/${toolId}/workflows`);
      if (response.data.success) {
        setConnectedWorkflows(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load connected workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWorkflow = async (workflowId: string) => {
    try {
      setConnecting(workflowId);
      const response = await api.post(
        `/tools/${toolId}/workflows/${workflowId}`,
      );
      if (response.data.success) {
        toast({
          title: 'Workflow Connected',
          description: 'Tool has been connected to the workflow successfully',
        });
        loadConnectedWorkflows();
      }
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description:
          error.response?.data?.message || 'Failed to connect workflow',
        variant: 'destructive',
      });
    } finally {
      setConnecting(null);
    }
  };

  const disconnectWorkflow = async (workflowId: string) => {
    try {
      const response = await api.delete(
        `/tools/${toolId}/workflows/${workflowId}`,
      );
      if (response.data.success) {
        toast({
          title: 'Workflow Disconnected',
          description: 'Tool has been disconnected from the workflow',
        });
        loadConnectedWorkflows();
      }
    } catch (error: any) {
      toast({
        title: 'Disconnection Failed',
        description:
          error.response?.data?.message || 'Failed to disconnect workflow',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Workflow Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Workflow Connections
        </CardTitle>
        <CardDescription>
          Manage workflow connections for this tool
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connected Workflows */}
        {connectedWorkflows.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">
              Connected Workflows ({connectedWorkflows.length})
            </h4>
            {connectedWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{workflow.name}</span>
                    <Badge variant={getStatusColor(workflow.status)}>
                      {workflow.status}
                    </Badge>
                  </div>
                  {workflow.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {workflow.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>v{workflow.version}</span>
                    <span>{workflow.executionCount} executions</span>
                    {workflow.lastExecuted && (
                      <span>
                        Last run:{' '}
                        {new Date(workflow.lastExecuted).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectWorkflow(workflow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {connectedWorkflows.length > 0 && workflows.length > 0 && <Separator />}

        {/* Available Workflows */}
        {workflows.filter(
          (workflow) =>
            !connectedWorkflows.some(
              (connected) => connected.id === workflow.id,
            ),
        ).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">
              Available Workflows
            </h4>
            {workflows
              .filter(
                (workflow) =>
                  !connectedWorkflows.some(
                    (connected) => connected.id === workflow.id,
                  ),
              )
              .map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{workflow.name}</span>
                      <Badge variant={getStatusColor(workflow.status)}>
                        {workflow.status}
                      </Badge>
                    </div>
                    {workflow.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {workflow.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>v{workflow.version}</span>
                      <span>{workflow.executionCount} executions</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => connectWorkflow(workflow.id)}
                    disabled={connecting === workflow.id}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {connecting === workflow.id ? 'Connecting...' : 'Connect'}
                  </Button>
                </div>
              ))}
          </div>
        )}

        {workflows.length === 0 && (
          <div className="text-center py-6">
            <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-2">No workflows available</p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
