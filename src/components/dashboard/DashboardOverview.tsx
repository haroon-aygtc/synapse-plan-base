"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Bot,
  Cog,
  FileText,
  LineChart,
  Zap,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import QuickAccessPanel from "./QuickAccessPanel";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import { wsService } from "@/lib/websocket";
import {
  DashboardData,
  ActivityItem,
  DashboardStats,
  type ResourceUsage,
} from "@/types/dashboard";

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

const StatsCard = ({
  title,
  value,
  description,
  icon,
  trend,
  isLoading = false,
}: StatsCardProps) => {
  return (
    <Card className="bg-background">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? (
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
          ) : (
            value
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && !isLoading && (
          <div
            className={`mt-2 flex items-center text-xs ${
              trend.isPositive ? "text-green-500" : "text-red-500"
            }`}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}%
            <span className="text-muted-foreground ml-1">
              {trend.isPositive ? "increase" : "decrease"} from last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ActivityFeed = ({
  activities,
  isLoading,
  error,
}: {
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;
}) => {
  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load activities: {error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-start space-x-4 rounded-md border p-3 bg-background"
          >
            <div className="rounded-full p-2 bg-muted animate-pulse w-10 h-10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No recent activities</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start space-x-4 rounded-md border p-3 bg-background"
        >
          <div className="rounded-full p-2 bg-muted">
            {activity.type === "agent" && <Bot size={16} />}
            {activity.type === "workflow" && <Activity size={16} />}
            {activity.type === "tool" && <Cog size={16} />}
            {activity.type === "system" && <Zap size={16} />}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">{activity.title}</p>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {activity.message || `${activity.type} execution`}
              </p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activity.status === "completed"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : activity.status === "in_progress"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
              >
                {activity.status === "completed"
                  ? "Completed"
                  : activity.status === "in_progress"
                    ? "In Progress"
                    : "Failed"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{activity.timestamp}</span>
              {activity.duration && <span>{activity.duration}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ResourceUsage = ({
  usage,
  isLoading,
  error,
}: {
  usage: ResourceUsage | null;
  isLoading: boolean;
  error: string | null;
}) => {
  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load resource usage: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !usage) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
            </div>
            <div className="h-2 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  const calculatePercentage = (used: number, limit: number) => {
    return limit > 0 ? (used / limit) * 100 : 0;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Agent Executions</span>
          <span className="text-sm text-muted-foreground">
            {usage.agentExecutions.used.toLocaleString()} /{" "}
            {usage.agentExecutions.limit.toLocaleString()}
          </span>
        </div>
        <Progress
          value={calculatePercentage(
            usage.agentExecutions.used,
            usage.agentExecutions.limit,
          )}
          className="h-2"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Tool Executions</span>
          <span className="text-sm text-muted-foreground">
            {usage.toolExecutions.used.toLocaleString()} /{" "}
            {usage.toolExecutions.limit.toLocaleString()}
          </span>
        </div>
        <Progress
          value={calculatePercentage(
            usage.toolExecutions.used,
            usage.toolExecutions.limit,
          )}
          className="h-2"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Knowledge Base Storage</span>
          <span className="text-sm text-muted-foreground">
            {usage.knowledgeStorage.used.toFixed(1)} GB /{" "}
            {usage.knowledgeStorage.limit} GB
          </span>
        </div>
        <Progress
          value={calculatePercentage(
            usage.knowledgeStorage.used,
            usage.knowledgeStorage.limit,
          )}
          className="h-2"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">API Calls</span>
          <span className="text-sm text-muted-foreground">
            {usage.apiCalls.used.toLocaleString()} /{" "}
            {usage.apiCalls.limit.toLocaleString()}
          </span>
        </div>
        <Progress
          value={calculatePercentage(usage.apiCalls.used, usage.apiCalls.limit)}
          className="h-2"
        />
      </div>

      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-medium">Billing Summary</h4>
        <div className="rounded-md border p-4 bg-background">
          <div className="flex items-center justify-between">
            <span className="text-sm">Current Plan</span>
            <span className="text-sm font-medium">
              {usage.billing.currentPlan}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">Billing Period</span>
            <span className="text-sm">{usage.billing.billingPeriod}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">Current Usage</span>
            <span className="text-sm font-medium">
              ${usage.billing.currentUsage.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">Projected Total</span>
            <span className="text-sm font-medium">
              ${usage.billing.projectedTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardOverview = () => {
  const { user, isAuthenticated } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState("today");

  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);

      const [statsResponse, activitiesResponse, usageResponse] =
        await Promise.all([
          apiClient.get<DashboardStats>(
            `/dashboard/stats?period=${timeFilter}`,
          ),
          apiClient.get<ActivityItem[]>(
            `/dashboard/activities?period=${timeFilter}&limit=10`,
          ),
          apiClient.get<ResourceUsage>("/dashboard/usage"),
        ]);

      if (
        statsResponse.success &&
        activitiesResponse.success &&
        usageResponse.success
      ) {
        setDashboardData({
          stats: statsResponse.data!,
          activities: activitiesResponse.data!,
          resourceUsage: usageResponse.data!,
        });
      } else {
        throw new Error("Failed to fetch dashboard data");
      }
    } catch (err: any) {
      console.error("Dashboard data fetch error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, timeFilter]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // WebSocket connection and real-time updates
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (token) {
      wsService.connect(token);
    }

    // Subscribe to real-time updates
    const unsubscribeActivity = wsService.on(
      "activity_update",
      (newActivity: ActivityItem) => {
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activities: [newActivity, ...prev.activities.slice(0, 9)], // Keep only 10 most recent
          };
        });
      },
    );

    const unsubscribeStats = wsService.on(
      "stats_update",
      (newStats: Partial<DashboardStats>) => {
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            stats: { ...prev.stats, ...newStats },
          };
        });
      },
    );

    const unsubscribeResource = wsService.on(
      "resource_update",
      (newUsage: Partial<ResourceUsage>) => {
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            resourceUsage: { ...prev.resourceUsage, ...newUsage },
          };
        });
      },
    );

    return () => {
      unsubscribeActivity();
      unsubscribeStats();
      unsubscribeResource();
      wsService.disconnect();
    };
  }, [isAuthenticated, user]);

  // Show loading state for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value);
  };

  return (
    <div className="flex flex-col space-y-6 bg-muted/40 p-6 rounded-lg">
      {error && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <button
              onClick={fetchDashboardData}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Agents"
          value={dashboardData?.stats.activeAgents.count.toString() || "0"}
          description="Total active AI agents"
          icon={<Bot size={16} />}
          trend={dashboardData?.stats.activeAgents.trend}
          isLoading={isLoading}
        />
        <StatsCard
          title="Tool Executions"
          value={
            dashboardData?.stats.toolExecutions.count.toLocaleString() || "0"
          }
          description={`This month with $${dashboardData?.stats.toolExecutions.cost.toFixed(2) || "0.00"} cost`}
          icon={<Cog size={16} />}
          trend={dashboardData?.stats.toolExecutions.trend}
          isLoading={isLoading}
        />
        <StatsCard
          title="Workflow Completions"
          value={
            dashboardData?.stats.workflowCompletions.count.toString() || "0"
          }
          description={`${dashboardData?.stats.workflowCompletions.successRate.toFixed(1) || "0.0"}% success rate`}
          icon={<Activity size={16} />}
          trend={dashboardData?.stats.workflowCompletions.trend}
          isLoading={isLoading}
        />
        <StatsCard
          title="Knowledge Base"
          value={
            dashboardData?.stats.knowledgeBase.documentCount.toString() || "0"
          }
          description={`Documents with ${dashboardData?.stats.knowledgeBase.searchCount || 0} searches`}
          icon={<FileText size={16} />}
          trend={dashboardData?.stats.knowledgeBase.trend}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Tabs defaultValue="activity" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="activity">Activity Feed</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              <select
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs"
                value={timeFilter}
                onChange={(e) => handleTimeFilterChange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <TabsContent value="activity" className="mt-4 space-y-4">
              <ActivityFeed
                activities={dashboardData?.activities || []}
                isLoading={isLoading}
                error={error}
              />
            </TabsContent>
            <TabsContent value="analytics" className="mt-4">
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  {isLoading ? (
                    <div className="flex flex-col items-center text-center">
                      <Loader2 className="h-16 w-16 mb-2 animate-spin text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Loading analytics...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center text-muted-foreground">
                      <LineChart className="h-16 w-16 mb-2" />
                      <p>Analytics visualization would appear here</p>
                      <p className="text-sm">
                        Showing agent performance, tool usage, and workflow
                        efficiency
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <QuickAccessPanel />

          <Card className="bg-background">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Resource Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResourceUsage
                usage={dashboardData?.resourceUsage || null}
                isLoading={isLoading}
                error={error}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
