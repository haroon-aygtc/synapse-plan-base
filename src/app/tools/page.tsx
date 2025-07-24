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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Settings,
  Trash2,
  Eye,
  Activity,
  DollarSign,
  Users,
  Workflow,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Zap,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  endpoint: string;
  method: string;
  costPerExecution?: number;
  executions?: {
    total: number;
    successful: number;
    failed: number;
  };
  performance?: {
    averageResponseTime: number;
    successRate: number;
    lastExecution: string;
  };
  connections?: {
    agents: number;
    workflows: number;
  };
}

export default function ToolsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  const [loadingCostAnalysis, setLoadingCostAnalysis] = useState(false);
  const [toolConnections, setToolConnections] = useState<any>(null);
  const [loadingConnections, setLoadingConnections] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tools', {
        params: {
          page: 1,
          limit: 50,
          search: searchQuery || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          isActive:
            statusFilter !== 'all' ? statusFilter === 'active' : undefined,
        },
      });

      if (response.data.success) {
        setTools(response.data.data.data || response.data.data || []);
      } else {
        setTools([]);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

  const loadToolAnalytics = async (toolId: string) => {
    setLoadingAnalytics(true);
    try {
      const response = await api.get(`/tools/${toolId}/analytics`, {
        params: {
          startDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          endDate: new Date().toISOString(),
        },
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadCostAnalysis = async (toolId: string) => {
    setLoadingCostAnalysis(true);
    try {
      const response = await api.get(`/tools/${toolId}/cost-analysis`, {
        params: {
          startDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          endDate: new Date().toISOString(),
        },
      });
      setCostAnalysis(response.data);
    } catch (error) {
      console.error('Failed to load cost analysis:', error);
    } finally {
      setLoadingCostAnalysis(false);
    }
  };

  const loadToolConnections = async (toolId: string) => {
    setLoadingConnections(true);
    try {
      const response = await api.get(`/tools/${toolId}/connections`);
      setToolConnections(response.data);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const deleteTool = async (toolId: string) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;

    try {
      await api.delete(`/tools/${toolId}`);
      setTools(tools.filter((tool) => tool.id !== toolId));
    } catch (error) {
      console.error('Failed to delete tool:', error);
    }
  };

  const toggleToolStatus = async (toolId: string, isActive: boolean) => {
    try {
      await api.put(`/tools/${toolId}`, { isActive: !isActive });
      setTools(
        tools.map((tool) =>
          tool.id === toolId ? { ...tool, isActive: !isActive } : tool,
        ),
      );
    } catch (error) {
      console.error('Failed to update tool status:', error);
    }
  };

  const openToolDetails = (tool: Tool) => {
    setSelectedTool(tool);
    setShowDetailsDialog(true);
    loadToolAnalytics(tool.id);
    loadCostAnalysis(tool.id);
    loadToolConnections(tool.id);
  };

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      !searchQuery ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesCategory =
      categoryFilter === 'all' || tool.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && tool.isActive) ||
      (statusFilter === 'inactive' && !tool.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'communication':
        return '💬';
      case 'crm':
        return '👥';
      case 'analytics':
        return '📊';
      case 'automation':
        return '🤖';
      case 'integration':
        return '🔗';
      case 'productivity':
        return '⚡';
      default:
        return '🛠️';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600' : 'text-gray-400';
  };

  return (
    <div className="container mx-auto py-8 bg-background">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tools</h1>
          <p className="text-muted-foreground">
            Manage your API tools and integrations
          </p>
        </div>
        <Button onClick={() => router.push('/tools/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Tool
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="crm">CRM & Sales</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="automation">Automation</SelectItem>
                <SelectItem value="integration">Integration</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadTools}>
              <Filter className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tools Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <Card key={tool.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {getCategoryIcon(tool.category)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <CardDescription className="text-sm line-clamp-2">
                        {tool.description}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openToolDetails(tool)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/tools/${tool.id}/edit`)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleToolStatus(tool.id, tool.isActive)}
                      >
                        {tool.isActive ? (
                          <>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteTool(tool.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={tool.isActive ? 'default' : 'secondary'}
                      className={cn(
                        'text-xs',
                        tool.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {tool.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {tool.category}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {tool.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {tool.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{tool.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {tool.executions?.total || 0} runs
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {tool.connections?.agents || 0} agents
                    </div>
                    <div className="flex items-center gap-1">
                      <Workflow className="h-3 w-3" />
                      {tool.connections?.workflows || 0} workflows
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />$
                      {(tool.costPerExecution || 0).toFixed(3)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Play className="mr-1 h-3 w-3" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openToolDetails(tool)}
                    >
                      <BarChart3 className="mr-1 h-3 w-3" />
                      Analytics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTools.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Zap className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Tools Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or filters.'
              : 'Create your first tool to get started.'}
          </p>
          <Button onClick={() => router.push('/tools/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Tool
          </Button>
        </div>
      )}

      {/* Tool Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">
                {selectedTool && getCategoryIcon(selectedTool.category)}
              </span>
              {selectedTool?.name}
            </DialogTitle>
            <DialogDescription>{selectedTool?.description}</DialogDescription>
          </DialogHeader>

          {selectedTool && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="costs">Costs</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <strong>Endpoint:</strong> {selectedTool.endpoint}
                      </div>
                      <div>
                        <strong>Method:</strong> {selectedTool.method}
                      </div>
                      <div>
                        <strong>Category:</strong> {selectedTool.category}
                      </div>
                      <div>
                        <strong>Status:</strong>
                        <Badge
                          className={cn(
                            'ml-2 text-xs',
                            selectedTool.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600',
                          )}
                        >
                          {selectedTool.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Usage Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <strong>Total Executions:</strong>{' '}
                        {selectedTool.executions?.total || 0}
                      </div>
                      <div>
                        <strong>Success Rate:</strong>{' '}
                        {selectedTool.performance?.successRate || 0}%
                      </div>
                      <div>
                        <strong>Avg Response Time:</strong>{' '}
                        {selectedTool.performance?.averageResponseTime || 0}ms
                      </div>
                      <div>
                        <strong>Cost per Execution:</strong> $
                        {(selectedTool.costPerExecution || 0).toFixed(4)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedTool.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                {loadingAnalytics ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner className="h-6 w-6" />
                  </div>
                ) : analytics ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">
                            Performance Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div>
                            <strong>Total Executions:</strong>{' '}
                            {analytics.totalExecutions}
                          </div>
                          <div>
                            <strong>Success Rate:</strong>{' '}
                            {analytics.successRate.toFixed(1)}%
                          </div>
                          <div>
                            <strong>Error Rate:</strong>{' '}
                            {analytics.errorRate.toFixed(1)}%
                          </div>
                          <div>
                            <strong>Avg Execution Time:</strong>{' '}
                            {analytics.averageExecutionTime.toFixed(0)}ms
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">
                            Cost Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div>
                            <strong>Total Cost:</strong> $
                            {analytics.totalCost.toFixed(4)}
                          </div>
                          <div>
                            <strong>Popular Functions:</strong>
                          </div>
                          {analytics.popularFunctions?.map((func: any) => (
                            <div key={func.functionName} className="ml-4">
                              • {func.functionName}: {func.callCount} calls (
                              {func.successRate.toFixed(1)}% success)
                            </div>
                          )) || (
                            <div className="ml-4 text-muted-foreground">
                              No function data available
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Real-time Performance Chart */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Performance Trends (Last 30 Days)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          {analytics.trends && analytics.trends.length > 0 ? (
                            <div className="w-full">
                              <div className="grid grid-cols-7 gap-1 text-xs">
                                {analytics.trends
                                  .slice(-7)
                                  .map((trend: any, index: number) => (
                                    <div key={index} className="text-center">
                                      <div className="font-medium">
                                        {new Date(
                                          trend.date,
                                        ).toLocaleDateString('en-US', {
                                          weekday: 'short',
                                        })}
                                      </div>
                                      <div className="mt-1 p-2 bg-muted rounded">
                                        <div className="text-green-600">
                                          {trend.executions} runs
                                        </div>
                                        <div className="text-blue-600">
                                          {trend.successRate.toFixed(0)}%
                                          success
                                        </div>
                                        <div className="text-orange-600">
                                          {trend.averageExecutionTime.toFixed(
                                            0,
                                          )}
                                          ms
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ) : (
                            'No trend data available'
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Error Analysis */}
                    {analytics.errorAnalysis &&
                      analytics.errorAnalysis.length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              Top Error Patterns
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {analytics.errorAnalysis
                                .slice(0, 5)
                                .map((error: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-red-50 rounded"
                                  >
                                    <div className="text-sm">
                                      <div className="font-medium text-red-800">
                                        {error.error}
                                      </div>
                                    </div>
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      {error.count} occurrences
                                    </Badge>
                                  </div>
                                ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No analytics data available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="connections" className="space-y-4">
                {loadingConnections ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner className="h-6 w-6" />
                  </div>
                ) : toolConnections ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Connected Agents (
                          {toolConnections.agents?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {toolConnections.agents?.length > 0 ? (
                          <div className="space-y-2">
                            {toolConnections.agents.map((agent: any) => (
                              <div
                                key={agent.id}
                                className="flex items-center justify-between p-2 bg-muted rounded"
                              >
                                <div>
                                  <div className="font-medium">
                                    {agent.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {agent.description}
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {agent.usage?.executionCount || 0} executions
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No agents connected
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Workflow className="h-4 w-4" />
                          Connected Workflows (
                          {toolConnections.workflows?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {toolConnections.workflows?.length > 0 ? (
                          <div className="space-y-2">
                            {toolConnections.workflows.map((workflow: any) => (
                              <div
                                key={workflow.id}
                                className="flex items-center justify-between p-2 bg-muted rounded"
                              >
                                <div>
                                  <div className="font-medium">
                                    {workflow.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {workflow.description}
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {workflow.usage?.executionCount || 0}{' '}
                                  executions
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No workflows connected
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No connection data available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="costs" className="space-y-4">
                {loadingCostAnalysis ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner className="h-6 w-6" />
                  </div>
                ) : costAnalysis ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">
                            Cost Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div>
                            <strong>Total Cost:</strong> $
                            {costAnalysis.summary.totalCost.toFixed(4)}
                          </div>
                          <div>
                            <strong>Average Cost:</strong> $
                            {costAnalysis.summary.averageCost.toFixed(4)}
                          </div>
                          <div>
                            <strong>Projected Monthly:</strong> $
                            {costAnalysis.summary.projectedMonthlyCost.toFixed(
                              2,
                            )}
                          </div>
                          <div>
                            <strong>Total Executions:</strong>{' '}
                            {costAnalysis.summary.totalExecutions}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div>
                            <strong>Successful:</strong>{' '}
                            {costAnalysis.breakdown.successfulExecutions}
                          </div>
                          <div>
                            <strong>Failed:</strong>{' '}
                            {costAnalysis.breakdown.failedExecutions}
                          </div>
                          <div>
                            <strong>Avg Time:</strong>{' '}
                            {costAnalysis.breakdown.averageExecutionTime.toFixed(
                              0,
                            )}
                            ms
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {costAnalysis.recommendations?.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Optimization Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {costAnalysis.recommendations.map(
                              (rec: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-3 bg-muted rounded"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium">
                                      {rec.title}
                                    </div>
                                    <Badge
                                      variant={
                                        rec.priority === 'high'
                                          ? 'destructive'
                                          : rec.priority === 'medium'
                                            ? 'default'
                                            : 'secondary'
                                      }
                                    >
                                      {rec.priority}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground mb-2">
                                    {rec.description}
                                  </div>
                                  <div className="text-sm">
                                    {rec.suggestion}
                                  </div>
                                  {rec.potentialSavings > 0 && (
                                    <div className="text-sm text-green-600 mt-1">
                                      Potential savings: $
                                      {rec.potentialSavings.toFixed(4)}
                                    </div>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No cost analysis data available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Agent Connections Dialog */}
      <Dialog open={showAgentConnectionsDialog} onOpenChange={setShowAgentConnectionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agent Connections - {selectedTool?.name}
            </DialogTitle>
            <DialogDescription>
              View which agents use this tool and their usage patterns
            </DialogDescription>
          </DialogHeader>

          {loadingAgentConnections ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner className="h-6 w-6" />
            </div>
          ) : agentConnections ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total Agents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{agentConnections.summary?.totalAgents || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {agentConnections.summary?.activeAgents || 0} active
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total Executions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{agentConnections.summary?.totalExecutions || 0}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${(agentConnections.summary?.totalCost || 0).toFixed(4)}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Connected Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {agentConnections.agents?.map((agent: any) => (
                        <div key={agent.id} className="flex items-center justify-between p-3 bg-muted rounded">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              agent.isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <div>
                              <div className="font-medium">{agent.name}</div>
                              <div className="text-sm text-muted-foreground">{agent.description}</div>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div>{agent.usage?.totalExecutions || 0} executions</div>
                            <div className="text-green-600">{(agent.usage?.successRate || 0).toFixed(1)}% success</div>
                            <div className="text-muted-foreground">{(agent.usage?.avgExecutionTime || 0).toFixed(0)}ms avg</div>
                            <div className="text-muted-foreground">${(agent.usage?.totalCost || 0).toFixed(4)} cost</div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-4 text-muted-foreground">
                          No agents connected to this tool
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No agent connection data available
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Workflow Connections Dialog */}
      <Dialog open={showWorkflowConnectionsDialog} onOpenChange={setShowWorkflowConnectionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Workflow Connections - {selectedTool?.name}
            </DialogTitle>
            <DialogDescription>
              View which workflows use this tool and their execution context
            </DialogDescription>
          </DialogHeader>

          {loadingWorkflowConnections ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner className="h-6 w-6" />
            </div>
          ) : workflowConnections ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total Workflows</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{workflowConnections.summary?.totalWorkflows || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {workflowConnections.summary?.activeWorkflows || 0} active
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total Executions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{workflowConnections.summary?.totalExecutions || 0}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Total Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${(workflowConnections.summary?.totalCost || 0).toFixed(4)}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Connected Workflows</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="space-y-3">
                      {workflowConnections.workflows?.map((workflow: any) => (
                        <div key={workflow.id} className="p-3 bg-muted rounded">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                workflow.isActive ? 'bg-green-500' : 'bg-gray-400'
                              }`} />
                              <div>
                                <div className="font-medium">{workflow.name}</div>
                                <div className="text-sm text-muted-foreground">{workflow.description}</div>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div>{workflow.usage?.totalExecutions || 0} executions</div>
                              <div className="text-green-600">{(workflow.usage?.successRate || 0).toFixed(1)}% success</div>
                              <div className="text-muted-foreground">${(workflow.usage?.totalCost || 0).toFixed(4)} cost</div>
                            </div>
                          </div>
                          
                          {workflow.toolSteps && workflow.toolSteps.length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Tool Usage Steps:</div>
                              <div className="space-y-1">
                                {workflow.toolSteps.map((step: any, index: number) => (
                                  <div key={index} className="text-xs bg-background p-2 rounded">
                                    <div className="font-medium">{step.stepName}</div>
                                    <div className="text-muted-foreground">Step {step.stepIndex + 1} - {step.stepType}</div>
                                    {step.conditions && step.conditions.length > 0 && (
                                      <div className="text-muted-foreground">Conditions: {step.conditions.length}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )) || (
                        <div className="text-center py-4 text-muted-foreground">
                          No workflows connected to this tool
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No workflow connection data available
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test in Context Dialog */}
      <Dialog open={testInContextDialog} onOpenChange={setTestInContextDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Test Tool in Context - {selectedTool?.name}
            </DialogTitle>
            <DialogDescription>
              Test this tool within a specific workflow or agent execution context
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Context Type</label>
                <select 
                  className="w-full mt-1 p-2 border rounded"
                  value={contextTestData?.contextType || 'workflow'}
                  onChange={(e) => setContextTestData(prev => ({ ...prev, contextType: e.target.value }))}
                >
                  <option value="workflow">Workflow Context</option>
                  <option value="agent">Agent Context</option>
                  <option value="user">User Context</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Context ID</label>
                <input 
                  type="text"
                  className="w-full mt-1 p-2 border rounded"
                  placeholder="Enter workflow/agent ID"
                  value={contextTestData?.contextId || ''}
                  onChange={(e) => setContextTestData(prev => ({ ...prev, contextId: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Test Parameters (JSON)</label>
              <textarea 
                className="w-full mt-1 p-2 border rounded h-32"
                placeholder='{"key": "value"}'
                value={JSON.stringify(contextTestData?.parameters || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const params = JSON.parse(e.target.value);
                    setContextTestData(prev => ({ ...prev, parameters: params }));
                  } catch (error) {
                    // Invalid JSON, keep the text for user to fix
                  }
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Context Data (JSON)</label>
              <textarea 
                className="w-full mt-1 p-2 border rounded h-32"
                placeholder='{"stepId": "step1", "previousResults": {}}'
                value={JSON.stringify(contextTestData?.context || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const context = JSON.parse(e.target.value);
                    setContextTestData(prev => ({ ...prev, context }));
                  } catch (error) {
                    // Invalid JSON, keep the text for user to fix
                  }
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={async () => {
                  if (!selectedTool || !contextTestData) return;
                  
                  try {
                    const testPayload = {
                      workflowId: contextTestData.contextType === 'workflow' ? contextTestData.contextId : undefined,
                      agentId: contextTestData.contextType === 'agent' ? contextTestData.contextId : undefined,
                      context: contextTestData.context || {},
                      parameters: contextTestData.parameters || {}
                    };
                    
                    await testToolInContext(selectedTool.id, testPayload);
                  } catch (error) {
                    console.error('Context test failed:', error);
                  }
                }}
                disabled={loadingContextTest}
              >
                {loadingContextTest ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Test
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setTestInContextDialog(false)}>
                Cancel
              </Button>
            </div>

            {contextTestResult && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {contextTestResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    Test Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Status:</strong> {contextTestResult.success ? 'Success' : 'Failed'}
                    </div>
                    <div>
                      <strong>Execution Time:</strong> {contextTestResult.executionTime}ms
                    </div>
                    <div>
                      <strong>Cost:</strong> ${(contextTestResult.cost || 0).toFixed(4)}
                    </div>
                    
                    {contextTestResult.error && (
                      <div>
                        <strong>Error:</strong> 
                        <div className="mt-1 p-2 bg-red-50 text-red-800 rounded text-xs">
                          {contextTestResult.error}
                        </div>
                      </div>
                    )}
                    
                    {contextTestResult.result && (
                      <div>
                        <strong>Result:</strong>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(contextTestResult.result, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {contextTestResult.recommendations && contextTestResult.recommendations.length > 0 && (
                      <div>
                        <strong>Recommendations:</strong>
                        <div className="mt-1 space-y-1">
                          {contextTestResult.recommendations.map((rec: any, index: number) => (
                            <div key={index} className="p-2 bg-blue-50 text-blue-800 rounded text-xs">
                              <div className="font-medium">{rec.title}</div>
                              <div>{rec.suggestion}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

