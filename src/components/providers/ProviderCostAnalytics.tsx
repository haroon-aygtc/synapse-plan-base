"use client";

import { useState, useEffect } from "react";
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  PieChart,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  Lightbulb,
  Zap,
  Clock,
} from "lucide-react";
import { useProviderCosts } from "@/hooks/useProviders";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface CostMetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ElementType;
  description?: string;
  color?: "default" | "green" | "red" | "yellow";
}

function CostMetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  description,
  color = "default",
}: CostMetricCardProps) {
  const colorClasses = {
    default: "text-muted-foreground",
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
  };

  const trendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  const TrendIcon = trendIcon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", colorClasses[color])}>
          {value}
        </div>
        {change && TrendIcon && (
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon
              className={cn(
                "h-3 w-3",
                trend === "up" ? "text-red-500" : "text-green-500",
              )}
            />
            <span
              className={cn(
                "text-xs",
                trend === "up" ? "text-red-500" : "text-green-500",
              )}
            >
              {change}
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface ProviderCostBreakdownProps {
  providers: Array<{
    providerId: string;
    providerName: string;
    providerType: string;
    cost: number;
    requests: number;
    averageCostPerRequest: number;
    percentage: number;
  }>;
}

function ProviderCostBreakdown({ providers }: ProviderCostBreakdownProps) {
  const getProviderIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "openai":
        return "🤖";
      case "claude":
        return "🧠";
      case "gemini":
        return "💎";
      case "mistral":
        return "🌪️";
      case "groq":
        return "⚡";
      case "openrouter":
        return "🔀";
      default:
        return "🔧";
    }
  };

  const getProviderColor = (index: number) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Cost by Provider
        </CardTitle>
        <CardDescription>
          Breakdown of costs across different AI providers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {providers.map((provider, index) => (
            <div key={provider.providerId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-lg">
                    {getProviderIcon(provider.providerType)}
                  </div>
                  <div>
                    <div className="font-medium">{provider.providerName}</div>
                    <div className="text-sm text-muted-foreground">
                      {provider.requests.toLocaleString()} requests
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    ${provider.cost.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {provider.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={provider.percentage} className="flex-1" />
                <Badge variant="outline" className="text-xs">
                  ${provider.averageCostPerRequest.toFixed(4)}/req
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ModelCostBreakdownProps {
  models: Array<{
    model: string;
    cost: number;
    requests: number;
    averageCostPerRequest: number;
    percentage: number;
  }>;
}

function ModelCostBreakdown({ models }: ModelCostBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Cost by Model
        </CardTitle>
        <CardDescription>Cost breakdown by AI model usage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {models.map((model, index) => (
            <div key={model.model} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{model.model}</div>
                  <div className="text-sm text-muted-foreground">
                    {model.requests.toLocaleString()} requests
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${model.cost.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">
                    {model.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={model.percentage} className="flex-1" />
                <Badge variant="outline" className="text-xs">
                  ${model.averageCostPerRequest.toFixed(4)}/req
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ExecutionTypeBreakdownProps {
  executionTypes: Array<{
    executionType: "agent" | "tool" | "workflow" | "knowledge";
    cost: number;
    requests: number;
    averageCostPerRequest: number;
    percentage: number;
  }>;
}

function ExecutionTypeBreakdown({
  executionTypes,
}: ExecutionTypeBreakdownProps) {
  const getExecutionTypeIcon = (type: string) => {
    switch (type) {
      case "agent":
        return "🤖";
      case "tool":
        return "🔧";
      case "workflow":
        return "⚡";
      case "knowledge":
        return "📚";
      default:
        return "❓";
    }
  };

  const getExecutionTypeLabel = (type: string) => {
    switch (type) {
      case "agent":
        return "Agent Executions";
      case "tool":
        return "Tool Executions";
      case "workflow":
        return "Workflow Executions";
      case "knowledge":
        return "Knowledge Searches";
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Cost by Execution Type
        </CardTitle>
        <CardDescription>
          Cost breakdown by different execution types
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {executionTypes.map((execType, index) => (
            <div key={execType.executionType} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-lg">
                    {getExecutionTypeIcon(execType.executionType)}
                  </div>
                  <div>
                    <div className="font-medium">
                      {getExecutionTypeLabel(execType.executionType)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {execType.requests.toLocaleString()} executions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    ${execType.cost.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {execType.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={execType.percentage} className="flex-1" />
                <Badge variant="outline" className="text-xs">
                  ${execType.averageCostPerRequest.toFixed(4)}/exec
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface OptimizationSuggestionsProps {
  suggestions: Array<{
    type: "provider_switch" | "model_downgrade" | "usage_reduction";
    description: string;
    potentialSavings: number;
    impact: "low" | "medium" | "high";
    recommendation: string;
  }>;
}

function OptimizationSuggestions({
  suggestions,
}: OptimizationSuggestionsProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "provider_switch":
        return "🔄";
      case "model_downgrade":
        return "📉";
      case "usage_reduction":
        return "📊";
      default:
        return "💡";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Cost Optimization Suggestions
        </CardTitle>
        <CardDescription>
          AI-powered recommendations to reduce your costs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-lg border",
                  getImpactColor(suggestion.impact),
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="text-lg">{getTypeIcon(suggestion.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{suggestion.description}</h4>
                      <Badge variant="outline" className="capitalize">
                        {suggestion.impact} Impact
                      </Badge>
                    </div>
                    <p className="text-sm mb-3">{suggestion.recommendation}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-green-600">
                        Potential Savings: $
                        {suggestion.potentialSavings.toFixed(2)}/month
                      </div>
                      <Button size="sm" variant="outline">
                        Apply Suggestion
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Optimization Suggestions
              </h3>
              <p className="text-muted-foreground">
                Your current setup is already optimized for cost efficiency.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProviderCostAnalytics() {
  const { costs, loading, error, refetch } = useProviderCosts();
  const [dateRange, setDateRange] = useState("7d");
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    switch (range) {
      case "1d":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case "7d":
        startDate = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "30d":
        startDate = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "90d":
        startDate = new Date(
          now.getTime() - 90 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
    }

    endDate = now.toISOString();
    refetch(startDate, endDate);
  };

  const handleExportData = () => {
    if (!costs) return;

    const data = {
      summary: {
        totalCost: costs.totalCost,
        totalRequests: costs.totalRequests,
        averageCostPerRequest: costs.averageCostPerRequest,
        projectedMonthlyCost: costs.projectedMonthlyCost,
      },
      providerBreakdown: costs.costByProvider,
      modelBreakdown: costs.costByModel,
      executionTypeBreakdown: costs.costByExecutionType,
      dailyTrend: costs.dailyTrend,
      optimizationSuggestions: costs.costOptimizationSuggestions,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cost-analytics-${dateRange}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Data Exported",
      description: "Cost analytics data has been downloaded as JSON file.",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Unable to Load Cost Data
          </h3>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cost Analytics</h2>
          <p className="text-muted-foreground">
            Track and optimize your AI provider costs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
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
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "transition-colors",
              autoRefresh ? "bg-green-50 text-green-700 border-green-200" : "",
            )}
          >
            <Clock
              className={cn("h-4 w-4 mr-2", autoRefresh ? "animate-pulse" : "")}
            />
            Auto Refresh {autoRefresh ? "On" : "Off"}
          </Button>
        </div>
      </div>

      {/* Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CostMetricCard
          title="Total Cost"
          value={`$${costs?.totalCost?.toFixed(2) || "0.00"}`}
          icon={DollarSign}
          description={`${dateRange} period`}
          color="default"
        />
        <CostMetricCard
          title="Total Requests"
          value={costs?.totalRequests?.toLocaleString() || "0"}
          icon={Zap}
          description="API calls made"
          color="default"
        />
        <CostMetricCard
          title="Avg Cost/Request"
          value={`$${costs?.averageCostPerRequest?.toFixed(4) || "0.0000"}`}
          icon={Target}
          description="Per API call"
          color="default"
        />
        <CostMetricCard
          title="Projected Monthly"
          value={`$${costs?.projectedMonthlyCost?.toFixed(2) || "0.00"}`}
          icon={TrendingUp}
          description="Based on current usage"
          color={
            costs?.projectedMonthlyCost && costs.projectedMonthlyCost > 1000
              ? "red"
              : "green"
          }
        />
      </div>

      {/* Cost Breakdowns */}
      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="providers">By Provider</TabsTrigger>
          <TabsTrigger value="models">By Model</TabsTrigger>
          <TabsTrigger value="execution">By Execution Type</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <ProviderCostBreakdown providers={costs?.costByProvider || []} />
        </TabsContent>

        <TabsContent value="models">
          <ModelCostBreakdown models={costs?.costByModel || []} />
        </TabsContent>

        <TabsContent value="execution">
          <ExecutionTypeBreakdown
            executionTypes={costs?.costByExecutionType || []}
          />
        </TabsContent>

        <TabsContent value="optimization">
          <OptimizationSuggestions
            suggestions={costs?.costOptimizationSuggestions || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
