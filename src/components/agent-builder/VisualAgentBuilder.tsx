"use client";

import React, { useState, useCallback, useEffect } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AgentConfiguration } from "@/lib/ai-assistant";
import { useAgentBuilder } from "@/hooks/useAgentBuilder";
import { api } from "@/lib/api";
import { useAgentBuilderStore } from "@/store/agentBuilderStore";

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
        return <Clock className="h-3 w-3 animate-spin" />;
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
      className={`px-4 py-3 shadow-md rounded-lg border-2 min-w-[200px] ${getNodeColor(
        data.nodeType,
      )} ${
        selected ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-lg"
      } transition-all duration-200`}
    >
      <div className="flex items-center gap-2 mb-2">
        {getNodeIcon(data.nodeType)}
        <div className="flex-1">
          <div className="font-medium text-sm">{data.label}</div>
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
  const { executeAgent, testAgent } = useAgentBuilder();
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
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [availableKnowledge, setAvailableKnowledge] = useState<any[]>([]);

  useEffect(() => {
    loadAvailableResources();
  }, []);

  const loadAvailableResources = async () => {
    try {
      const [toolsResponse, knowledgeResponse] = await Promise.all([
        api.get("/tools"),
        api.get("/knowledge/documents"),
      ]);

      if (toolsResponse.data.success) {
        setAvailableTools(toolsResponse.data.data || []);
      }

      if (knowledgeResponse.data.success) {
        setAvailableKnowledge(knowledgeResponse.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load resources:", error);
    }
  };

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
        },
      };

      setNodes((nds) => [...nds, newNode]);
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
    },
    [setNodes],
  );

  const executeWorkflow = useCallback(async () => {
    if (!currentConfiguration.name) {
      toast({
        title: "Configuration Required",
        description: "Please configure your agent before testing",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    setExecutionResults({});

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

      for (const node of sortedNodes) {
        try {
          const result = await executeNode(node, results);
          results[node.id] = result;

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
        } catch (error) {
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
  }, [currentConfiguration, nodes, edges, setNodes, toast]);

  const executeNode = async (
    node: AgentNode,
    previousResults: Record<string, any>,
  ) => {
    const startTime = Date.now();

    switch (node.type) {
      case "agent":
        // Execute agent with configuration
        const agentResult = await executeAgent(
          node.data.config.agentId || "temp-agent",
          testInput || "Hello, how can you help me?",
          {
            context: {
              previousResults,
              nodeConfig: node.data.config,
            },
          },
        );

        return {
          output: agentResult.output,
          metrics: {
            executionTime: Date.now() - startTime,
            cost: agentResult.cost,
            tokensUsed: agentResult.tokensUsed,
          },
        };

      case "tool":
        // Execute tool
        return {
          output: `Tool ${node.data.config.toolId} executed`,
          metrics: {
            executionTime: Date.now() - startTime,
            cost: 0.001,
          },
        };

      case "knowledge":
        // Search knowledge base
        return {
          output: `Knowledge search completed for: ${node.data.config.query}`,
          metrics: {
            executionTime: Date.now() - startTime,
            cost: 0.0001,
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
            <label className="block text-sm font-medium mb-1">Label</label>
            <Input
              value={selectedNode.data.label}
              onChange={(e) => {
                setSelectedNode({
                  ...selectedNode,
                  data: { ...selectedNode.data, label: e.target.value },
                });
                updateNodeConfig(selectedNode.id, { label: e.target.value });
              }}
            />
          </div>

          {selectedNode.type === "agent" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Agent Configuration
              </label>
              <Textarea
                value={JSON.stringify(selectedNode.data.config, null, 2)}
                onChange={(e) => {
                  try {
                    const config = JSON.parse(e.target.value);
                    updateNodeConfig(selectedNode.id, config);
                  } catch (error) {
                    // Invalid JSON, ignore
                  }
                }}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          )}

          {selectedNode.type === "tool" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Select Tool
              </label>
              <Select
                value={selectedNode.data.config.toolId || ""}
                onValueChange={(value) =>
                  updateNodeConfig(selectedNode.id, { toolId: value })
                }
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
          )}

          {selectedNode.type === "knowledge" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Knowledge Source
              </label>
              <Select
                value={selectedNode.data.config.knowledgeId || ""}
                onValueChange={(value) =>
                  updateNodeConfig(selectedNode.id, { knowledgeId: value })
                }
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
            >
              <Bot className="h-4 w-4 mr-1" />
              Agent
            </Button>
            <Button
              size="sm"
              onClick={() => addNode("tool")}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Wrench className="h-4 w-4 mr-1" />
              Tool
            </Button>
            <Button
              size="sm"
              onClick={() => addNode("knowledge")}
              className="bg-green-600 hover:bg-green-700"
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
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2">
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
              onClick={executeWorkflow}
              disabled={isExecuting || nodes.length === 0}
            >
              <Play className="h-4 w-4 mr-1" />
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
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
                                <div>Output: {result.output}</div>
                                {result.metrics && (
                                  <div className="text-gray-500">
                                    Time: {result.metrics.executionTime}ms
                                    {result.metrics.cost && (
                                      <span>
                                        {" "}
                                        | Cost: $
                                        {result.metrics.cost.toFixed(4)}
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
          </Tabs>
        </div>
      </div>

      {/* Test Panel */}
      {showTestPanel && (
        <div className="absolute bottom-4 left-4 right-4 bg-white border rounded-lg shadow-lg p-4 z-20">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Test Input
              </label>
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter test message..."
              />
            </div>
            <Button
              onClick={executeWorkflow}
              disabled={isExecuting}
              className="mt-6"
            >
              <Play className="h-4 w-4 mr-1" />
              Test
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTestPanel(false)}
              className="mt-6"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VisualAgentBuilder(props: VisualAgentBuilderProps) {
  return (
    <ReactFlowProvider>
      <Card>
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
