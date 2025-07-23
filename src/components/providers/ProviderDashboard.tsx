'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Activity,
  DollarSign,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  useProviders,
  useProviderHealth,
  useProviderCosts,
  useProviderUsage,
  useProviderOptimization,
} from '@/hooks/useProviders';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
];

export function ProviderDashboard() {
  const { providers } = useProviders();
  const { health } = useProviderHealth();
  const { costs } = useProviderCosts();
  const { usage } = useProviderUsage();
  const { suggestions } = useProviderOptimization();

  const activeProviders = providers.filter((p) => p.isActive);
  const healthyProviders =
    health?.providers.filter((p) => p.status === 'healthy').length || 0;
  const degradedProviders =
    health?.providers.filter((p) => p.status === 'degraded').length || 0;
  const unhealthyProviders =
    health?.providers.filter((p) => p.status === 'unhealthy').length || 0;

  const performanceData =
    health?.providers.map((p) => ({
      name: p.name,
      responseTime: p.responseTime,
      uptime: p.uptime * 100,
      errorRate: p.errorRate * 100,
    })) || [];

  const costTrendData =
    costs?.dailyTrend.map((d) => ({
      date: new Date(d.date).toLocaleDateString(),
      cost: d.cost,
      requests: d.requests,
    })) || [];

  const providerUsageData =
    usage?.providerBreakdown.map((p) => ({
      name: p.providerName,
      requests: p.requests,
      cost: p.cost,
      avgResponseTime: p.avgResponseTime,
    })) || [];

  const executionTypeData =
    usage?.executionTypeBreakdown.map((e) => ({
      name: e.type,
      value: e.requests,
      cost: e.cost,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Provider Health
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{healthyProviders}</span>
              </div>
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{degradedProviders}</span>
              </div>
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">
                  {unhealthyProviders}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {health?.summary.averageUptime
                ? `${(health.summary.averageUptime * 100).toFixed(1)}% avg uptime`
                : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.totalRequests.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {usage?.averageResponseTime
                ? `${usage.averageResponseTime.toFixed(0)}ms avg response`
                : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${costs?.totalCost.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {costs?.projectedMonthlyCost
                ? `$${costs.projectedMonthlyCost.toFixed(2)} projected`
                : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.errorRate
                ? `${(usage.errorRate * 100).toFixed(2)}%`
                : '0.00%'}
            </div>
            <p className="text-xs text-muted-foreground">
              {usage?.averageCostPerRequest
                ? `$${usage.averageCostPerRequest.toFixed(4)} avg cost`
                : 'Calculating...'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Cost Trends</TabsTrigger>
          <TabsTrigger value="usage">Usage Breakdown</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time by Provider</CardTitle>
                <CardDescription>
                  Average response time in milliseconds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="responseTime" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Provider Uptime</CardTitle>
                <CardDescription>Uptime percentage by provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.map((provider, index) => (
                    <div key={provider.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{provider.name}</span>
                        <span>{provider.uptime.toFixed(1)}%</span>
                      </div>
                      <Progress value={provider.uptime} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Trend</CardTitle>
              <CardDescription>Daily cost and request volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cost"
                    stroke="#8884d8"
                    name="Cost ($)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="requests"
                    stroke="#82ca9d"
                    name="Requests"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage by Provider</CardTitle>
                <CardDescription>
                  Request volume and cost by provider
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={providerUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="requests" fill="#8884d8" name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage by Execution Type</CardTitle>
                <CardDescription>
                  Request distribution across modules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={executionTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {executionTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization Suggestions</CardTitle>
                <CardDescription>
                  Recommendations to reduce costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suggestions?.costOptimizations.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant={
                            suggestion.impact === 'high'
                              ? 'destructive'
                              : suggestion.impact === 'medium'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {suggestion.impact} impact
                        </Badge>
                        <span className="text-sm font-medium text-green-600">
                          ${suggestion.potentialSavings.toFixed(2)} savings
                        </span>
                      </div>
                      <h4 className="font-medium mb-1">
                        {suggestion.description}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.recommendation}
                      </p>
                    </div>
                  )) || (
                    <p className="text-muted-foreground">
                      No optimization suggestions available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Optimization</CardTitle>
                <CardDescription>
                  Recommendations to improve performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suggestions?.performanceOptimizations.map(
                    (suggestion, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant={
                              suggestion.impact === 'high'
                                ? 'destructive'
                                : suggestion.impact === 'medium'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {suggestion.impact} impact
                          </Badge>
                          <span className="text-sm font-medium text-blue-600">
                            {suggestion.expectedImprovement}
                          </span>
                        </div>
                        <h4 className="font-medium mb-1">
                          {suggestion.description}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.recommendation}
                        </p>
                      </div>
                    ),
                  ) || (
                    <p className="text-muted-foreground">
                      No performance suggestions available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
