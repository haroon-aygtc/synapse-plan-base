"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Settings,
  MessageSquare,
  Zap,
  Database,
  Globe,
  Image,
  FileText,
  Users,
  Calendar,
  Mail,
  Phone,
  CreditCard,
  BarChart,
  Lock,
  Trash2,
  Copy,
  Edit,
  Eye,
  EyeOff,
  Grid3X3,
  Move,
  RotateCcw,
  Save,
  Play,
  Pause,
  Square,
} from "lucide-react";
import { type AgentConfiguration } from "@/lib/ai-assistant";

// Node Types
interface AgentNodeData {
  label: string;
  type: "agent";
  config: Partial<AgentConfiguration>;
  isConfigured: boolean;
  isActive: boolean;
}

interface ToolNodeData {
  label: string;
  type: "tool";
  toolType: string;
  config: Record<string, any>;
  isConfigured: boolean;
  isActive: boolean;
}

interface KnowledgeNodeData {
  label: string;
  type: "knowledge";
  sourceType: string;
  config: Record<string, any>;
  isConfigured: boolean;
  isActive: boolean;
}

interface WorkflowNodeData {
  label: string;
  type: "workflow";
  steps: any[];
  config: Record<string, any>;
  isConfigured: boolean;
  isActive: boolean;
}

type NodeData =
  | AgentNodeData
  | ToolNodeData
  | KnowledgeNodeData
  | WorkflowNodeData;

// Custom Node Components
const AgentNode = ({
  data,
  selected,
}: {
  data: AgentNodeData;
  selected: boolean;
}) => {
  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-background border-2 min-w-[200px] ${
        selected ? "border-primary" : "border-border"
      } ${data.isActive ? "ring-2 ring-green-200" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Bot className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{data.label}</span>
        <div className="flex gap-1 ml-auto">
          {data.isConfigured && (
            <Badge variant="secondary" className="text-xs">
              Configured
            </Badge>
          )}
          {data.isActive && (
            <Badge variant="default" className="text-xs">
              Active
            </Badge>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {data.config.personality || "No personality set"}
      </div>
      <div className="text-xs text-muted-foreground">
        Model: {data.config.model || "Not selected"}
      </div>
    </div>
  );
};

const ToolNode = ({
  data,
  selected,
}: {
  data: ToolNodeData;
  selected: boolean;
}) => {
  const getToolIcon = (toolType: string) => {
    switch (toolType) {
      case "web-search":
        return Globe;
      case "image-generation":
        return Image;
      case "email":
        return Mail;
      case "calendar":
        return Calendar;
      case "database":
        return Database;
      default:
        return Settings;
    }
  };

  const IconComponent = getToolIcon(data.toolType);

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-background border-2 min-w-[180px] ${
        selected ? "border-primary" : "border-border"
      } ${data.isActive ? "ring-2 ring-blue-200" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <IconComponent className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-sm">{data.label}</span>
        <div className="flex gap-1 ml-auto">
          {data.isConfigured && (
            <Badge variant="secondary" className="text-xs">
              Ready
            </Badge>
          )}
          {data.isActive && (
            <Badge variant="default" className="text-xs">
              Running
            </Badge>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground capitalize">
        {data.toolType.replace("-", " ")}
      </div>
    </div>
  );
};

const KnowledgeNode = ({
  data,
  selected,
}: {
  data: KnowledgeNodeData;
  selected: boolean;
}) => {
  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-background border-2 min-w-[180px] ${
        selected ? "border-primary" : "border-border"
      } ${data.isActive ? "ring-2 ring-purple-200" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-purple-600" />
        <span className="font-medium text-sm">{data.label}</span>
        <div className="flex gap-1 ml-auto">
          {data.isConfigured && (
            <Badge variant="secondary" className="text-xs">
              Indexed
            </Badge>
          )}
          {data.isActive && (
            <Badge variant="default" className="text-xs">
              Connected
            </Badge>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground capitalize">
        {data.sourceType.replace("-", " ")}
      </div>
    </div>
  );
};

const WorkflowNode = ({
  data,
  selected,
}: {
  data: WorkflowNodeData;
  selected: boolean;
}) => {
  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-background border-2 min-w-[200px] ${
        selected ? "border-primary" : "border-border"
      } ${data.isActive ? "ring-2 ring-orange-200" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-orange-600" />
        <span className="font-medium text-sm">{data.label}</span>
        <div className="flex gap-1 ml-auto">
          {data.isConfigured && (
            <Badge variant="secondary" className="text-xs">
              {data.steps.length} steps
            </Badge>
          )}
          {data.isActive && (
            <Badge variant="default" className="text-xs">
              Running
            </Badge>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Workflow automation</div>
    </div>
  );
};

// Node types configuration
const nodeTypes: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  knowledge: KnowledgeNode,
  workflow: WorkflowNode,
};

// Grid snap utility
const GRID_SIZE = 20;
const snapToGrid = (x: number, y: number): [number, number] => {
  const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
  const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
  return [snappedX, snappedY];
};

interface VisualAgentBuilderProps {
  onConfigurationUpdate: (config: Partial<AgentConfiguration>) => void;
  currentConfiguration: Partial<AgentConfiguration>;
  className?: string;
}

function VisualBuilderFlow({
  onConfigurationUpdate,
  currentConfiguration,
}: VisualAgentBuilderProps) {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [executionState, setExecutionState] = useState<
    "idle" | "running" | "paused"
  >("idle");
  const nodeIdCounter = useRef(0);

  // Initialize with a default agent node
  useEffect(() => {
    if (nodes.length === 0) {
      const initialNode: Node<AgentNodeData> = {
        id: "agent-1",
        type: "agent",
        position: { x: 300, y: 200 },
        data: {
          label: currentConfiguration.name || "New Agent",
          type: "agent",
          config: currentConfiguration,
          isConfigured: Object.keys(currentConfiguration).length > 2,
          isActive: false,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
      setNodes([initialNode]);
    }
  }, [currentConfiguration, nodes.length, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: "#6366f1",
        },
        style: {
          stroke: "#6366f1",
          strokeWidth: 2,
        },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges],
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (snapToGridEnabled) {
        const [x, y] = snapToGrid(node.position.x, node.position.y);
        setNodes((nds) =>
          nds.map((n) => (n.id === node.id ? { ...n, position: { x, y } } : n)),
        );
      }
    },
    [snapToGridEnabled, setNodes],
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      setSelectedNode(node);
    },
    [],
  );

  const addNode = useCallback(
    (nodeType: string, nodeData: Partial<NodeData>) => {
      const id = `${nodeType}-${++nodeIdCounter.current}`;
      const position = reactFlowInstance.project({
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      });

      const [x, y] = snapToGridEnabled
        ? snapToGrid(position.x, position.y)
        : [position.x, position.y];

      const newNode: Node<NodeData> = {
        id,
        type: nodeType,
        position: { x, y },
        data: {
          label: `New ${nodeType}`,
          type: nodeType as any,
          isConfigured: false,
          isActive: false,
          ...nodeData,
        } as NodeData,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, snapToGridEnabled, setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
    },
    [setNodes, setEdges, selectedNode],
  );

  const duplicateNode = useCallback(
    (node: Node<NodeData>) => {
      const id = `${node.type}-${++nodeIdCounter.current}`;
      const newPosition = {
        x: node.position.x + 50,
        y: node.position.y + 50,
      };
      const [x, y] = snapToGridEnabled
        ? snapToGrid(newPosition.x, newPosition.y)
        : [newPosition.x, newPosition.y];

      const newNode: Node<NodeData> = {
        ...node,
        id,
        position: { x, y },
        data: {
          ...node.data,
          label: `${node.data.label} (Copy)`,
          isActive: false,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [snapToGridEnabled, setNodes],
  );

  const updateNodeData = useCallback(
    (nodeId: string, newData: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: { ...node.data, ...newData },
              }
            : node,
        ),
      );

      // Update main configuration if it's the main agent node
      if (nodeId === "agent-1" && newData.type === "agent") {
        const agentData = newData as Partial<AgentNodeData>;
        if (agentData.config) {
          onConfigurationUpdate(agentData.config);
        }
      }
    },
    [setNodes, onConfigurationUpdate],
  );

  const toggleExecution = useCallback(() => {
    if (executionState === "idle") {
      setExecutionState("running");
      // Simulate execution by activating nodes sequentially
      const nodeIds = nodes.map((n) => n.id);
      nodeIds.forEach((id, index) => {
        setTimeout(() => {
          updateNodeData(id, { isActive: true });
        }, index * 1000);
      });
    } else if (executionState === "running") {
      setExecutionState("paused");
    } else {
      setExecutionState("running");
    }
  }, [executionState, nodes, updateNodeData]);

  const stopExecution = useCallback(() => {
    setExecutionState("idle");
    nodes.forEach((node) => {
      updateNodeData(node.id, { isActive: false });
    });
  }, [nodes, updateNodeData]);

  const resetCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setExecutionState("idle");
    nodeIdCounter.current = 0;
  }, [setNodes, setEdges]);

  const saveConfiguration = useCallback(() => {
    const configuration = {
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
      })),
    };
    console.log("Saving configuration:", configuration);
    // In a real implementation, this would save to a backend
  }, [nodes, edges]);

  return (
    <div className="h-full w-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addNode("agent", { config: {} })}
          >
            <Bot className="h-4 w-4 mr-1" />
            Agent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              addNode("tool", { toolType: "web-search", config: {} })
            }
          >
            <Settings className="h-4 w-4 mr-1" />
            Tool
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              addNode("knowledge", { sourceType: "document", config: {} })
            }
          >
            <FileText className="h-4 w-4 mr-1" />
            Knowledge
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addNode("workflow", { steps: [], config: {} })}
          >
            <Zap className="h-4 w-4 mr-1" />
            Workflow
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGridVisible(!isGridVisible)}
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Grid
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSnapToGridEnabled(!snapToGridEnabled)}
          >
            <Move className="h-4 w-4 mr-1" />
            Snap
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? (
              <EyeOff className="h-4 w-4 mr-1" />
            ) : (
              <Eye className="h-4 w-4 mr-1" />
            )}
            Preview
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant={executionState === "running" ? "secondary" : "default"}
            size="sm"
            onClick={toggleExecution}
          >
            {executionState === "idle" ? (
              <Play className="h-4 w-4 mr-1" />
            ) : executionState === "running" ? (
              <Pause className="h-4 w-4 mr-1" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            {executionState === "idle"
              ? "Run"
              : executionState === "running"
                ? "Pause"
                : "Resume"}
          </Button>
          <Button variant="outline" size="sm" onClick={stopExecution}>
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={saveConfiguration}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={resetCanvas}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex h-[calc(100%-80px)]">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid={snapToGridEnabled}
            snapGrid={[GRID_SIZE, GRID_SIZE]}
            className="bg-background"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={GRID_SIZE}
              size={1}
              style={{
                opacity: isGridVisible ? 0.5 : 0,
              }}
            />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case "agent":
                    return "#6366f1";
                  case "tool":
                    return "#2563eb";
                  case "knowledge":
                    return "#9333ea";
                  case "workflow":
                    return "#ea580c";
                  default:
                    return "#64748b";
                }
              }}
              className="bg-background border border-border"
            />
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="w-80 border-l bg-background p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Node Properties</h3>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicateNode(selectedNode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="node-label">Label</Label>
                <Input
                  id="node-label"
                  value={selectedNode.data.label}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, { label: e.target.value })
                  }
                />
              </div>

              {selectedNode.data.type === "agent" && (
                <AgentNodeProperties
                  node={selectedNode as Node<AgentNodeData>}
                  onUpdate={(data) => updateNodeData(selectedNode.id, data)}
                />
              )}

              {selectedNode.data.type === "tool" && (
                <ToolNodeProperties
                  node={selectedNode as Node<ToolNodeData>}
                  onUpdate={(data) => updateNodeData(selectedNode.id, data)}
                />
              )}

              {selectedNode.data.type === "knowledge" && (
                <KnowledgeNodeProperties
                  node={selectedNode as Node<KnowledgeNodeData>}
                  onUpdate={(data) => updateNodeData(selectedNode.id, data)}
                />
              )}

              {selectedNode.data.type === "workflow" && (
                <WorkflowNodeProperties
                  node={selectedNode as Node<WorkflowNodeData>}
                  onUpdate={(data) => updateNodeData(selectedNode.id, data)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Property panels for different node types
const AgentNodeProperties = ({
  node,
  onUpdate,
}: {
  node: Node<AgentNodeData>;
  onUpdate: (data: Partial<AgentNodeData>) => void;
}) => {
  const { data } = node;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="agent-personality">Personality</Label>
        <Select
          value={data.config.personality || "helpful"}
          onValueChange={(value) =>
            onUpdate({
              config: { ...data.config, personality: value },
              isConfigured: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="helpful">Helpful</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="creative">Creative</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="agent-model">AI Model</Label>
        <Select
          value={data.config.model || "gpt-4"}
          onValueChange={(value) =>
            onUpdate({
              config: { ...data.config, model: value },
              isConfigured: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
            <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="agent-temperature">
          Temperature: {(data.config.temperature || 0.7).toFixed(1)}
        </Label>
        <Slider
          value={[data.config.temperature || 0.7]}
          onValueChange={([value]) =>
            onUpdate({
              config: { ...data.config, temperature: value },
              isConfigured: true,
            })
          }
          max={1}
          min={0}
          step={0.1}
          className="mt-2"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="agent-memory">Memory Enabled</Label>
        <Switch
          checked={data.config.memoryEnabled || false}
          onCheckedChange={(checked) =>
            onUpdate({
              config: { ...data.config, memoryEnabled: checked },
              isConfigured: true,
            })
          }
        />
      </div>
    </div>
  );
};

const ToolNodeProperties = ({
  node,
  onUpdate,
}: {
  node: Node<ToolNodeData>;
  onUpdate: (data: Partial<ToolNodeData>) => void;
}) => {
  const { data } = node;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tool-type">Tool Type</Label>
        <Select
          value={data.toolType}
          onValueChange={(value) =>
            onUpdate({ toolType: value, isConfigured: true })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="web-search">Web Search</SelectItem>
            <SelectItem value="image-generation">Image Generation</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="calendar">Calendar</SelectItem>
            <SelectItem value="database">Database</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="tool-description">Description</Label>
        <Textarea
          id="tool-description"
          placeholder="Describe what this tool does..."
          value={data.config.description || ""}
          onChange={(e) =>
            onUpdate({
              config: { ...data.config, description: e.target.value },
              isConfigured: true,
            })
          }
        />
      </div>
    </div>
  );
};

const KnowledgeNodeProperties = ({
  node,
  onUpdate,
}: {
  node: Node<KnowledgeNodeData>;
  onUpdate: (data: Partial<KnowledgeNodeData>) => void;
}) => {
  const { data } = node;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="knowledge-source">Source Type</Label>
        <Select
          value={data.sourceType}
          onValueChange={(value) =>
            onUpdate({ sourceType: value, isConfigured: true })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="database">Database</SelectItem>
            <SelectItem value="api">API</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="knowledge-source-url">Source URL/Path</Label>
        <Input
          id="knowledge-source-url"
          placeholder="Enter source URL or file path..."
          value={data.config.source || ""}
          onChange={(e) =>
            onUpdate({
              config: { ...data.config, source: e.target.value },
              isConfigured: true,
            })
          }
        />
      </div>
    </div>
  );
};

const WorkflowNodeProperties = ({
  node,
  onUpdate,
}: {
  node: Node<WorkflowNodeData>;
  onUpdate: (data: Partial<WorkflowNodeData>) => void;
}) => {
  const { data } = node;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="workflow-description">Description</Label>
        <Textarea
          id="workflow-description"
          placeholder="Describe this workflow..."
          value={data.config.description || ""}
          onChange={(e) =>
            onUpdate({
              config: { ...data.config, description: e.target.value },
              isConfigured: true,
            })
          }
        />
      </div>

      <div>
        <Label>Steps ({data.steps.length})</Label>
        <div className="text-sm text-muted-foreground">
          Connect nodes to define workflow steps
        </div>
      </div>
    </div>
  );
};

export default function VisualAgentBuilder(props: VisualAgentBuilderProps) {
  return (
    <div
      className={`h-[800px] border rounded-lg overflow-hidden bg-background ${props.className || ""}`}
    >
      <ReactFlowProvider>
        <VisualBuilderFlow {...props} />
      </ReactFlowProvider>
    </div>
  );
}
