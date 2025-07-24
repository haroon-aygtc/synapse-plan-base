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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
  Users,
  Workflow,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Zap,
  Container,
  Database,
  Bug,
  TestTube,
  FileText,
  Code,
  Terminal,
  Pause,
  Square,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TestingSandbox {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  resourceLimits: {
    memory: string;
    cpu: string;
    timeout: number;
    networkAccess: boolean;
    allowedPorts: number[];
  };
  isolationConfig: {
    filesystem: {
      readOnly: boolean;
      allowedPaths: string[];
    };
    network: {
      allowedDomains: string[];
      blockedPorts: number[];
    };
    environment: {
      allowedEnvVars: string[];
    };
  };
  containerInfo?: {
    containerId: string;
    status: string;
    createdAt: Date;
    ports?: number[];
    volumes?: string[];
  };
  configuration?: Record<string, any>;
  environment?: Record<string, any>;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  testScenarios?: TestScenario[];
  testExecutions?: TestExecution[];
  mockData?: MockData[];
  debugSessions?: DebugSession[];
}

interface TestScenario {
  id: string;
  name: string;
  description?: string;
  type: string;
  steps: Array<{
    id: string;
    name: string;
    type: string;
    input: any;
    expectedOutput: any;
    timeout?: number;
    retries?: number;
  }>;
  assertions: Array<{
    id: string;
    type: "equals" | "contains" | "matches" | "custom";
    field: string;
    expected: any;
    actual?: any;
    passed?: boolean;
    message?: string;
  }>;
  inputData?: any;
  expectedOutput?: any;
  configuration?: Record<string, any>;
  status: string;
  sandboxId: string;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

interface TestExecution {
  id: string;
  testType: string;
  testData: any;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  output?: any;
  error?: string;
  metrics?: {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
    networkCalls: number;
  };
  traces?: Array<{
    timestamp: Date;
    level: string;
    message: string;
    data?: any;
    stackTrace?: string;
  }>;
  configuration?: Record<string, any>;
  sandboxId: string;
  userId: string;
  organizationId: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface MockData {
  id: string;
  name: string;
  description?: string;
  dataType: string;
  schema: {
    type: "object" | "array" | "string" | "number" | "boolean";
    properties?: Record<string, any>;
    items?: any;
    format?: string;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    enum?: any[];
  };
  data: any;
  rules?: Array<{
    id: string;
    condition: string;
    action: "return" | "modify" | "delay" | "error";
    value?: any;
    delay?: number;
    errorCode?: number;
    errorMessage?: string;
  }>;
  configuration?: Record<string, any>;
  status: string;
  sandboxId: string;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

interface DebugSession {
  id: string;
  name: string;
  description?: string;
  sessionType: string;
  targetModuleId: string;
  configuration: {
    logLevel: "error" | "warn" | "info" | "debug" | "trace";
    stepByStep: boolean;
    variableInspection: boolean;
    callStackTracking: boolean;
    performanceProfiling: boolean;
    breakpoints: Array<{
      id: string;
      moduleId: string;
      line: number;
      condition?: string;
      enabled: boolean;
    }>;
    watchExpressions: Array<{
      id: string;
      expression: string;
      value?: any;
      enabled: boolean;
    }>;
    additionalSettings?: Record<string, any>;
  };
  initialInput?: any;
  timeout?: number;
  status: string;
  currentState?: any;
  debugLogs?: Array<{
    timestamp: Date;
    level: "error" | "warn" | "info" | "debug" | "trace";
    message: string;
    data?: any;
    stackTrace?: string;
  }>;
  sandboxId: string;
  userId: string;
  organizationId: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SandboxDashboard() {
  const { user } = useAuth();
  const [sandboxes, setSandboxes] = useState<TestingSandbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSandbox, setSelectedSandbox] = useState<TestingSandbox | null>(
    null,
  );
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [resourceUsage, setResourceUsage] = useState<any>(null);
  const [loadingResourceUsage, setLoadingResourceUsage] = useState(false);

  // Form states for creating sandbox
  const [newSandbox, setNewSandbox] = useState({
    name: "",
    description: "",
    type: "agent",
    resourceLimits: {
      memory: "512m",
      cpu: "0.5",
      timeout: 300000,
      networkAccess: true,
      allowedPorts: [80, 443, 3000, 8080],
    },
    configuration: {},
    environment: {},
  });

  useEffect(() => {
    loadSandboxes();
  }, []);

  const loadSandboxes = async () => {
    setLoading(true);
    try {
      const response = await api.get("/testing-sandbox", {
        params: {
          userId: user?.id,
          type: typeFilter !== "all" ? typeFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        },
      });

      if (response.data && Array.isArray(response.data)) {
        setSandboxes(response.data);
      } else {
        setSandboxes([]);
      }
    } catch (error) {
      console.error("Failed to load sandboxes:", error);
      setSandboxes([]);
    } finally {
      setLoading(false);
    }
  };

  const createSandbox = async () => {
    try {
      const response = await api.post("/testing-sandbox", newSandbox);
      if (response.data) {
        setSandboxes([response.data, ...sandboxes]);
        setShowCreateDialog(false);
        setNewSandbox({
          name: "",
          description: "",
          type: "agent",
          resourceLimits: {
            memory: "512m",
            cpu: "0.5",
            timeout: 300000,
            networkAccess: true,
            allowedPorts: [80, 443, 3000, 8080],
          },
          configuration: {},
          environment: {},
        });
      }
    } catch (error) {
      console.error("Failed to create sandbox:", error);
    }
  };

  const deleteSandbox = async (sandboxId: string) => {
    if (!confirm("Are you sure you want to delete this sandbox?")) return;

    try {
      await api.delete(`/testing-sandbox/${sandboxId}`);
      setSandboxes(sandboxes.filter((sandbox) => sandbox.id !== sandboxId));
    } catch (error) {
      console.error("Failed to delete sandbox:", error);
    }
  };

  const cleanupSandbox = async (sandboxId: string) => {
    try {
      await api.post(`/testing-sandbox/${sandboxId}/cleanup`);
      await loadSandboxes(); // Refresh the list
    } catch (error) {
      console.error("Failed to cleanup sandbox:", error);
    }
  };

  const loadAnalytics = async (sandboxId: string) => {
    setLoadingAnalytics(true);
    try {
      const response = await api.get(
        `/testing-sandbox/${sandboxId}/analytics`,
        {
          params: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
          },
        },
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadResourceUsage = async (sandboxId: string) => {
    setLoadingResourceUsage(true);
    try {
      const response = await api.get(`/testing-sandbox/${sandboxId}/resources`);
      setResourceUsage(response.data);
    } catch (error) {
      console.error("Failed to load resource usage:", error);
    } finally {
      setLoadingResourceUsage(false);
    }
  };

  const openSandboxDetails = (sandbox: TestingSandbox) => {
    setSelectedSandbox(sandbox);
    setShowDetailsDialog(true);
    loadAnalytics(sandbox.id);
    loadResourceUsage(sandbox.id);
  };

  const filteredSandboxes = sandboxes.filter((sandbox) => {
    const matchesSearch =
      !searchQuery ||
      sandbox.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sandbox.description &&
        sandbox.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === "all" || sandbox.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || sandbox.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "initializing":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cleaned":
        return "bg-gray-100 text-gray-600";
      case "deleted":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "agent":
        return <Users className="h-4 w-4" />;
      case "tool":
        return <Zap className="h-4 w-4" />;
      case "workflow":
        return <Workflow className="h-4 w-4" />;
      case "integration":
        return <Activity className="h-4 w-4" />;
      default:
        return <Container className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-8 bg-background">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Testing Sandboxes</h1>
          <p className="text-muted-foreground">
            Manage isolated testing environments for your agents, tools, and
            workflows
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Sandbox
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
                  placeholder="Search sandboxes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="agent">Agent Testing</SelectItem>
                <SelectItem value="tool">Tool Testing</SelectItem>
                <SelectItem value="workflow">Workflow Testing</SelectItem>
                <SelectItem value="integration">Integration Testing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="initializing">Initializing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cleaned">Cleaned</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadSandboxes}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sandboxes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSandboxes.map((sandbox) => (
            <Card
              key={sandbox.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-muted-foreground">
                      {getTypeIcon(sandbox.type)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{sandbox.name}</CardTitle>
                      <CardDescription className="text-sm line-clamp-2">
                        {sandbox.description || "No description provided"}
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
                      <DropdownMenuItem
                        onClick={() => openSandboxDetails(sandbox)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => cleanupSandbox(sandbox.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Cleanup
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteSandbox(sandbox.id)}
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
                      className={cn("text-xs", getStatusColor(sandbox.status))}
                    >
                      {sandbox.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {sandbox.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <TestTube className="h-3 w-3" />
                      {sandbox.testExecutions?.length || 0} tests
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {sandbox.testScenarios?.length || 0} scenarios
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {sandbox.mockData?.length || 0} mock data
                    </div>
                    <div className="flex items-center gap-1">
                      <Bug className="h-3 w-3" />
                      {sandbox.debugSessions?.length || 0} debug
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Container className="h-3 w-3" />
                      Memory: {sandbox.resourceLimits.memory} | CPU:{" "}
                      {sandbox.resourceLimits.cpu}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openSandboxDetails(sandbox)}
                    >
                      <BarChart3 className="mr-1 h-3 w-3" />
                      Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredSandboxes.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Container className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Sandboxes Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || typeFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search criteria or filters."
              : "Create your first testing sandbox to get started."}
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Sandbox
          </Button>
        </div>
      )}

      {/* Create Sandbox Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Testing Sandbox</DialogTitle>
            <DialogDescription>
              Create a new isolated environment for testing your agents, tools,
              or workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newSandbox.name}
                  onChange={(e) =>
                    setNewSandbox({ ...newSandbox, name: e.target.value })
                  }
                  placeholder="Enter sandbox name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={newSandbox.type}
                  onValueChange={(value) =>
                    setNewSandbox({ ...newSandbox, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent Testing</SelectItem>
                    <SelectItem value="tool">Tool Testing</SelectItem>
                    <SelectItem value="workflow">Workflow Testing</SelectItem>
                    <SelectItem value="integration">
                      Integration Testing
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newSandbox.description}
                onChange={(e) =>
                  setNewSandbox({ ...newSandbox, description: e.target.value })
                }
                placeholder="Enter description (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Memory Limit</label>
                <Select
                  value={newSandbox.resourceLimits.memory}
                  onValueChange={(value) =>
                    setNewSandbox({
                      ...newSandbox,
                      resourceLimits: {
                        ...newSandbox.resourceLimits,
                        memory: value,
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="256m">256MB</SelectItem>
                    <SelectItem value="512m">512MB</SelectItem>
                    <SelectItem value="1g">1GB</SelectItem>
                    <SelectItem value="2g">2GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">CPU Limit</label>
                <Select
                  value={newSandbox.resourceLimits.cpu}
                  onValueChange={(value) =>
                    setNewSandbox({
                      ...newSandbox,
                      resourceLimits: {
                        ...newSandbox.resourceLimits,
                        cpu: value,
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.25">0.25 CPU</SelectItem>
                    <SelectItem value="0.5">0.5 CPU</SelectItem>
                    <SelectItem value="1">1 CPU</SelectItem>
                    <SelectItem value="2">2 CPU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={createSandbox} disabled={!newSandbox.name}>
                Create Sandbox
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sandbox Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSandbox && getTypeIcon(selectedSandbox.type)}
              {selectedSandbox?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedSandbox?.description || "No description provided"}
            </DialogDescription>
          </DialogHeader>

          {selectedSandbox && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="executions">Executions</TabsTrigger>
                <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                <TabsTrigger value="mockdata">Mock Data</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <strong>Type:</strong> {selectedSandbox.type}
                      </div>
                      <div>
                        <strong>Status:</strong>
                        <Badge
                          className={cn(
                            "ml-2 text-xs",
                            getStatusColor(selectedSandbox.status),
                          )}
                        >
                          {selectedSandbox.status}
                        </Badge>
                      </div>
                      <div>
                        <strong>Memory Limit:</strong>{" "}
                        {selectedSandbox.resourceLimits.memory}
                      </div>
                      <div>
                        <strong>CPU Limit:</strong>{" "}
                        {selectedSandbox.resourceLimits.cpu}
                      </div>
                      <div>
                        <strong>Network Access:</strong>{" "}
                        {selectedSandbox.resourceLimits.networkAccess
                          ? "Enabled"
                          : "Disabled"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Resource Usage</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {loadingResourceUsage ? (
                        <LoadingSpinner className="h-4 w-4" />
                      ) : resourceUsage ? (
                        <>
                          <div>
                            <strong>CPU Usage:</strong>{" "}
                            {resourceUsage.cpu.toFixed(1)}%
                          </div>
                          <div>
                            <strong>Memory Usage:</strong>{" "}
                            {resourceUsage.memory.toFixed(1)}%
                          </div>
                          <div>
                            <strong>Network I/O:</strong>{" "}
                            {resourceUsage.network.toFixed(1)} KB/s
                          </div>
                          <div>
                            <strong>Disk Usage:</strong>{" "}
                            {resourceUsage.disk.toFixed(1)} MB
                          </div>
                        </>
                      ) : (
                        <div className="text-muted-foreground">
                          No resource data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {selectedSandbox.containerInfo && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Container Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <strong>Container ID:</strong>{" "}
                        {selectedSandbox.containerInfo.containerId.substring(
                          0,
                          12,
                        )}
                        ...
                      </div>
                      <div>
                        <strong>Container Status:</strong>{" "}
                        {selectedSandbox.containerInfo.status}
                      </div>
                      <div>
                        <strong>Created:</strong>{" "}
                        {new Date(
                          selectedSandbox.containerInfo.createdAt,
                        ).toLocaleString()}
                      </div>
                      {selectedSandbox.containerInfo.ports && (
                        <div>
                          <strong>Exposed Ports:</strong>{" "}
                          {selectedSandbox.containerInfo.ports.join(", ")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="executions" className="space-y-4">
                <div className="space-y-2">
                  {selectedSandbox.testExecutions &&
                  selectedSandbox.testExecutions.length > 0 ? (
                    selectedSandbox.testExecutions.map((execution) => (
                      <Card key={execution.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {execution.testType} Test
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Started:{" "}
                                {execution.startedAt
                                  ? new Date(
                                      execution.startedAt,
                                    ).toLocaleString()
                                  : "N/A"}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                className={cn(
                                  "text-xs",
                                  execution.status === "COMPLETED"
                                    ? "bg-green-100 text-green-800"
                                    : execution.status === "FAILED"
                                      ? "bg-red-100 text-red-800"
                                      : execution.status === "RUNNING"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-gray-100 text-gray-600",
                                )}
                              >
                                {execution.status}
                              </Badge>
                              {execution.metrics && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {execution.metrics.executionTime}ms
                                </div>
                              )}
                            </div>
                          </div>
                          {execution.error && (
                            <div className="mt-2 p-2 bg-red-50 text-red-800 rounded text-xs">
                              {execution.error}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No test executions found
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="scenarios" className="space-y-4">
                <div className="space-y-2">
                  {selectedSandbox.testScenarios &&
                  selectedSandbox.testScenarios.length > 0 ? (
                    selectedSandbox.testScenarios.map((scenario) => (
                      <Card key={scenario.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{scenario.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {scenario.description || "No description"}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                className={cn(
                                  "text-xs",
                                  getStatusColor(scenario.status),
                                )}
                              >
                                {scenario.status}
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {scenario.steps.length} steps
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No test scenarios found
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="mockdata" className="space-y-4">
                <div className="space-y-2">
                  {selectedSandbox.mockData &&
                  selectedSandbox.mockData.length > 0 ? (
                    selectedSandbox.mockData.map((mockData) => (
                      <Card key={mockData.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{mockData.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {mockData.description || "No description"}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-xs">
                                {mockData.dataType}
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {mockData.rules?.length || 0} rules
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No mock data found
                    </div>
                  )}
                </div>
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
                            Test Statistics
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div>
                            <strong>Total Tests:</strong>{" "}
                            {analytics.totalTests || 0}
                          </div>
                          <div>
                            <strong>Success Rate:</strong>{" "}
                            {((analytics.successRate || 0) * 100).toFixed(1)}%
                          </div>
                          <div>
                            <strong>Avg Execution Time:</strong>{" "}
                            {(analytics.averageExecutionTime || 0).toFixed(0)}ms
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">
                            Resource Analytics
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {analytics.resourceUsage ? (
                            <>
                              <div>
                                <strong>Avg CPU:</strong>{" "}
                                {analytics.resourceUsage.cpu.toFixed(1)}%
                              </div>
                              <div>
                                <strong>Avg Memory:</strong>{" "}
                                {analytics.resourceUsage.memory.toFixed(1)}%
                              </div>
                              <div>
                                <strong>Network:</strong>{" "}
                                {analytics.resourceUsage.network.toFixed(1)}{" "}
                                KB/s
                              </div>
                            </>
                          ) : (
                            <div className="text-muted-foreground">
                              No resource analytics available
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {analytics.testsByType && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">
                            Tests by Type
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {Object.entries(analytics.testsByType).map(
                              ([type, count]) => (
                                <div
                                  key={type}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="capitalize">{type}:</span>
                                  <span>{count as number}</span>
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
                    No analytics data available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
