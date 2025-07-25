"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Square,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {apiClient} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/lib/websocket";
import { useToast } from "@/components/ui/use-toast";

interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  version: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  definition: {
    nodes: any[];
    edges: any[];
    variables: Record<string, any>;
    settings: {
      timeout: number;
      retryAttempts: number;
      errorHandling: "stop" | "continue" | "retry";
      notifications: boolean;
    };
  };
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status:
    | "PENDING"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED"
    | "PAUSED";
  currentStep?: string;
  completedSteps: string[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { subscribe } = useWebSocket();
  const { toast } = useToast();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<
    Record<string, WorkflowExecution[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null,
  );
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [executionInput, setExecutionInput] = useState("{}");
  const [executionVariables, setExecutionVariables] = useState("{}");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    loadWorkflows();

    // Subscribe to workflow execution updates
    const unsubscribeExecution = subscribe(
      "workflow_execution_update",
      (data) => {
        handleExecutionUpdate(data);
      },
    );

    const unsubscribeWorkflow = subscribe("workflow_updated", (data) => {
      handleWorkflowUpdate(data);
    });

    return () => {
      unsubscribeExecution();
      unsubscribeWorkflow();
    };
  }, [isAuthenticated, subscribe]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/workflows");
      if (response.data.success) {
        setWorkflows(response.data.data.data || []);

        // Load recent executions for each workflow
        const executionPromises = response.data.data.data.map(
          async (workflow: Workflow) => {
            try {
              const execResponse = await apiClient.get(
                `/workflows/${workflow.id}/executions?limit=5`,
              );
              return {
                workflowId: workflow.id,
                executions: execResponse.data.data?.data || [],
              };
            } catch (error) {
              return { workflowId: workflow.id, executions: [] };
            }
          },
        );

        const executionResults = await Promise.all(executionPromises);
        const executionMap: Record<string, WorkflowExecution[]> = {};
        executionResults.forEach(({ workflowId, executions }) => {
          executionMap[workflowId] = executions;
        });
        setExecutions(executionMap);
      }
    } catch (error) {
      console.error("Failed to load workflows:", error);
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecutionUpdate = (data: any) => {
    const {
      workflowId,
      executionId,
      status,
      currentStep,
      progress,
      output,
      error,
    } = data;

    setExecutions((prev) => {
      const workflowExecutions = prev[workflowId] || [];
      const existingIndex = workflowExecutions.findIndex(
        (exec) => exec.id === executionId,
      );

      if (existingIndex >= 0) {
        const updated = [...workflowExecutions];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status,
          currentStep,
          ...(status === "COMPLETED" && {
            completedAt: new Date().toISOString(),
          }),
          ...(error && { error }),
        };
        return { ...prev, [workflowId]: updated };
      } else {
        // New execution
        const newExecution: WorkflowExecution = {
          id: executionId,
          workflowId,
          status,
          currentStep,
          completedSteps: [],
          createdAt: new Date().toISOString(),
          ...(status === "COMPLETED" && {
            completedAt: new Date().toISOString(),
          }),
          ...(error && { error }),
        };
        return {
          ...prev,
          [workflowId]: [newExecution, ...workflowExecutions.slice(0, 4)],
        };
      }
    });

    // Show toast for status changes
    if (status === "COMPLETED") {
      toast({
        title: "Workflow Completed",
        description: `Workflow execution completed successfully`,
      });
    } else if (status === "FAILED") {
      toast({
        title: "Workflow Failed",
        description: error || "Workflow execution failed",
        variant: "destructive",
      });
    }
  };

  const handleWorkflowUpdate = (data: any) => {
    const { workflow } = data;
    setWorkflows((prev) =>
      prev.map((w) => (w.id === workflow.id ? { ...w, ...workflow } : w)),
    );
  };

  const executeWorkflow = async (workflow: Workflow) => {
    try {
      let input: Record<string, any> = {};
      let variables: Record<string, any> = {};

      try {
        input = JSON.parse(executionInput);
      } catch (error) {
        toast({
          title: "Invalid Input",
          description: "Please provide valid JSON input",
          variant: "destructive",
        });
        return;
      }

      try {
        variables = JSON.parse(executionVariables);
      } catch (error) {
        toast({
          title: "Invalid Variables",
          description: "Please provide valid JSON variables",
          variant: "destructive",
        });
        return;
      }

      const response = await apiClient.post(`/workflows/${workflow.id}/execute`, {
        input,
        variables,
        notifyOnCompletion: true,
      });

      if (response.data.success) {
        toast({
          title: "Workflow Started",
          description: `Workflow "${workflow.name}" execution started`,
        });
        setShowExecuteDialog(false);
        setExecutionInput("{}");
        setExecutionVariables("{}");
      }
    } catch (error: any) {
      console.error("Failed to execute workflow:", error);
      toast({
        title: "Execution Failed",
        description:
          error.response?.data?.message || "Failed to start workflow execution",
        variant: "destructive",
      });
    }
  };

  const toggleWorkflowStatus = async (workflow: Workflow) => {
    try {
      const response = await apiClient.put(`/workflows/${workflow.id}`, {
        isActive: !workflow.isActive,
      });

      if (response.data.success) {
        setWorkflows((prev) =>
          prev.map((w) =>
            w.id === workflow.id ? { ...w, isActive: !w.isActive } : w,
          ),
        );
        toast({
          title: "Workflow Updated",
          description: `Workflow "${workflow.name}" ${!workflow.isActive ? "activated" : "deactivated"}`,
        });
      }
    } catch (error: any) {
      console.error("Failed to toggle workflow status:", error);
      toast({
        title: "Update Failed",
        description:
          error.response?.data?.message || "Failed to update workflow status",
        variant: "destructive",
      });
    }
  };

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && workflow.isActive) ||
      (statusFilter === "inactive" && !workflow.isActive);
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "RUNNING":
        return "secondary";
      case "FAILED":
        return "destructive";
      case "PAUSED":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
              <p className="text-gray-600 mt-2">
                Create and manage automated workflows
              </p>
            </div>
            <Button
              onClick={() => router.push("/workflows/create")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Workflow
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search workflows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workflows</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Workflows Grid */}
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No workflows found
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first workflow
            </p>
            <Button onClick={() => router.push("/workflows/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => {
              const recentExecutions = executions[workflow.id] || [];
              const lastExecution = recentExecutions[0];

              return (
                <Card
                  key={workflow.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {workflow.name}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {workflow.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={workflow.isActive ? "default" : "outline"}
                        >
                          {workflow.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Workflow Actions</DialogTitle>
                              <DialogDescription>
                                Manage {workflow.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  router.push(`/workflows/${workflow.id}/edit`)
                                }
                              >
                                Edit Workflow
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedWorkflow(workflow);
                                  setShowExecuteDialog(true);
                                }}
                                disabled={!workflow.isActive}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Execute
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => toggleWorkflowStatus(workflow)}
                              >
                                {workflow.isActive ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/workflows/${workflow.id}/analytics`,
                                  )
                                }
                              >
                                View Analytics
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Tags */}
                      {workflow.tags && workflow.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {workflow.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Workflow Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Steps:</span>
                          <span className="ml-2 font-medium">
                            {workflow.definition.nodes.length}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Version:</span>
                          <span className="ml-2 font-medium">
                            {workflow.version}
                          </span>
                        </div>
                      </div>

                      {/* Last Execution */}
                      {lastExecution && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                              Last execution:
                            </span>
                            <Badge
                              variant={getStatusBadgeVariant(
                                lastExecution.status,
                              )}
                            >
                              {lastExecution.status}
                            </Badge>
                          </div>
                          {lastExecution.currentStep && (
                            <div className="text-xs text-gray-500 mt-1">
                              Current: {lastExecution.currentStep}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            router.push(`/workflows/${workflow.id}/edit`)
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedWorkflow(workflow);
                            setShowExecuteDialog(true);
                          }}
                          disabled={!workflow.isActive}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Execute Workflow Dialog */}
      <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Execute Workflow</DialogTitle>
            <DialogDescription>
              Configure input data and variables for {selectedWorkflow?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Input Data (JSON)
              </label>
              <textarea
                className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                value={executionInput}
                onChange={(e) => setExecutionInput(e.target.value)}
                placeholder='{"key": "value"}'
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Variables (JSON)
              </label>
              <textarea
                className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                value={executionVariables}
                onChange={(e) => setExecutionVariables(e.target.value)}
                placeholder='{"variable": "value"}'
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExecuteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  selectedWorkflow && executeWorkflow(selectedWorkflow);
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Execute
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
