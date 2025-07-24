"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
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
  EdgeTypes,
  MarkerType,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Trash2, Edit, Copy, Settings, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodeSelect: (node: WorkflowNode | null) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onNodeDelete: (nodeId: string) => void;
  onEdgeAdd: (edge: WorkflowEdge) => void;
  onEdgeDelete: (edgeId: string) => void;
  selectedNode: WorkflowNode | null;
  onNodeAdd: (
    nodeType: WorkflowNode["type"],
    position: { x: number; y: number },
  ) => void;
}

// Custom Node Components
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
      case "start":
        return "bg-green-100 border-green-500 text-green-800";
      case "end":
        return "bg-red-100 border-red-500 text-red-800";
      case "agent":
        return "bg-blue-100 border-blue-500 text-blue-800";
      case "tool":
        return "bg-purple-100 border-purple-500 text-purple-800";
      case "condition":
        return "bg-yellow-100 border-yellow-500 text-yellow-800";
      case "loop":
        return "bg-orange-100 border-orange-500 text-orange-800";
      case "hitl":
        return "bg-pink-100 border-pink-500 text-pink-800";
      default:
        return "bg-gray-100 border-gray-500 text-gray-800";
    }
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case "start":
        return "▶";
      case "end":
        return "⏹";
      case "agent":
        return "🤖";
      case "tool":
        return "🔧";
      case "condition":
        return "❓";
      case "loop":
        return "🔄";
      case "hitl":
        return "👤";
      default:
        return "⚪";
    }
  };

  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[200px] ${getNodeColor(
        data.nodeType,
      )} ${
        selected ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-lg"
      } transition-all duration-200`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{getNodeIcon(data.nodeType)}</span>
        <div className="flex-1">
          <div className="font-medium text-sm">
            {data.label || data.nodeType}
          </div>
          <Badge variant="outline" className="text-xs mt-1">
            {data.nodeType}
          </Badge>
        </div>
      </div>

      {data.agentId && (
        <div className="text-xs text-gray-600 mt-1">Agent: {data.agentId}</div>
      )}

      {data.toolId && (
        <div className="text-xs text-gray-600 mt-1">Tool: {data.toolId}</div>
      )}

      {selected && (
        <div className="flex gap-1 mt-2">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Settings className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Copy className="h-3 w-3" />
          </Button>
          {data.nodeType !== "start" && data.nodeType !== "end" && (
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
          )}
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {};

function WorkflowCanvasInner({
  nodes,
  edges,
  onNodeSelect,
  onNodeUpdate,
  onNodeDelete,
  onEdgeAdd,
  onEdgeDelete,
  selectedNode,
  onNodeAdd,
}: WorkflowCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState([]);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);

  // Convert workflow nodes to ReactFlow nodes
  useEffect(() => {
    const convertedNodes: Node[] = nodes.map((node) => ({
      id: node.id,
      type: "custom",
      position: node.position,
      data: {
        ...node.data,
        nodeType: node.type,
        onDelete: onNodeDelete,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));
    setReactFlowNodes(convertedNodes);
  }, [nodes, onNodeDelete, setReactFlowNodes]);

  // Convert workflow edges to ReactFlow edges
  useEffect(() => {
    const convertedEdges: Edge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
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
    }));
    setReactFlowEdges(convertedEdges);
  }, [edges, setReactFlowEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        const newEdge: WorkflowEdge = {
          id: `edge-${params.source}-${params.target}-${Date.now()}`,
          source: params.source,
          target: params.target,
        };
        onEdgeAdd(newEdge);
      }
    },
    [onEdgeAdd],
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const workflowNode = nodes.find((n) => n.id === node.id);
      onNodeSelect(workflowNode || null);
    },
    [nodes, onNodeSelect],
  );

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node) => {
      onNodeUpdate(node.id, {
        position: node.position,
      });
    },
    [onNodeUpdate],
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("application/reactflow");
      if (!nodeType) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onNodeAdd(nodeType as WorkflowNode["type"], position);
    },
    [reactFlowInstance, onNodeAdd],
  );

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Handle edge selection or deletion
  }, []);

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDrag={onNodeDrag}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType="smoothstep"
        connectionLineStyle={{
          stroke: "#3b82f6",
          strokeWidth: 2,
          strokeDasharray: "5,5",
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e5e7eb"
        />
        <Controls
          position="bottom-right"
          showZoom
          showFitView
          showInteractive
        />
        <MiniMap
          position="bottom-left"
          nodeColor={(node) => {
            switch (node.data?.nodeType) {
              case "start":
                return "#10b981";
              case "end":
                return "#ef4444";
              case "agent":
                return "#3b82f6";
              case "tool":
                return "#8b5cf6";
              case "condition":
                return "#f59e0b";
              case "loop":
                return "#f97316";
              case "hitl":
                return "#ec4899";
              default:
                return "#6b7280";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
