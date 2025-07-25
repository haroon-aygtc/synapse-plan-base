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
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useProviderHealth, useProviders } from "@/hooks/useProviders";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface HealthStatusProps {
  status: "healthy" | "degraded" | "unhealthy";
  size?: "sm" | "md" | "lg";
}

function HealthStatus({ status, size = "md" }: HealthStatusProps) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-200 dark:border-green-800",
      label: "Healthy",
    },
    degraded: {
      icon: AlertTriangle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      label: "Degraded",
    },
    unhealthy: {
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-200 dark:border-red-800",
      label: "Unhealthy",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const iconSize =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full border",
        config.bgColor,
        config.borderColor,
      )}
    >
      <Icon className={cn(iconSize, config.color)} />
      <span className={cn("font-medium", config.color)}>{config.label}</span>
    </div>
  );
}

interface ProviderHealthCardProps {
  provider: {
    id: string;
    name: string;
    type: string;
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    errorRate: number;
    uptime: number;
    lastCheck: Date;
  };
  onTest: (id: string) => void;
  onConfigure: (id: string) => void;
  testing: boolean;
}

function ProviderHealthCard({
  provider,
  onTest,
  onConfigure,
  testing,
}: ProviderHealthCardProps) {
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

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99) return "text-green-600";
    if (uptime >= 95) return "text-yellow-600";
    return "text-red-600";
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime <= 1000) return "text-green-600";
    if (responseTime <= 3000) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{getProviderIcon(provider.type)}</div>
            <div>
              <CardTitle className="text-lg">{provider.name}</CardTitle>
              <CardDescription className="capitalize">
                {provider.type} Provider
              </CardDescription>
            </div>
          </div>
          <HealthStatus status={provider.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div
              className={cn(
                "text-2xl font-bold",
                getUptimeColor(provider.uptime),
              )}
            >
              {provider.uptime.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div
              className={cn(
                "text-2xl font-bold",
                getResponseTimeColor(provider.responseTime),
              )}
            >
              {provider.responseTime}ms
            </div>
            <div className="text-sm text-muted-foreground">Response</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div
              className={cn(
                "text-2xl font-bold",
                provider.errorRate > 5 ? "text-red-600" : "text-green-600",
              )}
            >
              {provider.errorRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Error Rate</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Uptime</span>
              <span className={getUptimeColor(provider.uptime)}>
                {provider.uptime.toFixed(1)}%
              </span>
            </div>
            <Progress value={provider.uptime} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Performance</span>
              <span className={getResponseTimeColor(provider.responseTime)}>
                {provider.responseTime <= 1000
                  ? "Excellent"
                  : provider.responseTime <= 3000
                    ? "Good"
                    : "Poor"}
              </span>
            </div>
            <Progress
              value={Math.max(0, 100 - provider.responseTime / 50)}
              className="h-2"
            />
          </div>
        </div>

        {/* Last Check */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Last checked: {new Date(provider.lastCheck).toLocaleTimeString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTest(provider.id)}
            disabled={testing}
            className="flex-1"
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfigure(provider.id)}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemOverview({ health }: { health: any }) {
  if (!health) return null;

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "degraded":
        return "text-yellow-600";
      case "unhealthy":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-2xl font-bold",
              getOverallStatusColor(health.overall),
            )}
          >
            {health.overall.charAt(0).toUpperCase() + health.overall.slice(1)}
          </div>
          <p className="text-xs text-muted-foreground">
            {health.summary.healthy}/{health.summary.total} providers healthy
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Average Response
          </CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {health.summary.averageResponseTime?.toFixed(0) || 0}ms
          </div>
          <p className="text-xs text-muted-foreground">Across all providers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Uptime</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {(health.summary.averageUptime * 100)?.toFixed(1) || 0}%
          </div>
          <p className="text-xs text-muted-foreground">Last 24 hours</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Provider Status</CardTitle>
          <Wifi className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">{health.summary.healthy}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm">{health.summary.degraded}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm">{health.summary.unhealthy}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Healthy / Degraded / Unhealthy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProviderHealthMonitor() {
  const { health, loading, error, refetch } = useProviderHealth();
  const { testProvider } = useProviders();
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const handleTestProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const result = await testProvider(providerId);
      if (result.success) {
        toast({
          title: "Connection Test Successful",
          description: `Provider responded in ${result.responseTime}ms`,
        });
      }
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setTestingProvider(null);
      // Refresh health data after test
      setTimeout(() => refetch(), 1000);
    }
  };

  const handleConfigureProvider = (providerId: string) => {
    // Navigate to provider configuration
    window.location.hash = `#configure-${providerId}`;
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing Health Data",
      description: "Fetching latest provider health information...",
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
          <WifiOff className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Unable to Load Health Data
          </h3>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <Button onClick={handleRefresh}>
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
          <h2 className="text-2xl font-bold">Provider Health Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of AI provider health and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "transition-colors",
              autoRefresh ? "bg-green-50 text-green-700 border-green-200" : "",
            )}
          >
            <Activity
              className={cn("h-4 w-4 mr-2", autoRefresh ? "animate-pulse" : "")}
            />
            Auto Refresh {autoRefresh ? "On" : "Off"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <SystemOverview health={health} />

      {/* Provider Health Cards */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Providers</TabsTrigger>
          <TabsTrigger value="healthy">Healthy</TabsTrigger>
          <TabsTrigger value="degraded">Degraded</TabsTrigger>
          <TabsTrigger value="unhealthy">Unhealthy</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {health?.providers && health.providers.length && health.providers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {health.providers.map((provider: any) => (
                <ProviderHealthCard
                  key={provider.id}
                  provider={provider}
                  onTest={handleTestProvider}
                  onConfigure={handleConfigureProvider}
                  testing={testingProvider === provider.id}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Providers Configured
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add AI providers to start monitoring their health and
                  performance.
                </p>
                <Button
                  onClick={() => {
                    window.location.hash = "#add-provider";
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Providers
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="healthy">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {health?.providers
              ?.filter((p) => p.status === "healthy")
              .map((provider) => (
                <ProviderHealthCard
                  key={provider.id}
                  provider={provider}
                  onTest={handleTestProvider}
                  onConfigure={handleConfigureProvider}
                  testing={testingProvider === provider.id}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="degraded">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {health?.providers
              ?.filter((p) => p.status === "degraded")
              .map((provider) => (
                <ProviderHealthCard
                  key={provider.id}
                  provider={provider}
                  onTest={handleTestProvider}
                  onConfigure={handleConfigureProvider}
                  testing={testingProvider === provider.id}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="unhealthy">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {health?.providers
              ?.filter((p) => p.status === "unhealthy")
              .map((provider) => (
                <ProviderHealthCard
                  key={provider.id}
                  provider={provider}
                  onTest={handleTestProvider}
                  onConfigure={handleConfigureProvider}
                  testing={testingProvider === provider.id}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
