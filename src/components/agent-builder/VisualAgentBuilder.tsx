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

// Grid snap utility with enhanced precision
const GRID_SIZE = 20;
const FINE_GRID_SIZE = 5;
const snapToGrid = (
  x: number,
  y: number,
  useFineGrid = false,
): [number, number] => {
  const gridSize = useFineGrid ? FINE_GRID_SIZE : GRID_SIZE;
  const snappedX = Math.round(x / gridSize) * gridSize;
  const snappedY = Math.round(y / gridSize) * gridSize;
  return [snappedX, snappedY];
};

// Enhanced connection validation
const validateConnection = (
  source: Node<NodeData>,
  target: Node<NodeData>,
): boolean => {
  // Prevent self-connections
  if (source.id === target.id) return false;

  // Validate connection logic based on node types
  const validConnections: Record<string, string[]> = {
    agent: ["tool", "knowledge", "workflow"],
    tool: ["agent", "workflow"],
    knowledge: ["agent", "workflow"],
    workflow: ["agent", "tool", "knowledge"],
  };

  return (
    validConnections[source.data.type]?.includes(target.data.type) || false
  );
};

// Node positioning utilities
const getOptimalPosition = (
  existingNodes: Node[],
  nodeType: string,
): { x: number; y: number } => {
  const typePositions: Record<string, { x: number; y: number }> = {
    agent: { x: 100, y: 200 },
    tool: { x: 400, y: 100 },
    knowledge: { x: 400, y: 300 },
    workflow: { x: 700, y: 200 },
  };

  const basePosition = typePositions[nodeType] || { x: 300, y: 200 };
  const sameTypeNodes = existingNodes.filter((node) => node.type === nodeType);

  // Offset new nodes of the same type
  const offset = sameTypeNodes.length * 50;
  return {
    x: basePosition.x + offset,
    y: basePosition.y + (sameTypeNodes.length % 2 === 0 ? 0 : 100),
  };
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
  const [useFineGrid, setUseFineGrid] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [executionState, setExecutionState] = useState<
    "idle" | "running" | "paused"
  >("idle");
  const [connectionMode, setConnectionMode] = useState<"auto" | "manual">(
    "auto",
  );
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [canvasHistory, setCanvasHistory] = useState<
    Array<{ nodes: Node[]; edges: Edge[] }>
  >([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const nodeIdCounter = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);

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
      if (!params.source || !params.target) return;

      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (!sourceNode || !targetNode) return;

      // Validate connection
      if (!validateConnection(sourceNode, targetNode)) {
        console.warn(
          `Invalid connection: ${sourceNode.data.type} -> ${targetNode.data.type}`,
        );
        return;
      }

      // Check for existing connection
      const existingEdge = edges.find(
        (e) => e.source === params.source && e.target === params.target,
      );
      if (existingEdge) return;

      const edge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
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
        data: {
          sourceType: sourceNode.data.type,
          targetType: targetNode.data.type,
          createdAt: Date.now(),
        },
      };

      setEdges((eds) => addEdge(edge, eds));
      saveToHistory();
    },
    [setEdges, nodes, edges],
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (snapToGridEnabled) {
        const [x, y] = snapToGrid(
          node.position.x,
          node.position.y,
          useFineGrid,
        );
        setNodes((nds) =>
          nds.map((n) => (n.id === node.id ? { ...n, position: { x, y } } : n)),
        );
      }
      saveToHistory();
    },
    [snapToGridEnabled, useFineGrid, setNodes],
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      setSelectedNode(node);
    },
    [],
  );

  const addNode = useCallback(
    (
      nodeType: string,
      nodeData: Partial<NodeData>,
      customPosition?: { x: number; y: number },
    ) => {
      const id = `${nodeType}-${++nodeIdCounter.current}`;

      let position;
      if (customPosition) {
        position = customPosition;
      } else {
        position = getOptimalPosition(nodes, nodeType);
      }

      const [x, y] = snapToGridEnabled
        ? snapToGrid(position.x, position.y, useFineGrid)
        : [position.x, position.y];

      const newNode: Node<NodeData> = {
        id,
        type: nodeType,
        position: { x, y },
        data: {
          label: `New ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`,
          type: nodeType as any,
          isConfigured: false,
          isActive: false,
          ...nodeData,
        } as NodeData,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        draggable: true,
        selectable: true,
      };

      setNodes((nds) => [...nds, newNode]);
      saveToHistory();

      // Auto-connect if in auto mode and there's a selected node
      if (
        connectionMode === "auto" &&
        selectedNode &&
        validateConnection(selectedNode, newNode)
      ) {
        const edge = {
          id: `edge-${selectedNode.id}-${id}`,
          source: selectedNode.id,
          target: id,
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
        setEdges((eds) => [...eds, edge]);
      }
    },
    [
      nodes,
      snapToGridEnabled,
      useFineGrid,
      setNodes,
      connectionMode,
      selectedNode,
      setEdges,
    ],
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

  // History management
  const saveToHistory = useCallback(() => {
    const newState = { nodes: [...nodes], edges: [...edges] };
    const newHistory = canvasHistory.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setCanvasHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, canvasHistory, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = canvasHistory[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, canvasHistory, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex < canvasHistory.length - 1) {
      const nextState = canvasHistory[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, canvasHistory, setNodes, setEdges]);

  // Drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("application/reactflow");
      if (!nodeType) return;

      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const nodeData = JSON.parse(
        event.dataTransfer.getData("application/nodedata") || "{}",
      );
      addNode(nodeType, nodeData, position);
    },
    [reactFlowInstance, addNode],
  );

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
        data: edge.data,
      })),
      metadata: {
        createdAt: Date.now(),
        version: "1.0",
        gridSize: useFineGrid ? FINE_GRID_SIZE : GRID_SIZE,
        snapEnabled: snapToGridEnabled,
      },
    };
    console.log("Saving configuration:", configuration);
    // In a real implementation, this would save to a backend
    return configuration;
  }, [nodes, edges, useFineGrid, snapToGridEnabled]);

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
            variant={isGridVisible ? "default" : "outline"}
            size="sm"
            onClick={() => setIsGridVisible(!isGridVisible)}
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Grid
          </Button>
          <Button
            variant={snapToGridEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setSnapToGridEnabled(!snapToGridEnabled)}
          >
            <Move className="h-4 w-4 mr-1" />
            Snap
          </Button>
          <Button
            variant={useFineGrid ? "default" : "outline"}
            size="sm"
            onClick={() => setUseFineGrid(!useFineGrid)}
            disabled={!snapToGridEnabled}
          >
            Fine Grid
          </Button>
          <Button
            variant={connectionMode === "auto" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setConnectionMode(connectionMode === "auto" ? "manual" : "auto")
            }
          >
            Auto Connect
          </Button>
          <Button
            variant={isPreviewMode ? "default" : "outline"}
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
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= canvasHistory.length - 1}
          >
            Redo
          </Button>
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
        <div className="flex-1 relative" ref={canvasRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid={snapToGridEnabled}
            snapGrid={[
              useFineGrid ? FINE_GRID_SIZE : GRID_SIZE,
              useFineGrid ? FINE_GRID_SIZE : GRID_SIZE,
            ]}
            className="bg-background"
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode={["Meta", "Ctrl"]}
            selectionKeyCode={["Shift"]}
            panOnScroll
            panOnScrollSpeed={0.5}
            zoomOnScroll
            zoomOnPinch
            preventScrolling={false}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={useFineGrid ? FINE_GRID_SIZE : GRID_SIZE}
              size={useFineGrid ? 0.5 : 1}
              style={{
                opacity: isGridVisible ? (useFineGrid ? 0.3 : 0.5) : 0,
              }}
            />
            <Controls
              showZoom
              showFitView
              showInteractive
              position="bottom-right"
            />
            <MiniMap
              nodeColor={(node) => {
                const colors = {
                  agent: "#6366f1",
                  tool: "#2563eb",
                  knowledge: "#9333ea",
                  workflow: "#ea580c",
                };
                return colors[node.type as keyof typeof colors] || "#64748b";
              }}
              nodeStrokeColor={(node) => {
                return node.selected ? "#ff0000" : "transparent";
              }}
              nodeStrokeWidth={2}
              className="bg-background border border-border"
              pannable
              zoomable
              position="bottom-left"
            />

            {/* Connection Guide Overlay */}
            {selectedNode && connectionMode === "manual" && (
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
                <div className="text-sm font-medium mb-2">Connection Mode</div>
                <div className="text-xs text-muted-foreground">
                  Selected: {selectedNode.data.label}
                  <br />
                  Click another node to connect
                </div>
              </div>
            )}

            {/* Canvas Statistics */}
            <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Nodes: {nodes.length}</div>
                <div>Connections: {edges.length}</div>
                <div>Grid: {useFineGrid ? FINE_GRID_SIZE : GRID_SIZE}px</div>
              </div>
            </div>
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
