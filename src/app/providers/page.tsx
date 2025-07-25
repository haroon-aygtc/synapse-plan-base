"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Activity, DollarSign, Zap } from "lucide-react";
import { ProviderConfiguration } from "@/components/providers/ProviderConfiguration";
import { ProviderDashboard } from "@/components/providers/ProviderDashboard";
import { ProviderHealthMonitor } from "@/components/providers/ProviderHealthMonitor";
import { ProviderCostAnalytics } from "@/components/providers/ProviderCostAnalytics";
import { ProviderRoutingConfig } from "@/components/providers/ProviderRoutingConfig";
import {
  useProviders,
  useProviderHealth,
  useProviderCosts,
} from "@/hooks/useProviders";

export default function ProvidersPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreateProvider, setShowCreateProvider] = useState(false);
  const { providers, loading } = useProviders();
  const { health } = useProviderHealth();
  const { costs } = useProviderCosts();

  const activeProviders = providers.filter((p) => p.isActive);
  const healthyProviders =
    health?.providers.filter((p) => p.status === "healthy").length || 0;
  const totalCost = costs?.totalCost || 0;
  const totalRequests = costs?.totalRequests || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Provider Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Configure, monitor, and optimize your AI providers
            </p>
          </div>
          <Button
            onClick={() => setShowCreateProvider(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Provider
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Providers
              </CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProviders.length}</div>
              <p className="text-xs text-muted-foreground">
                {providers.length} total configured
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Healthy Providers
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {healthyProviders}
              </div>
              <p className="text-xs text-muted-foreground">
                {health?.summary.averageUptime
                  ? `${(health.summary.averageUptime * 100).toFixed(1)}% uptime`
                  : "Calculating..."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Cost
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {costs?.projectedMonthlyCost
                  ? `$${costs.projectedMonthlyCost.toFixed(2)} projected`
                  : "Calculating..."}
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
                {totalRequests.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {costs?.averageCostPerRequest
                  ? `$${costs.averageCostPerRequest.toFixed(4)} avg cost`
                  : "Calculating..."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="health">Health Monitor</TabsTrigger>
            <TabsTrigger value="costs">Cost Analytics</TabsTrigger>
            <TabsTrigger value="routing">Smart Routing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ProviderDashboard />
          </TabsContent>

          <TabsContent value="configuration" className="space-y-6">
            <ProviderConfiguration />
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Directory</CardTitle>
                <CardDescription>
                  Browse and manage available AI models across providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Model directory functionality coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <ProviderHealthMonitor />
          </TabsContent>

          <TabsContent value="costs" className="space-y-6">
            <ProviderCostAnalytics />
          </TabsContent>

          <TabsContent value="routing" className="space-y-6">
            <ProviderRoutingConfig />
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Provider Testing</CardTitle>
                <CardDescription>
                  Test and validate provider configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Provider testing playground coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Streaming Events</CardTitle>
                <CardDescription>
                  Monitor real-time provider events and streaming responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Streaming events console coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
