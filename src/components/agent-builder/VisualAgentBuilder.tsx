"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  NodeTypes,
  Position,
  MarkerType,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Play,
  Save,
  Settings,
  Bot,
  Wrench,
  Database,
  MessageSquare,
  Zap,
  GitBranch,
  Plus,
  Trash2,
  Copy,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AgentConfiguration } from "@/lib/ai-assistant";
import { useAgentBuilder } from "@/hooks/useAgentBuilder";
import { api } from "@/lib/api";
import { useAgentBuilderStore } from "@/store/agentBuilderStore";
import { usePromptTemplates } from "@/hooks/usePromptTemplates";
import { PromptTemplateManager } from "@/components/prompt-templates/PromptTemplateManager";
import { PromptTemplate } from "@/lib/prompt-template-api";
import { AgentAPI, Agent } from "@/lib/agent-api";
import { getToken } from "@/lib/auth";

interface VisualAgentBuilderProps {
  onConfigurationUpdate: (config: Partial<AgentConfiguration>) => void;
  currentConfiguration: Partial<AgentConfiguration>;
}

interface AgentNode {
  id: string;
  type: "agent" | "tool" | "knowledge" | "trigger" | "condition" | "output";
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, any>;
    status?: "idle" | "running" | "success" | "error";
    metrics?: {
      executionTime?: number;
      cost?: number;
      tokensUsed?: number;
    };
    nodeType?: string;
    onDelete?: (id: string) => void;
    onUpdate?: (id: string, config: Record<string, any>) => void;
  };
}

interface AgentEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
  data?: {
    condition?: string;
    weight?: number;
  };
}

interface Tool {
  id: string;
  name: string;
  description?: string;
  type: string;
  configuration: Record<string, any>;
}

interface KnowledgeDocument {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
}

const CustomNode = ({
  data,
  selected,
  id,
}: {
  data: any;
  selected: boolean;
  id: string;
}) => {
  const getNodeColor = (nodeType: string) => {
    switch (nodeType) {
      case "agent":
        return "bg-blue-100 border-blue-500 text-blue-800";
      case "tool":
        return "bg-purple-100 border-purple-500 text-purple-800";
      case "knowledge":
        return "bg-green-100 border-green-500 text-green-800";
      case "trigger":
        return "bg-yellow-100 border-yellow-500 text-yellow-800";
      case "condition":
        return "bg-orange-100 border-orange-500 text-orange-800";
      case "output":
        return "bg-gray-100 border-gray-500 text-gray-800";
      default:
        return "bg-gray-100 border-gray-500 text-gray-800";
    }
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case "agent":
        return <Bot className="h-4 w-4" />;
      case "tool":
        return <Wrench className="h-4 w-4" />;
      case "knowledge":
        return <Database className="h-4 w-4" />;
      case "trigger":
        return <Zap className="h-4 w-4" />;
      case "condition":
        return <GitBranch className="h-4 w-4" />;
      case "output":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "success":
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`px-4 py-3 shadow-md rounded-lg border-2 min-w-[200px] max-w-[280px] ${getNodeColor(
        data.nodeType,
      )} ${
        selected ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-lg"
      } transition-all duration-200`}
    >
      <div className="flex items-center gap-2 mb-2">
        {getNodeIcon(data.nodeType)}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{data.label}</div>
          <Badge variant="outline" className="text-xs mt-1">
            {data.nodeType}
          </Badge>
        </div>
        {data.status && (
          <div className="flex items-center gap-1">
            {getStatusIcon(data.status)}
          </div>
        )}
      </div>

      {data.config?.promptTemplateId && (
        <div className="text-xs text-gray-600 mb-2">
          Template:{" "}
          {data.config.promptTemplateName || data.config.promptTemplateId}
        </div>
      )}

      {data.metrics && (
        <div className="text-xs text-gray-600 space-y-1">
          {data.metrics.executionTime && (
            <div>Time: {data.metrics.executionTime}ms</div>
          )}
          {data.metrics.cost && (
            <div>Cost: ${data.metrics.cost.toFixed(4)}</div>
          )}
          {data.metrics.tokensUsed && (
            <div>Tokens: {data.metrics.tokensUsed}</div>
          )}
        </div>
      )}

      {selected && (
        <div className="flex gap-1 mt-2">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Settings className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Copy className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

function VisualAgentBuilderInner({
  onConfigurationUpdate,
  currentConfiguration,
}: VisualAgentBuilderProps) {
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const { executeAgent, testAgent, createAgent, updateAgent } =
    useAgentBuilder();
  const { currentAgent, updateAgentConfiguration } = useAgentBuilderStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<AgentNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AgentEdge>([]);
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<Record<string, any>>(
    {},
  );
  const [testInput, setTestInput] = useState("");
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [availableKnowledge, setAvailableKnowledge] = useState<
    KnowledgeDocument[]
  >([]);
  const [showPromptTemplates, setShowPromptTemplates] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [savedAgents, setSavedAgents] = useState<Agent[]>([]);
  const [workflowExecutionLog, setWorkflowExecutionLog] = useState<string[]>(
    [],
  );

  const {
    templates: promptTemplates,
    renderTemplate,
    loading: templatesLoading,
  } = usePromptTemplates();

  // Load available resources from backend
  const loadAvailableResources = useCallback(async () => {
    setLoadingResources(true);
    try {
      const token = await getToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const [toolsResponse, knowledgeResponse, agentsResponse] =
        await Promise.all([
          fetch("/api/tools", { headers }),
          fetch("/api/knowledge/documents", { headers }),
          fetch("/api/agents", { headers }),
        ]);

      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        setAvailableTools(toolsData.data || toolsData || []);
      }

      if (knowledgeResponse.ok) {
        const knowledgeData = await knowledgeResponse.json();
        setAvailableKnowledge(knowledgeData.data || knowledgeData || []);
      }

      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setSavedAgents(agentsData.data || agentsData || []);
      }
    } catch (error) {
      console.error("Failed to load resources:", error);
      toast({
        title: "Error",
        description: "Failed to load available resources",
        variant: "destructive",
      });
    } finally {
      setLoadingResources(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAvailableResources();
  }, [loadAvailableResources]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        const newEdge: AgentEdge = {
          id: `edge-${params.source}-${params.target}-${Date.now()}`,
          source: params.source,
          target: params.target,
          type: "smoothstep",
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#6b7280",
          },
          style: {
            stroke: "#6b7280",
            strokeWidth: 2,
          },
        };
        setEdges((eds) => addEdge(newEdge, eds));
      }
    },
    [setEdges],
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const agentNode = nodes.find((n) => n.id === node.id);
      setSelectedNode(agentNode || null);
    },
    [nodes],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = useCallback(
    (nodeType: AgentNode["type"], position?: { x: number; y: number }) => {
      const id = `${nodeType}-${Date.now()}`;
      const newNode: AgentNode = {
        id,
        type: nodeType,
        position: position || {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
        },
        data: {
          label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node`,
          config: {},
          nodeType,
          onDelete: deleteNode,
          onUpdate: updateNodeConfig,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
    },
    [setNodes, setEdges, selectedNode],
  );

  const updateNodeConfig = useCallback(
    (nodeId: string, config: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: { ...node.data.config, ...config },
                },
              }
            : node,
        ),
      );

      // Update selected node if it's the one being updated
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) =>
          prev
            ? {
                ...prev,
                data: {
                  ...prev.data,
                  config: { ...prev.data.config, ...config },
                },
              }
            : null,
        );
      }
    },
    [setNodes, selectedNode],
  );

  const executeWorkflow = useCallback(async () => {
    if (!testInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter test input before executing",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    setExecutionResults({});
    setWorkflowExecutionLog([]);

    try {
      // Update node statuses to running
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, status: "running" },
        })),
      );

      // Execute nodes in topological order
      const sortedNodes = topologicalSort(nodes, edges);
      const results: Record<string, any> = {};
      const log: string[] = [];

      log.push(`Starting workflow execution with ${sortedNodes.length} nodes`);
      setWorkflowExecutionLog([...log]);

      for (const node of sortedNodes) {
        try {
          log.push(`Executing ${node.type} node: ${node.data.label}`);
          setWorkflowExecutionLog([...log]);

          const result = await executeNode(node, results, testInput);
          results[node.id] = result;

          log.push(
            `✓ ${node.data.label} completed in ${result.metrics?.executionTime}ms`,
          );
          setWorkflowExecutionLog([...log]);

          // Update node status to success
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "success",
                      metrics: result.metrics,
                    },
                  }
                : n,
            ),
          );
        } catch (error: any) {
          log.push(`✗ ${node.data.label} failed: ${error.message}`);
          setWorkflowExecutionLog([...log]);

          // Update node status to error
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "error",
                    },
                  }
                : n,
            ),
          );
          throw error;
        }
      }

      setExecutionResults(results);
      log.push("Workflow execution completed successfully");
      setWorkflowExecutionLog([...log]);

      toast({
        title: "Execution Complete",
        description: "Workflow executed successfully",
      });
    } catch (error: any) {
      console.error("Workflow execution failed:", error);
      toast({
        title: "Execution Failed",
        description: error.message || "Workflow execution failed",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  }, [testInput, nodes, edges, setNodes, toast]);

  const executeNode = async (
    node: AgentNode,
    previousResults: Record<string, any>,
    input: string,
  ) => {
    const startTime = Date.now();

    switch (node.type) {
      case "agent":
        try {
          // If node has a saved agent ID, use it
          if (node.data.config.agentId) {
            const result = await executeAgent(node.data.config.agentId, input, {
              context: {
                previousResults,
                nodeConfig: node.data.config,
              },
            });

            return {
              output: result.output,
              metrics: {
                executionTime: Date.now() - startTime,
                cost: result.cost || 0,
                tokensUsed: result.tokensUsed || 0,
              },
            };
          } else {
            // Create temporary agent from node configuration
            const tempAgentData = {
              name: node.data.label,
              prompt:
                node.data.config.prompt || "You are a helpful AI assistant.",
              model: node.data.config.model || "gpt-4",
              temperature: node.data.config.temperature || 0.7,
              maxTokens: node.data.config.maxTokens || 2000,
              promptTemplateId: node.data.config.promptTemplateId,
            };

            const tempAgent = await createAgent(tempAgentData);
            const result = await executeAgent(tempAgent.id, input);

            return {
              output: result.output,
              metrics: {
                executionTime: Date.now() - startTime,
                cost: result.cost || 0,
                tokensUsed: result.tokensUsed || 0,
              },
            };
          }
        } catch (error: any) {
          throw new Error(`Agent execution failed: ${error.message}`);
        }

      case "tool":
        try {
          const toolId = node.data.config.toolId;
          if (!toolId) {
            throw new Error("No tool selected");
          }

          const token = await getToken();
          const response = await fetch(`/api/tools/${toolId}/execute`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: input,
              parameters: node.data.config.parameters || {},
              context: previousResults,
            }),
          });

          if (!response.ok) {
            throw new Error(`Tool execution failed: ${response.statusText}`);
          }

          const result = await response.json();
          return {
            output: result.output || `Tool ${toolId} executed successfully`,
            metrics: {
              executionTime: Date.now() - startTime,
              cost: result.cost || 0.001,
            },
          };
        } catch (error: any) {
          throw new Error(`Tool execution failed: ${error.message}`);
        }

      case "knowledge":
        try {
          const knowledgeId = node.data.config.knowledgeId;
          const query = node.data.config.query || input;

          if (!knowledgeId) {
            throw new Error("No knowledge source selected");
          }

          const token = await getToken();
          const response = await fetch("/api/knowledge/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: query,
              documentIds: [knowledgeId],
              limit: node.data.config.limit || 5,
            }),
          });

          if (!response.ok) {
            throw new Error(`Knowledge search failed: ${response.statusText}`);
          }

          const result = await response.json();
          return {
            output: `Found ${result.results?.length || 0} relevant documents`,
            data: result.results,
            metrics: {
              executionTime: Date.now() - startTime,
              cost: 0.0001,
            },
          };
        } catch (error: any) {
          throw new Error(`Knowledge search failed: ${error.message}`);
        }

      case "condition":
        // Simple condition evaluation
        const condition = node.data.config.condition || "true";
        const conditionResult = evaluateCondition(
          condition,
          previousResults,
          input,
        );

        return {
          output: `Condition evaluated to: ${conditionResult}`,
          data: { conditionResult },
          metrics: {
            executionTime: Date.now() - startTime,
            cost: 0,
          },
        };

      default:
        return {
          output: `${node.type} node executed`,
          metrics: {
            executionTime: Date.now() - startTime,
            cost: 0,
          },
        };
    }
  };

  const evaluateCondition = (
    condition: string,
    previousResults: Record<string, any>,
    input: string,
  ): boolean => {
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      const context = { input, results: previousResults };
      return new Function("context", `with(context) { return ${condition}; }`)(
        context,
      );
    } catch (error) {
      console.error("Condition evaluation error:", error);
      return false;
    }
  };

  const topologicalSort = (
    nodes: AgentNode[],
    edges: AgentEdge[],
  ): AgentNode[] => {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize graph
    nodes.forEach((node) => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // Build graph
    edges.forEach((edge) => {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Topological sort
    const queue: string[] = [];
    const result: AgentNode[] = [];

    // Find nodes with no incoming edges
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        result.push(node);
      }

      graph.get(nodeId)?.forEach((neighbor) => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    return result;
  };

  const saveWorkflow = useCallback(async () => {
    try {
      const workflowData = {
        name: currentConfiguration.name || "Untitled Workflow",
        description: currentConfiguration.description,
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          data: edge.data,
        })),
        metadata: {
          createdAt: new Date().toISOString(),
          version: "1.0.0",
        },
      };

      const token = await getToken();
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workflowData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Workflow saved successfully",
        });
      } else {
        throw new Error("Failed to save workflow");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save workflow",
        variant: "destructive",
      });
    }
  }, [currentConfiguration, nodes, edges, toast]);

  const renderNodeProperties = () => {
    if (!selectedNode) {
      return (
        <div className="text-center text-gray-500 py-8">
          <Settings className="h-8 w-8 mx-auto mb-2" />
          <p>Select a node to configure its properties</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Node Configuration</h3>
          <Badge variant="outline">{selectedNode.type}</Badge>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="node-label">Label</Label>
            <Input
              id="node-label"
              value={selectedNode.data.label}
              onChange={(e) => {
                const newLabel = e.target.value;
                setSelectedNode({
                  ...selectedNode,
                  data: { ...selectedNode.data, label: newLabel },
                });
                updateNodeConfig(selectedNode.id, { label: newLabel });
              }}
            />
          </div>

          {selectedNode.type === "agent" && (
            <div className="space-y-3">
              <div>
                <Label>Existing Agent</Label>
                <Select
                  value={selectedNode.data.config.agentId || ""}
                  onValueChange={(value) => {
                    const agent = savedAgents.find((a) => a.id === value);
                    updateNodeConfig(selectedNode.id, {
                      agentId: value,
                      agentName: agent?.name,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose existing agent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label>Prompt Template</Label>
                <Select
                  value={selectedNode.data.config.promptTemplateId || ""}
                  onValueChange={(value) => {
                    const template = promptTemplates.find(
                      (t) => t.id === value,
                    );
                    updateNodeConfig(selectedNode.id, {
                      promptTemplateId: value,
                      promptTemplateName: template?.name,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a prompt template" />
                  </SelectTrigger>
                  <SelectContent>
                    {promptTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="agent-model">Model</Label>
                <Select
                  value={selectedNode.data.config.model || "gpt-4"}
                  onValueChange={(value) =>
                    updateNodeConfig(selectedNode.id, { model: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                    <SelectItem value="claude-3-sonnet">
                      Claude 3 Sonnet
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="agent-temperature">Temperature</Label>
                <Input
                  id="agent-temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={selectedNode.data.config.temperature || 0.7}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      temperature: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="agent-prompt">
                  Custom Prompt (if no template)
                </Label>
                <Textarea
                  id="agent-prompt"
                  value={selectedNode.data.config.prompt || ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      prompt: e.target.value,
                    })
                  }
                  placeholder="Enter custom prompt or use a template above"
                  rows={4}
                />
              </div>
            </div>
          )}

          {selectedNode.type === "tool" && (
            <div className="space-y-3">
              <div>
                <Label>Select Tool</Label>
                <Select
                  value={selectedNode.data.config.toolId || ""}
                  onValueChange={(value) => {
                    const tool = availableTools.find((t) => t.id === value);
                    updateNodeConfig(selectedNode.id, {
                      toolId: value,
                      toolName: tool?.name,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tool" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTools.map((tool) => (
                      <SelectItem key={tool.id} value={tool.id}>
                        {tool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tool-parameters">Parameters (JSON)</Label>
                <Textarea
                  id="tool-parameters"
                  value={JSON.stringify(
                    selectedNode.data.config.parameters || {},
                    null,
                    2,
                  )}
                  onChange={(e) => {
                    try {
                      const parameters = JSON.parse(e.target.value);
                      updateNodeConfig(selectedNode.id, { parameters });
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder="{}"
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}

          {selectedNode.type === "knowledge" && (
            <div className="space-y-3">
              <div>
                <Label>Knowledge Source</Label>
                <Select
                  value={selectedNode.data.config.knowledgeId || ""}
                  onValueChange={(value) => {
                    const knowledge = availableKnowledge.find(
                      (k) => k.id === value,
                    );
                    updateNodeConfig(selectedNode.id, {
                      knowledgeId: value,
                      knowledgeName: knowledge?.title,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose knowledge source" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableKnowledge.map((knowledge) => (
                      <SelectItem key={knowledge.id} value={knowledge.id}>
                        {knowledge.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="knowledge-query">Search Query</Label>
                <Input
                  id="knowledge-query"
                  value={selectedNode.data.config.query || ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, { query: e.target.value })
                  }
                  placeholder="Leave empty to use workflow input"
                />
              </div>

              <div>
                <Label htmlFor="knowledge-limit">Result Limit</Label>
                <Input
                  id="knowledge-limit"
                  type="number"
                  min="1"
                  max="20"
                  value={selectedNode.data.config.limit || 5}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      limit: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          )}

          {selectedNode.type === "condition" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="condition-expression">
                  Condition Expression
                </Label>
                <Textarea
                  id="condition-expression"
                  value={selectedNode.data.config.condition || ""}
                  onChange={(e) =>
                    updateNodeConfig(selectedNode.id, {
                      condition: e.target.value,
                    })
                  }
                  placeholder="e.g., input.includes('hello') || results.agent1.output.length > 10"
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>
              <div className="text-xs text-gray-500">
                Available variables: input, results
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-[600px] border rounded-lg bg-white">
      <div className="flex h-full">
        {/* Main Canvas */}
        <div className="flex-1 relative">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <Button
              size="sm"
              onClick={() => addNode("agent")}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loadingResources}
            >
              <Bot className="h-4 w-4 mr-1" />
              Agent
            </Button>
            <Button
              size="sm"
              onClick={() => addNode("tool")}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={loadingResources}
            >
              <Wrench className="h-4 w-4 mr-1" />
              Tool
            </Button>
            <Button
              size="sm"
              onClick={() => addNode("knowledge")}
              className="bg-green-600 hover:bg-green-700"
              disabled={loadingResources}
            >
              <Database className="h-4 w-4 mr-1" />
              Knowledge
            </Button>
            <Button
              size="sm"
              onClick={() => addNode("condition")}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <GitBranch className="h-4 w-4 mr-1" />
              Condition
            </Button>
            <Button
              size="sm"
              onClick={() => setShowPromptTemplates(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={templatesLoading}
            >
              <FileText className="h-4 w-4 mr-1" />
              Templates
            </Button>
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadAvailableResources}
              disabled={loadingResources}
            >
              {loadingResources ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTestPanel(!showTestPanel)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Test
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={saveWorkflow}
              disabled={nodes.length === 0}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              onClick={executeWorkflow}
              disabled={isExecuting || nodes.length === 0 || !testInput.trim()}
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              {isExecuting ? "Running..." : "Execute"}
            </Button>
          </div>

          <ReactFlow
            nodes={nodes.map((node) => ({
              id: node.id,
              type: "custom",
              position: node.position,
              data: node.data,
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            connectionLineType="smoothstep"
            connectionLineStyle={{
              stroke: "#3b82f6",
              strokeWidth: 2,
              strokeDasharray: "5,5",
            }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#e5e7eb"
            />
            <Controls position="bottom-right" />
            <MiniMap
              position="bottom-left"
              nodeColor={(node) => {
                switch (node.data?.nodeType) {
                  case "agent":
                    return "#3b82f6";
                  case "tool":
                    return "#8b5cf6";
                  case "knowledge":
                    return "#10b981";
                  case "condition":
                    return "#f97316";
                  default:
                    return "#6b7280";
                }
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        <div className="w-80 border-l bg-gray-50">
          <Tabs defaultValue="properties" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent
              value="properties"
              className="p-4 h-full overflow-y-auto"
            >
              {renderNodeProperties()}
            </TabsContent>

            <TabsContent value="results" className="p-4 h-full overflow-y-auto">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Execution Results</h3>
                {Object.keys(executionResults).length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                    <p>No execution results yet</p>
                    <p className="text-sm">Run the workflow to see results</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(executionResults).map(
                      ([nodeId, result]) => {
                        const node = nodes.find((n) => n.id === nodeId);
                        return (
                          <Card key={nodeId}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">
                                {node?.data.label || nodeId}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs space-y-1">
                                <div className="font-medium">Output:</div>
                                <div className="bg-gray-100 p-2 rounded text-xs">
                                  {typeof result.output === "string"
                                    ? result.output
                                    : JSON.stringify(result.output, null, 2)}
                                </div>
                                {result.metrics && (
                                  <div className="text-gray-500 mt-2">
                                    Time: {result.metrics.executionTime}ms
                                    {result.metrics.cost && (
                                      <span>
                                        {" "}
                                        | Cost: $
                                        {result.metrics.cost.toFixed(4)}
                                      </span>
                                    )}
                                    {result.metrics.tokensUsed && (
                                      <span>
                                        {" "}
                                        | Tokens: {result.metrics.tokensUsed}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="p-4 h-full overflow-y-auto">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Execution Logs</h3>
                {workflowExecutionLog.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>No logs yet</p>
                    <p className="text-sm">Execute workflow to see logs</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {workflowExecutionLog.map((log, index) => (
                      <div
                        key={index}
                        className={`text-xs p-2 rounded ${
                          log.includes("✓")
                            ? "bg-green-50 text-green-800"
                            : log.includes("✗")
                              ? "bg-red-50 text-red-800"
                              : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Test Panel */}
      {showTestPanel && (
        <div className="absolute bottom-4 left-4 right-4 bg-white border rounded-lg shadow-lg p-4 z-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Test Workflow</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTestPanel(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="test-input">Test Input</Label>
              <Textarea
                id="test-input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter test message or data..."
                rows={3}
              />
            </div>
            <Button
              onClick={executeWorkflow}
              disabled={isExecuting || !testInput.trim() || nodes.length === 0}
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              {isExecuting ? "Running..." : "Execute"}
            </Button>
          </div>
        </div>
      )}

      {/* Prompt Templates Dialog */}
      <Dialog open={showPromptTemplates} onOpenChange={setShowPromptTemplates}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Prompt Templates</DialogTitle>
            <DialogDescription>
              Browse and select prompt templates for your agents
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            <PromptTemplateManager
              embedded
              showActions={false}
              onTemplateSelect={(template) => {
                if (selectedNode?.type === "agent") {
                  updateNodeConfig(selectedNode.id, {
                    promptTemplateId: template.id,
                    promptTemplateName: template.name,
                  });
                }
                setShowPromptTemplates(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function VisualAgentBuilder(props: VisualAgentBuilderProps) {
  return (
    <ReactFlowProvider>
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Visual Agent Builder
          </CardTitle>
          <p className="text-sm text-gray-600">
            Drag and drop components to build your AI agent workflow
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <VisualAgentBuilderInner {...props} />
        </CardContent>
      </Card>
    </ReactFlowProvider>
  );
}

export { VisualAgentBuilder };
