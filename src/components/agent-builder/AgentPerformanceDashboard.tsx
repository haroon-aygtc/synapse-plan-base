"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Users,
  Target,
  Activity,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Loader2,
} from "lucide-react";

interface AgentMetrics {
  id: string;
  name: string;
  totalExecutions: number;
  successRate: number;
  averageResponseTime: number;
  totalCost: number;
  errorRate: number;
  userSatisfaction: number;
  conversationQuality: number;
  lastUpdated: Date;
  performanceTrend: Array<{
    date: string;
    executions: number;
    successRate: number;
    responseTime: number;
    cost: number;
  }>;
  errorBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  usageByHour: Array<{
    hour: number;
    executions: number;
  }>;
  topFailureReasons: Array<{
    reason: string;
    count: number;
    impact: string;
  }>;
}

interface AgentPerformanceDashboardProps {
  agentId: string;
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AgentPerformanceDashboard({
  agentId,
  className,
}: AgentPerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");

  // Mock data - in production, this would come from the backend
  const mockMetrics: AgentMetrics = {
    id: agentId,
    name: "Customer Support Agent",
    totalExecutions: 1247,
    successRate: 94.2,
    averageResponseTime: 1.8,
    totalCost: 23.45,
    errorRate: 5.8,
    userSatisfaction: 4.6,
    conversationQuality: 87.3,
    lastUpdated: new Date(),
    performanceTrend: [
      { date: "2024-01-01", executions: 45, successRate: 92, responseTime: 2.1, cost: 1.2 },
      { date: "2024-01-02", executions: 52, successRate: 94, responseTime: 1.9, cost: 1.4 },
      { date: "2024-01-03", executions: 38, successRate: 96, responseTime: 1.7, cost: 1.1 },
      { date: "2024-01-04", executions: 61, successRate: 93, responseTime: 2.0, cost: 1.6 },
      { date: "2024-01-05", executions: 47, successRate: 95, responseTime: 1.8, cost: 1.3 },
      { date: "2024-01-06", executions: 55, successRate: 94, responseTime: 1.9, cost: 1.5 },
      { date: "2024-01-07", executions: 49, successRate: 94, responseTime: 1.8, cost: 1.3 },
    ],
    errorBreakdown: [
      { type: "Timeout", count: 23, percentage: 39.7 },
      { type: "API Error", count: 18, percentage: 31.0 },
      { type: "Validation", count: 12, percentage: 20.7 },
      { type: "Rate Limit", count: 5, percentage: 8.6 },
    ],
    usageByHour: [
      { hour: 0, executions: 12 },
      { hour: 1, executions: 8 },
      { hour: 2, executions: 5 },
      { hour: 3, executions: 3 },
      { hour: 4, executions: 7 },
      { hour: 5, executions: 15 },
      { hour: 6, executions: 28 },
      { hour: 7, executions: 42 },
      { hour: 8, executions: 65 },
      { hour: 9, executions: 78 },
      { hour: 10, executions: 85 },
      { hour: 11, executions: 92 },
      { hour: 12, executions: 88 },
      { hour: 13, executions: 95 },
      { hour: 14, executions: 102 },
      { hour: 15, executions: 98 },
      { hour: 16, executions: 87 },
      { hour: 17, executions: 76 },
      { hour: 18, executions: 54 },
      { hour: 19, executions: 43 },
      { hour: 20, executions: 32 },
      { hour: 21, executions: 25 },
      { hour: 22, executions: 18 },
      { hour: 23, executions: 14 },
    ],
    topFailureReasons: [
      { reason: "Knowledge base timeout", count: 15, impact: "high" },
      { reason: "Invalid user input format", count: 12, impact: "medium" },
      { reason: "External API unavailable", count: 8, impact: "high" },
      { reason: "Rate limit exceeded", count: 5, impact: "low" },
    ],
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        // In production, this would be an API call
        // const response = await fetch(`/api/agents/${agentId}/metrics?timeRange=${timeRange}`);
        // const data = await response.json();
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setMetrics(mockMetrics);
      } catch (error) {
        console.error('Failed to fetch agent metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [agentId, timeRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const exportData = () => {
    if (!metrics) return;
    
    const dataToExport = {
      agentId: metrics.id,
      agentName: metrics.name,
      exportDate: new Date().toISOString(),
      timeRange,
      metrics: {
        totalExecutions: metrics.totalExecutions,
        successRate: metrics.successRate,
        averageResponseTime: metrics.averageResponseTime,
        totalCost: metrics.totalCost,
        errorRate: metrics.errorRate,
        userSatisfaction: metrics.userSatisfaction,
        conversationQuality: metrics.conversationQuality,
      },
      performanceTrend: metrics.performanceTrend,
      errorBreakdown: metrics.errorBreakdown,
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-${agentId}-metrics-${timeRange}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center gap-2">
            <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
            <span>Loading performance metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load metrics</p>
            <Button onClick={handleRefresh} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (value: number, type: 'success' | 'error' | 'satisfaction') => {
    if (type === 'success') {
      return value >= 95 ? 'text-green-600' : value >= 85 ? 'text-yellow-600' : 'text-red-600';
    }
    if (type === 'error') {
      return value <= 5 ? 'text-green-600' : value <= 10 ? 'text-yellow-600' : 'text-red-600';
    }
    if (type === 'satisfaction') {
      return value >= 4.5 ? 'text-green-600' : value >= 3.5 ? 'text-yellow-600' : 'text-red-600';
    }
    return 'text-gray-600';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{metrics.name} Performance</h2>
          <p className="text-muted-foreground">
            Last updated: {metrics.lastUpdated.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Executions</p>
                <p className="text-2xl font-bold">{metrics.totalExecutions.toLocaleString()}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center mt-2">
              {getTrendIcon(metrics.totalExecutions, 1100)}
              <span className="text-sm text-muted-foreground ml-1">+13% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className={`text-2xl font-bold ${getStatusColor(metrics.successRate, 'success')}`}>
                  {metrics.successRate}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <Progress value={metrics.successRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{metrics.averageResponseTime}s</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <div className="flex items-center mt-2">
              {getTrendIcon(1.8, 2.1)}
              <span className="text-sm text-muted-foreground ml-1">-14% faster</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${metrics.totalCost}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex items-center mt-2">
              <span className="text-sm text-muted-foreground">$0.019 per execution</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
                <CardDescription>Success rate and response time over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="successRate"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Success Rate (%)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Response Time (s)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
                <CardDescription>User satisfaction and conversation quality</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">User Satisfaction</span>
                    <span className={`font-bold ${getStatusColor(metrics.userSatisfaction, 'satisfaction')}`}>
                      {metrics.userSatisfaction}/5.0
                    </span>
                  </div>
                  <Progress value={(metrics.userSatisfaction / 5) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Conversation Quality</span>
                    <span className="font-bold">{metrics.conversationQuality}%</span>
                  </div>
                  <Progress value={metrics.conversationQuality} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Error Rate</span>
                    <span className={`font-bold ${getStatusColor(metrics.errorRate, 'error')}`}>
                      {metrics.errorRate}%
                    </span>
                  </div>
                  <Progress value={metrics.errorRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution Volume</CardTitle>
                <CardDescription>Daily execution count and cost</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="executions"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                      name="Executions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>Daily cost breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cost" fill="#82ca9d" name="Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Breakdown</CardTitle>
                <CardDescription>Distribution of error types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.errorBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.errorBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Failure Reasons</CardTitle>
                <CardDescription>Most common causes of failures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topFailureReasons.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{reason.reason}</p>
                        <p className="text-xs text-muted-foreground">{reason.count} occurrences</p>
                      </div>
                      <Badge
                        variant={reason.impact === 'high' ? 'destructive' : reason.impact === 'medium' ? 'default' : 'secondary'}
                      >
                        {reason.impact} impact
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Hour</CardTitle>
              <CardDescription>Execution patterns throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.usageByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="executions" fill="#8884d8" name="Executions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
