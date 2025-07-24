"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  MousePointer,
  Target,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Download,
  RefreshCw,
  Calendar,
  Activity,
} from "lucide-react";
import {
  useWidgets,
  WidgetAnalytics as WidgetAnalyticsType,
} from "@/hooks/useWidgets";
import { Widget } from "@/lib/sdk/types";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface WidgetAnalyticsProps {
  widget: Widget;
  className?: string;
}

interface ConversionFunnelData {
  steps: Array<{
    name: string;
    users: number;
    conversionRate: number;
    dropOffRate: number;
  }>;
  totalUsers: number;
  overallConversionRate: number;
}

interface UserJourneyData {
  paths: Array<{
    path: string[];
    users: number;
    conversionRate: number;
    averageTime: number;
  }>;
  dropOffPoints: Array<{
    step: string;
    dropOffRate: number;
    users: number;
  }>;
}

interface HeatmapData {
  interactions: Array<{
    x: number;
    y: number;
    intensity: number;
    type: "click" | "hover" | "scroll";
  }>;
  dimensions: {
    width: number;
    height: number;
  };
}

interface PerformanceMetrics {
  loadTime: {
    average: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  throughput: number;
  uptime: number;
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
}

interface RetentionData {
  cohorts: Array<{
    period: string;
    users: number;
    retention: Array<{
      day: number;
      percentage: number;
      users: number;
    }>;
  }>;
  overallRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export function WidgetAnalytics({ widget, className }: WidgetAnalyticsProps) {
  const { toast } = useToast();
  const { getWidgetAnalytics, exportAnalytics } = useWidgets();

  const [analytics, setAnalytics] = useState<WidgetAnalyticsType | null>(null);
  const [conversionFunnel, setConversionFunnel] =
    useState<ConversionFunnelData | null>(null);
  const [userJourney, setUserJourney] = useState<UserJourneyData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionData | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("7d");
  const [isExporting, setIsExporting] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  const getDateRange = useCallback(() => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case "1d":
        start.setDate(end.getDate() - 1);
        break;
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      case "90d":
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 7);
    }

    return { start, end };
  }, [dateRange]);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const period = getDateRange();
      const analyticsData = await getWidgetAnalytics(widget.id, period);
      setAnalytics(analyticsData);

      // Load additional analytics data
      const [funnelRes, journeyRes, heatmapRes, performanceRes, retentionRes] =
        await Promise.all([
          api.get(
            `/widgets/${widget.id}/analytics/conversion-funnel?start=${period.start.toISOString()}&end=${period.end.toISOString()}`,
          ),
          api.get(
            `/widgets/${widget.id}/analytics/user-journey?start=${period.start.toISOString()}&end=${period.end.toISOString()}`,
          ),
          api.get(
            `/widgets/${widget.id}/analytics/heatmap?start=${period.start.toISOString()}&end=${period.end.toISOString()}`,
          ),
          api.get(
            `/widgets/${widget.id}/analytics/performance-metrics?start=${period.start.toISOString()}&end=${period.end.toISOString()}`,
          ),
          api.get(
            `/widgets/${widget.id}/analytics/retention?start=${period.start.toISOString()}&end=${period.end.toISOString()}`,
          ),
        ]);

      if (funnelRes.data.success) setConversionFunnel(funnelRes.data.data);
      if (journeyRes.data.success) setUserJourney(journeyRes.data.data);
      if (heatmapRes.data.success) setHeatmapData(heatmapRes.data.data);
      if (performanceRes.data.success)
        setPerformanceMetrics(performanceRes.data.data);
      if (retentionRes.data.success) setRetentionData(retentionRes.data.data);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics data");
      console.error("Analytics loading error:", err);
    } finally {
      setLoading(false);
    }
  }, [widget.id, getDateRange, getWidgetAnalytics]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Real-time updates
  useEffect(() => {
    if (!realTimeEnabled) return;

    const interval = setInterval(() => {
      loadAnalytics();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [realTimeEnabled, loadAnalytics]);

  const handleExport = async (format: "csv" | "json" | "xlsx") => {
    try {
      setIsExporting(true);
      const period = getDateRange();
      await exportAnalytics(widget.id, period, format);

      toast({
        title: "Export Complete",
        description: `Analytics data exported as ${format.toUpperCase()}`,
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Failed to export analytics data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadAnalytics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Widget Analytics</h2>
          <p className="text-gray-600">{widget.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
          >
            <Activity
              className={`h-4 w-4 mr-2 ${realTimeEnabled ? "text-green-500" : ""}`}
            />
            {realTimeEnabled ? "Live" : "Static"}
          </Button>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="journey">Journey</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Views
                    </p>
                    <p className="text-2xl font-bold">
                      {formatNumber(analytics?.metrics.totalViews || 0)}
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Unique Visitors
                    </p>
                    <p className="text-2xl font-bold">
                      {formatNumber(analytics?.metrics.uniqueVisitors || 0)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Interactions
                    </p>
                    <p className="text-2xl font-bold">
                      {formatNumber(analytics?.metrics.interactions || 0)}
                    </p>
                  </div>
                  <MousePointer className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Conversions
                    </p>
                    <p className="text-2xl font-bold">
                      {formatNumber(analytics?.metrics.conversions || 0)}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Avg. Session Duration
                    </p>
                    <p className="text-xl font-semibold">
                      {formatDuration(
                        analytics?.metrics.averageSessionDuration || 0,
                      )}
                    </p>
                  </div>
                  <Clock className="h-6 w-6 text-gray-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Bounce Rate
                    </p>
                    <p className="text-xl font-semibold">
                      {formatPercentage(analytics?.metrics.bounceRate || 0)}
                    </p>
                  </div>
                  <TrendingDown className="h-6 w-6 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Conversion Rate
                    </p>
                    <p className="text-xl font-semibold">
                      {formatPercentage(
                        analytics?.metrics.totalViews
                          ? (analytics.metrics.conversions /
                              analytics.metrics.totalViews) *
                              100
                          : 0,
                      )}
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Device & Browser Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>Desktop</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatNumber(analytics?.deviceBreakdown.desktop || 0)}
                      </span>
                      <span className="text-sm text-gray-500">
                        (
                        {formatPercentage(
                          analytics?.metrics.totalViews
                            ? ((analytics.deviceBreakdown.desktop || 0) /
                                analytics.metrics.totalViews) *
                                100
                            : 0,
                        )}
                        )
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Mobile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatNumber(analytics?.deviceBreakdown.mobile || 0)}
                      </span>
                      <span className="text-sm text-gray-500">
                        (
                        {formatPercentage(
                          analytics?.metrics.totalViews
                            ? ((analytics.deviceBreakdown.mobile || 0) /
                                analytics.metrics.totalViews) *
                                100
                            : 0,
                        )}
                        )
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>Tablet</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatNumber(analytics?.deviceBreakdown.tablet || 0)}
                      </span>
                      <span className="text-sm text-gray-500">
                        (
                        {formatPercentage(
                          analytics?.metrics.totalViews
                            ? ((analytics.deviceBreakdown.tablet || 0) /
                                analytics.metrics.totalViews) *
                                100
                            : 0,
                        )}
                        )
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {analytics?.topPages.map((page, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {page.url}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatNumber(page.interactions)} interactions
                          </p>
                        </div>
                        <Badge variant="outline">
                          {formatNumber(page.views)}
                        </Badge>
                      </div>
                    )) || (
                      <p className="text-sm text-gray-500">
                        No page data available
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Export Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>
                Download analytics data in various formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport("csv")}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("json")}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("xlsx")}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel">
          <ConversionFunnelVisualization data={conversionFunnel} />
        </TabsContent>

        <TabsContent value="journey">
          <UserJourneyAnalysis data={userJourney} />
        </TabsContent>

        <TabsContent value="heatmap">
          <HeatmapVisualization data={heatmapData} widget={widget} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMetricsDashboard data={performanceMetrics} />
        </TabsContent>

        <TabsContent value="retention">
          <RetentionAnalysisVisualization data={retentionData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Conversion Funnel Visualization Component
function ConversionFunnelVisualization({
  data,
}: {
  data: ConversionFunnelData | null;
}) {
  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>
          User journey through conversion steps with drop-off analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {data.totalUsers.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {data.overallConversionRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Overall Conversion</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {(100 - data.overallConversionRate).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Drop-off Rate</p>
            </div>
          </div>

          <div className="space-y-4">
            {data.steps.map((step, index) => {
              const width = (step.users / data.totalUsers) * 100;
              return (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{step.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {step.users.toLocaleString()} users
                      </span>
                      <Badge
                        variant={
                          step.conversionRate > 50 ? "default" : "secondary"
                        }
                      >
                        {step.conversionRate.toFixed(1)}% conversion
                      </Badge>
                    </div>
                  </div>
                  <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${width}%` }}
                    />
                    {step.dropOffRate > 0 && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <span className="text-xs text-red-600 font-medium">
                          -{step.dropOffRate.toFixed(1)}% drop-off
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// User Journey Analysis Component
function UserJourneyAnalysis({ data }: { data: UserJourneyData | null }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Journey Paths</CardTitle>
          <CardDescription>
            Most common paths users take through your widget
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {data.paths.map((path, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge>{path.users} users</Badge>
                      <span className="text-sm text-gray-600">
                        {path.conversionRate.toFixed(1)}% conversion
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      Avg. time: {(path.averageTime / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {path.path.map((step, stepIndex) => (
                      <React.Fragment key={stepIndex}>
                        <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {step}
                        </div>
                        {stepIndex < path.path.length - 1 && (
                          <div className="w-4 h-px bg-gray-300" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Drop-off Points</CardTitle>
          <CardDescription>
            Steps where users most commonly leave
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.dropOffPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{point.step}</p>
                  <p className="text-sm text-gray-600">
                    {point.users} users dropped off
                  </p>
                </div>
                <Badge variant="destructive">
                  {point.dropOffRate.toFixed(1)}% drop-off
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Heatmap Visualization Component
function HeatmapVisualization({
  data,
  widget,
}: {
  data: HeatmapData | null;
  widget: Widget;
}) {
  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  const getIntensityColor = (intensity: number) => {
    const alpha = Math.min(intensity / 100, 1);
    return `rgba(59, 130, 246, ${alpha})`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interaction Heatmap</CardTitle>
        <CardDescription>
          Visual representation of where users click and interact
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="relative border rounded-lg overflow-hidden"
          style={{
            width: Math.min(data.dimensions.width, 800),
            height: Math.min(data.dimensions.height, 600),
            backgroundColor: "#f8fafc",
          }}
        >
          {/* Widget preview background */}
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50" />
          </div>

          {/* Heatmap points */}
          {data.interactions.map((interaction, index) => (
            <div
              key={index}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: interaction.x,
                top: interaction.y,
                width: 20,
                height: 20,
                backgroundColor: getIntensityColor(interaction.intensity),
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg">
            <p className="text-sm font-medium mb-2">Interaction Intensity</p>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-200" />
              <span className="text-xs">Low</span>
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-xs">High</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-lg font-semibold">{data.interactions.length}</p>
            <p className="text-sm text-gray-600">Total Interactions</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">
              {data.interactions.filter((i) => i.type === "click").length}
            </p>
            <p className="text-sm text-gray-600">Clicks</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">
              {data.interactions.filter((i) => i.type === "hover").length}
            </p>
            <p className="text-sm text-gray-600">Hovers</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Performance Metrics Dashboard Component
function PerformanceMetricsDashboard({
  data,
}: {
  data: PerformanceMetrics | null;
}) {
  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Load Time
                </p>
                <p className="text-2xl font-bold">
                  {data.loadTime.average.toFixed(0)}ms
                </p>
                <p className="text-xs text-gray-500">
                  P95: {data.loadTime.p95.toFixed(0)}ms
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-red-600">
                  {data.errorRate.toFixed(2)}%
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Throughput</p>
                <p className="text-2xl font-bold">
                  {data.throughput.toFixed(0)}/min
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Uptime</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.uptime.toFixed(2)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average</span>
              <span className="font-semibold">
                {data.responseTime.average.toFixed(0)}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">95th Percentile</span>
              <span className="font-semibold">
                {data.responseTime.p95.toFixed(0)}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">99th Percentile</span>
              <span className="font-semibold">
                {data.responseTime.p99.toFixed(0)}ms
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Retention Analysis Visualization Component
function RetentionAnalysisVisualization({
  data,
}: {
  data: RetentionData | null;
}) {
  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {data.overallRetention.day1.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Day 1 Retention</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {data.overallRetention.day7.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Day 7 Retention</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {data.overallRetention.day30.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Day 30 Retention</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retention Cohorts</CardTitle>
          <CardDescription>
            User retention over time by cohort period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {data.cohorts.map((cohort, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{cohort.period}</h4>
                    <Badge>{cohort.users} users</Badge>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {cohort.retention.map((retention, dayIndex) => (
                      <div key={dayIndex} className="text-center">
                        <div className="text-xs text-gray-500 mb-1">
                          Day {retention.day}
                        </div>
                        <div className="text-sm font-medium">
                          {retention.percentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400">
                          {retention.users}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default WidgetAnalytics;
