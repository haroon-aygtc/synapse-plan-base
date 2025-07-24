'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Bot,
  Link,
  Unlink,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';

interface AgentConnection {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastUsed?: Date;
  usageCount: number;
}

interface ToolAgentConnectionProps {
  toolId: string;
  className?: string;
}

export function ToolAgentConnection({
  toolId,
  className = '',
}: ToolAgentConnectionProps) {
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, [toolId]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/tools/${toolId}/agent-connections`);
      
      if (response.data.success) {
        setConnections(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch connections');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load agent connections');
      console.error('Error fetching agent connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConnection = async (agentId: string, currentStatus: string) => {
    try {
      setActionLoading(agentId);
      
      const endpoint = currentStatus === 'connected' 
        ? `/tools/${toolId}/disconnect-agent/${agentId}`
        : `/tools/${toolId}/connect-agent/${agentId}`;
      
      const response = await api.post(endpoint);
      
      if (response.data.success) {
        await fetchConnections(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to update connection');
      }
    } catch (err: any) {
      console.error('Error updating connection:', err);
      setError(err.message || 'Failed to update connection');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Unlink className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5