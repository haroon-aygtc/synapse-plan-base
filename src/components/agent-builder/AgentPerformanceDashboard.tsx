'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgentBuilder } from '@/hooks/useAgentBuilder';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/components/ui/use-toast';
import {
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Clock,
  Zap,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface PerformanceMetrics {
  successRate: number;
  averageResponseTime: number;
  totalExecutions: number;
  errorRate: number;
  costPerExecution: number;
  tokenUsage: number;
  lastUpdated: string;
}

interface TimeSeriesData {
  date: string;
  successRate: number;
  responseTime: number;
  cost: number;
  executions: number;
}

interface OptimizationSuggestion {
  type: 'performance' | 'cost' | 'quality' | 'security';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  recommendation: string;
}

export function AgentPerformanceDashboard() {
  const { currentAgent, isLoading } = useAgentBuilder();
  const { analyzeAgent, isAnalyzing } = useAIAssistant();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // Fetch performance metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!currentAgent) return;

      setIsLoadingMetrics(true);
      try {
        const response = await fetch(`/api/agents/${currentAgent.id}/metrics?timeRange=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
          setTimeSeriesData(data.timeSeriesData);
        } else {
          throw new Error('Failed to fetch metrics');
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load performance metrics',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    fetchMetrics();
  }, [currentAgent, timeRange]);

  const generateOptimizationSuggestions = useCallback(async () => {
    if (!currentAgent) return;

    setIsGeneratingSuggestions(true);
    try {
      const analysis = await analyzeAgent({
        name: currentAgent.name,
        description: currentAgent.description || '',
        prompt: currentAgent.prompt,
        model: currentAgent.model,
        temperature: currentAgent.temperature,
        tools: currentAgent.tools,
        knowledgeSources: currentAgent.knowledgeSources,
        performanceMetrics: currentAgent.performanceMetrics
      });

      // Map the suggestions to match the OptimizationSuggestion type
      const typedSuggestions: OptimizationSuggestion[] = (analysis.suggestions || []).map(suggestion => {
        // If suggestion is already the correct type, use it directly
        if (typeof suggestion === 'object' && suggestion !== null && 'type' in suggestion) {
          return suggestion as OptimizationSuggestion;
        }
        // Otherwise, create a properly typed suggestion object
        return {
          type: 'performance' as const,
          title: 'Optimization Suggestion',
          description: typeof suggestion === 'string' ? suggestion : 'Suggestion details not available',
          impact: 'medium' as const,
          effort: 'medium' as const,
          recommendation: typeof suggestion === 'string' ? suggestion : 'No specific recommendation'
        } satisfies OptimizationSuggestion;
      });

      setSuggestions(typedSuggestions);

      toast({
        title: 'Analysis Complete',
        description: 'Optimization suggestions have been generated',
      });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to generate optimization suggestions',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [currentAgent, analyzeAgent]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-amber-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-amber-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentAgent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Agent Selected</h3>
        <p className="text-muted-foreground max-w-md">
          Please select or create an agent to view performance metrics and analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Analytics and optimization for {currentAgent.name}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
            <Button
              variant={timeRange === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('day')}
              className="text-xs h-7"
            >
              Day
            </Button>
            <Button
              variant={timeRange === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('week')}
              className="text-xs h-7"
            >
              Week
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('month')}
              className="text-xs h-7"
            >
              Month
            </Button>
            <Button
              variant={timeRange === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('year')}
              className="text-xs h-7"
            >
              Year
            </Button>
          </div>

          <Button size="sm" onClick={() => setIsLoadingMetrics(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoadingMetrics ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {metrics ? formatPercentage(metrics.successRate) : 'N/A'}
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                {metrics && metrics.successRate > 0.8 ? (
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Good performance
                  </p>
                ) : metrics && metrics.successRate < 0.5 ? (
                  <p className="text-xs text-red-600 flex items-center mt-1">
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                    Needs improvement
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 flex items-center mt-1">
                    <Activity className="h-3 w-3 mr-1" />
                    Average performance
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {metrics ? formatDuration(metrics.averageResponseTime) : 'N/A'}
                  </div>
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                {metrics && metrics.averageResponseTime < 1000 ? (
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Fast responses
                  </p>
                ) : metrics && metrics.averageResponseTime > 3000 ? (
                  <p className="text-xs text-red-600 flex items-center mt-1">
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                    Slow responses
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 flex items-center mt-1">
                    <Activity className="h-3 w-3 mr-1" />
                    Average speed
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cost Per Execution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {metrics ? formatCost(metrics.costPerExecution) : 'N/A'}
                  </div>
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                {metrics && metrics.costPerExecution < 0.01 ? (
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Cost-efficient
                  </p>
                ) : metrics && metrics.costPerExecution > 0.05 ? (
                  <p className="text-xs text-red-600 flex items-center mt-1">
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                    High cost
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 flex items-center mt-1">
                    <Activity className="h-3 w-3 mr-1" />
                    Average cost
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Executions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {metrics ? metrics.totalExecutions.toLocaleString() : 'N/A'}
                  </div>
                  <Zap className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {metrics ? formatDate(metrics.lastUpdated) : 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Success Rate Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                      <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, 'Success Rate']} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="successRate"
                        stroke="#10b981"
                        activeDot={{ r: 8 }}
                        name="Success Rate"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Response Time & Cost</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" orientation="left" stroke="#0ea5e9" />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="responseTime"
                        fill="#0ea5e9"
                        name="Response Time (ms)"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="cost"
                        fill="#10b981"
                        name="Cost ($)"
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Optimization Suggestions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Optimization Suggestions</CardTitle>
                <CardDescription>AI-generated recommendations to improve agent performance</CardDescription>
              </div>
              <Button
                onClick={generateOptimizationSuggestions}
                disabled={isGeneratingSuggestions}
              >
                {isGeneratingSuggestions ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No optimization suggestions yet. Click "Generate Suggestions" to analyze your agent.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {suggestion.type === 'performance' ? (
                            <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
                          ) : suggestion.type === 'cost' ? (
                            <DollarSign className="h-5 w-5 text-emerald-500 mt-0.5" />
                          ) : suggestion.type === 'quality' ? (
                            <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                          )}
                          <div>
                            <h4 className="font-medium">{suggestion.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {suggestion.type}
                        </Badge>
                      </div>

                      <div className="mt-4 bg-muted/50 rounded-md p-3">
                        <h5 className="text-sm font-medium mb-1">Recommendation</h5>
                        <p className="text-sm">{suggestion.recommendation}</p>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground mr-1">Impact:</span>
                            <span className={`text-xs font-medium capitalize ${getImpactColor(suggestion.impact)}`}>
                              {suggestion.impact}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground mr-1">Effort:</span>
                            <span className={`text-xs font-medium capitalize ${getEffortColor(suggestion.effort)}`}>
                              {suggestion.effort}
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="text-xs">
                          Apply Suggestion
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}