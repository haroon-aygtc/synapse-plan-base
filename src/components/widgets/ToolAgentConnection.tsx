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
import { apiClient } from '@/lib/api';

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
      
      const response = await apiClient.get(`/tools/${toolId}/agent-connections`);
      
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
      
      const response = await apiClient.post(endpoint);
      
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
            <Bot className="h-5 w-5" />
            Agent Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-2">Failed to load connections</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <Button onClick={fetchConnections} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent Connections
        </CardTitle>
        <CardDescription>
          Manage agent connections for this tool
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connections.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium mb-2">No agent connections</p>
            <p className="text-gray-400 text-sm">Connect agents to use this tool in conversations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(connection.connectionStatus)}
                  <div>
                    <h4 className="font-medium text-gray-900">{connection.name}</h4>
                    {connection.description && (
                      <p className="text-sm text-gray-500">{connection.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1">
                      <Badge className={getStatusColor(connection.connectionStatus)}>
                        {connection.connectionStatus}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Used {connection.usageCount} times
                      </span>
                      {connection.lastUsed && (
                        <span className="text-xs text-gray-400">
                          Last used {new Date(connection.lastUsed).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={connection.connectionStatus === 'connected' ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => handleToggleConnection(connection.id, connection.connectionStatus)}
                    disabled={actionLoading === connection.id}
                  >
                    {actionLoading === connection.id ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : connection.connectionStatus === 'connected' ? (
                      <Unlink className="h-4 w-4 mr-2" />
                    ) : (
                      <Link className="h-4 w-4 mr-2" />
                    )}
                    {connection.connectionStatus === 'connected' ? 'Disconnect' : 'Connect'}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}