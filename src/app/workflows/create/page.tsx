"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Play,
  Settings,
  Zap,
  Users,
  GitBranch,
  Clock,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useWebSocket } from "@/lib/websocket";
import WorkflowCanvas from "@/components/workflow-builder/WorkflowCanvas";
import WorkflowPropertiesPanel from "@/components/workflow-builder/WorkflowPropertiesPanel";
import WorkflowComponentPalette from "@/components/workflow-builder/WorkflowComponentPalette";

interface WorkflowNode {
  id: string;
  type: "agent" | "tool" | "condition" | "loop" | "hitl" | "start" | "end";
  position: { x: number; y: number };
  data: Record<string, any>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, any>;
  settings: {
    timeout: number;
    retryAttempts: number;
    errorHandling: "stop" | "continue" | "retry";
    notifications: boolean;
  };
}

export default function CreateWorkflowPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { subscribe, isConnected } = useWebSocket();

  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [workflowTags, setWorkflowTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testInput, setTestInput] = useState("{}");
  const [testVariables, setTestVariables] = useState("{}");
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [workflowDefinition, setWorkflowDefinition] =
    useState<WorkflowDefinition>({
      nodes: [
        {
          id: "start-1",
          type: "start",
          position: { x: 100, y: 100 },
          data: { label: "Start" },
        },
      ],
      edges: [],
      variables: {},
      settings: {
        timeout: 300000, // 5 minutes
        retryAttempts: 3,
        errorHandling: "stop",
        notifications: true,
      },
    });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    // Subscribe to workflow execution updates for real-time testing
    const unsubscribe = subscribe("workflow_execution_update", (data) => {
      if (data.executionId && isTesting) {
        // Update test progress in real-time
        console.log("Workflow execution update:", data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, subscribe, isTesting]);

  const handleNodeSelect = (node: WorkflowNode | null) => {
    setSelectedNode(node);
  };

  const handleNodeUpdate = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflowDefinition((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node,
      ),
    }));
  };

  const handleNodeAdd = (
    nodeType: WorkflowNode["type"],
    position: { x: number; y: number },
  ) => {
    const newNode: WorkflowNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position,
      data: getDefaultNodeData(nodeType),
    };

    setWorkflowDefinition((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
  };

  // Listen for drag and drop events from canvas
  useEffect(() => {
    const handleAddNodeEvent = (e: CustomEvent) => {
      const { nodeType, position } = e.detail;
      handleNodeAdd(nodeType, position);
    };

    window.addEventListener("addNode", handleAddNodeEvent as EventListener);
    return () => {
      window.removeEventListener(
        "addNode",
        handleAddNodeEvent as EventListener,
      );
    };
  }, []);

  const handleNodeDelete = (nodeId: string) => {
    setWorkflowDefinition((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((node) => node.id !== nodeId),
      edges: prev.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
    }));

    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const handleEdgeAdd = (edge: WorkflowEdge) => {
    setWorkflowDefinition((prev) => ({
      ...prev,
      edges: [...prev.edges, edge],
    }));
  };

  const handleEdgeDelete = (edgeId: string) => {
    setWorkflowDefinition((prev) => ({
      ...prev,
      edges: prev.edges.filter((edge) => edge.id !== edgeId),
    }));
  };

  const handleVariablesUpdate = (variables: Record<string, any>) => {
    setWorkflowDefinition((prev) => ({
      ...prev,
      variables,
    }));
  };

  const handleSettingsUpdate = (settings: WorkflowDefinition["settings"]) => {
    setWorkflowDefinition((prev) => ({
      ...prev,
      settings,
    }));
  };

  const getDefaultNodeData = (
    nodeType: WorkflowNode["type"],
  ): Record<string, any> => {
    switch (nodeType) {
      case "start":
        return { label: "Start" };
      case "end":
        return { label: "End" };
      case "agent":
        return {
          label: "Agent Step",
          agentId: "",
          inputMapping: {},
          outputMapping: {},
        };
      case "tool":
        return {
          label: "Tool Step",
          toolId: "",
          functionName: "execute",
          parameterMapping: {},
          outputMapping: {},
          timeout: 30000,
        };
      case "condition":
        return {
          label: "Condition",
          condition: "",
        };
      case "loop":
        return {
          label: "Loop",
          loop: {
            type: "forEach",
            items: "",
            itemVariable: "item",
            indexVariable: "index",
            maxIterations: 100,
            bodyStepId: "",
          },
        };
      case "hitl":
        return {
          label: "Human Approval",
          hitl: {
            type: "approval",
            title: "Approval Required",
            description: "Please review and approve this step",
            assignees: [],
            timeout: 86400000, // 24 hours
            priority: "medium",
          },
        };
      default:
        return { label: "Unknown" };
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !workflowTags.includes(tagInput.trim())) {
      setWorkflowTags([...workflowTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setWorkflowTags(workflowTags.filter((tag) => tag !== tagToRemove));
  };

  const validateWorkflow = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!workflowName.trim()) {
      errors.push("Workflow name is required");
    }

    if (!workflowDescription.trim()) {
      errors.push("Workflow description is required");
    }

    const hasStartNode = workflowDefinition.nodes.some(
      (node) => node.type === "start",
    );
    if (!hasStartNode) {
      errors.push("Workflow must have a start node");
    }

    const hasEndNode = workflowDefinition.nodes.some(
      (node) => node.type === "end",
    );
    if (!hasEndNode) {
      errors.push("Workflow must have an end node");
    }

    // Check for disconnected nodes (except start and end)
    const connectedNodes = new Set<string>();
    workflowDefinition.edges.forEach((edge) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const disconnectedNodes = workflowDefinition.nodes.filter(
      (node) =>
        node.type !== "start" &&
        node.type !== "end" &&
        !connectedNodes.has(node.id),
    );

    if (disconnectedNodes.length > 0) {
      errors.push(
        `Disconnected nodes found: ${disconnectedNodes.map((n) => n.data.label).join(", ")}`,
      );
    }

    return { isValid: errors.length === 0, errors };
  };

  const testWorkflow = async () => {
    try {
      setIsTesting(true);

      let input: Record<string, any> = {};
      let variables: Record<string, any> = {};

      try {
        input = JSON.parse(testInput);
      } catch (error) {
        toast({
          title: "Invalid Input",
          description: "Please provide valid JSON input",
          variant: "destructive",
        });
        return;
      }

      try {
        variables = JSON.parse(testVariables);
      } catch (error) {
        toast({
          title: "Invalid Variables",
          description: "Please provide valid JSON variables",
          variant: "destructive",
        });
        return;
      }

      // Validate workflow structure before testing
      const validation = validateWorkflow();
      if (!validation.isValid) {
        setTestResult({
          success: false,
          message: "Workflow validation failed",
          details: { errors: validation.errors },
        });
        toast({
          title: "Validation Failed",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }

      // Test the workflow directly without creating it
      const testResponse = await apiClient.post("/workflows/test", {
        definition: workflowDefinition,
        input,
        variables,
        settings: workflowDefinition.settings,
        organizationId: user?.organizationId,
        userId: user?.id,
      });

      if (testResponse.data.success) {
        const executionData = testResponse.data.data;
        setTestResult({
          success: true,
          message: "Workflow test completed successfully",
          details: {
            executionId: executionData.executionId,
            status: executionData.status,
            output: executionData.output,
            executionTime: executionData.executionTimeMs,
            cost: executionData.cost,
            stepResults: executionData.stepResults,
            performanceMetrics: executionData.performanceMetrics,
          },
        });
        toast({
          title: "Test Passed",
          description: `Workflow executed in ${executionData.executionTimeMs}ms`,
        });
      } else {
        throw new Error(testResponse.data.message || "Test failed");
      }
    } catch (error: any) {
      console.error("Workflow test failed:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Workflow test failed";
      const errorDetails =
        error.response?.data?.details || error.response?.data || {};

      setTestResult({
        success: false,
        message: errorMessage,
        details: errorDetails,
      });
      toast({
        title: "Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveWorkflow = async () => {
    const validation = validateWorkflow();
    if (!validation.isValid) {
      toast({
        title: "Validation Failed",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const workflowData = {
        name: workflowName.trim(),
        description: workflowDescription.trim(),
        definition: {
          ...workflowDefinition,
          version: "1.0.0",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        tags: workflowTags,
        isActive: true,
        organizationId: user?.organizationId,
        userId: user?.id,
        metadata: {
          nodeCount: workflowDefinition.nodes.length,
          edgeCount: workflowDefinition.edges.length,
          hasAgentNodes: workflowDefinition.nodes.some(
            (n) => n.type === "agent",
          ),
          hasToolNodes: workflowDefinition.nodes.some((n) => n.type === "tool"),
          hasHitlNodes: workflowDefinition.nodes.some((n) => n.type === "hitl"),
          complexity: calculateWorkflowComplexity(workflowDefinition),
        },
      };

      const response = await apiClient    .post("/workflows", workflowData, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.data.success) {
        const createdWorkflow = response.data.data;
        toast({
          title: "Workflow Created",
          description: `Workflow "${workflowName}" has been created successfully with ID: ${createdWorkflow.id}`,
        });

        // Store the workflow ID for potential future use
        localStorage.setItem("lastCreatedWorkflowId", createdWorkflow.id);

        router.push(`/workflows/${createdWorkflow.id}`);
      } else {
        throw new Error(response.data.message || "Failed to create workflow");
      }
    } catch (error: any) {
      console.error("Failed to save workflow:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to save workflow";
      const errorCode = error.response?.status || "UNKNOWN";

      toast({
        title: "Save Failed",
        description: `${errorMessage} (Error: ${errorCode})`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateWorkflowComplexity = (
    definition: WorkflowDefinition,
  ): "simple" | "medium" | "complex" => {
    const nodeCount = definition.nodes.length;
    const edgeCount = definition.edges.length;
    const hasConditions = definition.nodes.some((n) => n.type === "condition");
    const hasLoops = definition.nodes.some((n) => n.type === "loop");

    if (nodeCount <= 3 && !hasConditions && !hasLoops) return "simple";
    if (nodeCount <= 10 && (hasConditions || hasLoops)) return "medium";
    return "complex";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/workflows")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {workflowName || "New Workflow"}
                </h1>
                <p className="text-sm text-gray-500">Visual workflow builder</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTestDialog(true)}
                disabled={workflowDefinition.nodes.length <= 1 || !isConnected}
              >
                <Play className="h-4 w-4 mr-2" />
                Test
              </Button>
              <Button
                onClick={saveWorkflow}
                disabled={isSaving || !workflowName.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Workflow"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Component Palette */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <Tabs defaultValue="components" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="components" className="flex-1 p-4">
              <WorkflowComponentPalette onNodeAdd={handleNodeAdd} />
            </TabsContent>

            <TabsContent value="properties" className="flex-1 p-4">
              <WorkflowPropertiesPanel
                selectedNode={selectedNode}
                onNodeUpdate={handleNodeUpdate}
                variables={workflowDefinition.variables}
                onVariablesUpdate={handleVariablesUpdate}
              />
            </TabsContent>

            <TabsContent value="settings" className="flex-1 p-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Basic Information</h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Name
                    </label>
                    <Input
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      placeholder="Enter workflow name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      className="w-full h-20 p-3 border rounded-md text-sm"
                      value={workflowDescription}
                      onChange={(e) => setWorkflowDescription(e.target.value)}
                      placeholder="Describe what this workflow does"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tags
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add tag"
                        onKeyPress={(e) => e.key === "Enter" && addTag()}
                      />
                      <Button size="sm" onClick={addTag}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {workflowTags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Execution Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Execution Settings</h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Timeout (ms)
                    </label>
                    <Input
                      type="number"
                      value={workflowDefinition.settings.timeout}
                      onChange={(e) =>
                        handleSettingsUpdate({
                          ...workflowDefinition.settings,
                          timeout: parseInt(e.target.value) || 300000,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Retry Attempts
                    </label>
                    <Input
                      type="number"
                      value={workflowDefinition.settings.retryAttempts}
                      onChange={(e) =>
                        handleSettingsUpdate({
                          ...workflowDefinition.settings,
                          retryAttempts: parseInt(e.target.value) || 3,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Error Handling
                    </label>
                    <Select
                      value={workflowDefinition.settings.errorHandling}
                      onValueChange={(value: "stop" | "continue" | "retry") =>
                        handleSettingsUpdate({
                          ...workflowDefinition.settings,
                          errorHandling: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stop">Stop on Error</SelectItem>
                        <SelectItem value="continue">
                          Continue on Error
                        </SelectItem>
                        <SelectItem value="retry">Retry on Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Canvas */}
        <div className="flex-1">
          <WorkflowCanvas
            nodes={workflowDefinition.nodes}
            edges={workflowDefinition.edges}
            onNodeSelect={handleNodeSelect}
            onNodeUpdate={handleNodeUpdate}
            onNodeDelete={handleNodeDelete}
            onEdgeAdd={handleEdgeAdd}
            onEdgeDelete={handleEdgeDelete}
            selectedNode={selectedNode}
            onNodeAdd={handleNodeAdd}
          />
        </div>
      </div>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Workflow</DialogTitle>
            <DialogDescription>
              Validate your workflow structure and test with sample data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Test Input (JSON)
              </label>
              <textarea
                className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder='{"key": "value"}'
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Test Variables (JSON)
              </label>
              <textarea
                className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                value={testVariables}
                onChange={(e) => setTestVariables(e.target.value)}
                placeholder='{"variable": "value"}'
              />
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-md ${testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
              >
                <h4
                  className={`font-medium ${testResult.success ? "text-green-800" : "text-red-800"}`}
                >
                  {testResult.success
                    ? "Validation Passed"
                    : "Validation Failed"}
                </h4>
                <p
                  className={`text-sm mt-1 ${testResult.success ? "text-green-700" : "text-red-700"}`}
                >
                  {testResult.message}
                </p>
                {testResult.details && (
                  <pre
                    className={`text-xs mt-2 ${testResult.success ? "text-green-600" : "text-red-600"}`}
                  >
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTestDialog(false)}
              >
                Close
              </Button>
              <Button onClick={testWorkflow} disabled={isTesting}>
                {isTesting ? "Testing..." : "Test Workflow"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
