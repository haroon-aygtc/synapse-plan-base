"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
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
  ReactFlowInstance,
  NodeTypes,
  EdgeTypes,
} from "reactflow";
import "reactflow/dist/style.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  MessageSquare,
  Settings,
  Database,
  Zap,
  Brain,
  Search,
  Code,
  FileText,
  Mail,
  Calendar,
  Calculator,
  Image,
  Music,
  Video,
  Globe,
  Shield,
  Users,
  BarChart3,
  Plus,
  Play,
  Save,
} from "lucide-react";

import { AgentNode } from "./nodes/AgentNode";
import { ToolNode } from "./nodes/ToolNode";
import { KnowledgeNode } from "./nodes/KnowledgeNode";
import { TriggerNode } from "./nodes/TriggerNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { ActionNode } from "./nodes/ActionNode";
import { CustomEdge } from "./edges/CustomEdge";
import { ComponentPalette } from "./ComponentPalette";
import { useAgentBuilderStore } from "@/store/agentBuilderStore";
import { toast } from "@/components/ui/use-toast";
import { AgentConfiguration } from "@/lib/ai-assistant";

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  knowledge: KnowledgeNode,
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

const COMPONENT_CATEGORIES = [
  {
    id: "core",
    name: "Core Components",
    icon: <Bot className="h-4 w-4" />,
    components: [
      {
        id: "agent",
        name: "Agent",
        description: "Main AI agent component",
        icon: <Bot className="h-5 w-5" />,
        color: "bg-blue-500",
        type: "agent",
      },
      {
        id: "trigger",
        name: "Trigger",
        description: "Event trigger",
        icon: <Zap className="h-5 w-5" />,
        color: "bg-yellow-500",
        type: "trigger",
      },
      {
        id: "condition",
        name: "Condition",
        description: "Logic condition",
        icon: <Settings className="h-5 w-5" />,
        color: "bg-purple-500",
        type: "condition",
      },
      {
        id: "action",
        name: "Action",
        description: "Execute action",
        icon: <Play className="h-5 w-5" />,
        color: "bg-green-500",
        type: "action",
      },
    ],
  },
  {
    id: "tools",
    name: "Tools & APIs",
    icon: <Settings className="h-4 w-4" />,
    components: [
      {
        id: "search",
        name: "Web Search",
        description: "Search the web",
        icon: <Search className="h-5 w-5" />,
        color: "bg-orange-500",
        type: "tool",
      },
      {
        id: "code",
        name: "Code Executor",
        description: "Execute code",
        icon: <Code className="h-5 w-5" />,
        color: "bg-gray-500",
        type: "tool",
      },
      {
        id: "email",
        name: "Email",
        description: "Send emails",
        icon: <Mail className="h-5 w-5" />,
        color: "bg-red-500",
        type: "tool",
      },
      {
        id: "calendar",
        name: "Calendar",
        description: "Manage calendar",
        icon: <Calendar className="h-5 w-5" />,
        color: "bg-indigo-500",
        type: "tool",
      },
      {
        id: "calculator",
        name: "Calculator",
        description: "Perform calculations",
        icon: <Calculator className="h-5 w-5" />,
        color: "bg-teal-500",
        type: "tool",
      },
    ],
  },
  {
    id: "knowledge",
    name: "Knowledge Sources",
    icon: <Database className="h-4 w-4" />,
    components: [
      {
        id: "documents",
        name: "Documents",
        description: "Document knowledge base",
        icon: <FileText className="h-5 w-5" />,
        color: "bg-blue-600",
        type: "knowledge",
      },
      {
        id: "database",
        name: "Database",
        description: "Database connection",
        icon: <Database className="h-5 w-5" />,
        color: "bg-green-600",
        type: "knowledge",
      },
      {
        id: "api",
        name: "API",
        description: "External API",
        icon: <Globe className="h-5 w-5" />,
        color: "bg-purple-600",
        type: "knowledge",
      },
    ],
  },
];

const initialNodes: Node[] = [
  {
    id: "agent-1",
    type: "agent",
    position: { x: 400, y: 200 },
    data: {
      label: "Main Agent",
      name: "Assistant",
      model: "gpt-4",
      temperature: 0.7,
      prompt: "You are a helpful assistant...",
    },
  },
];

const initialEdges: Edge[] = [];

export function VisualAgentBuilder() {
  const {
    currentAgent,
    updateAgentConfiguration,
    addNode,
    discoverFeature,
  } = useAgentBuilderStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, type: "custom" }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const componentData = JSON.parse(
        event.dataTransfer.getData("application/json"),
      );

      if (typeof type === "undefined" || !type || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: componentData.name,
          ...componentData,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, addNode, discoverFeature],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const executeWorkflow = useCallback(async () => {
    setIsExecuting(true);
    try {
      // Simulate workflow execution
      const agentNodes = nodes.filter((node) => node.type === "agent");
      const toolNodes = nodes.filter((node) => node.type === "tool");
      const knowledgeNodes = nodes.filter((node) => node.type === "knowledge");

      // Build execution plan
      const executionPlan = {
        agents: agentNodes.map((node) => ({
          id: node.id,
          name: node.data.name,
          model: node.data.model,
          prompt: node.data.prompt,
          position: node.position,
        })),
        tools: toolNodes.map((node) => ({
          id: node.id,
          name: node.data.name,
          type: node.data.type,
          config: node.data.config,
        })),
        knowledge: knowledgeNodes.map((node) => ({
          id: node.id,
          name: node.data.name,
          source: node.data.source,
          config: node.data.config,
        })),
        connections: edges.map((edge) => ({
          from: edge.source,
          to: edge.target,
          type: edge.type,
        })),
      };

      // Send to backend for execution
      const response = await fetch("/api/agents/execute-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: executionPlan,
          testInput: "Hello, test the workflow",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Workflow Executed",
          description: `Execution completed in ${result.executionTime}ms`,
        });
      }
    } catch (error) {
      toast({
        title: "Execution Failed",
        description:
          "Failed to execute workflow. Please check your configuration.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges]);

  const saveWorkflow = useCallback(async () => {
    try {
      const workflowData = {
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

      updateAgentConfiguration({
        ...currentAgent,
        visualWorkflow: workflowData,
      } as Partial<AgentConfiguration>);

      toast({
        title: "Workflow Saved",
        description: "Your visual workflow has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive",
      });
    }
  }, [nodes, edges, currentAgent, updateAgentConfiguration]);

  return (
    <div className="h-full flex">
      {/* Component Palette */}
      <div className="w-80 border-r bg-card/50 backdrop-blur-sm">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Component Palette</span>
          </h3>
        </div>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <ComponentPalette categories={COMPONENT_CATEGORIES} />
        </ScrollArea>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex space-x-2">
          <Button
            onClick={executeWorkflow}
            disabled={isExecuting}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {isExecuting ? "Executing..." : "Test Workflow"}
          </Button>
          <Button onClick={saveWorkflow} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save Workflow
          </Button>
        </div>

        <div className="absolute top-4 right-4 z-10">
          <Card className="w-64">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Workflow Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Nodes:</span>
                <Badge variant="outline">{nodes.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Connections:</span>
                <Badge variant="outline">{edges.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Agents:</span>
                <Badge variant="outline">
                  {nodes.filter((n) => n.type === "agent").length}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tools:</span>
                <Badge variant="outline">
                  {nodes.filter((n) => n.type === "tool").length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <ReactFlowProvider>
          <div ref={reactFlowWrapper} className="h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls />
              <MiniMap
                nodeStrokeColor={(n) => {
                  if (n.type === "agent") return "#3b82f6";
                  if (n.type === "tool") return "#f59e0b";
                  if (n.type === "knowledge") return "#10b981";
                  return "#6b7280";
                }}
                nodeColor={(n) => {
                  if (n.type === "agent") return "#dbeafe";
                  if (n.type === "tool") return "#fef3c7";
                  if (n.type === "knowledge") return "#d1fae5";
                  return "#f3f4f6";
                }}
                nodeBorderRadius={8}
              />
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#e2e8f0"
              />
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <motion.div
          initial={{ x: 300 }}
          animate={{ x: 0 }}
          exit={{ x: 300 }}
          className="w-80 border-l bg-card/50 backdrop-blur-sm"
        >
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Properties</span>
            </h3>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-medium mb-2">Node Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline">{selectedNode.type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs">{selectedNode.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position:</span>
                    <span className="text-xs">
                      ({Math.round(selectedNode.position.x)},{" "}
                      {Math.round(selectedNode.position.y)})
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Configuration</h4>
                <div className="space-y-2">
                  {Object.entries(selectedNode.data).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </label>
                      <div className="text-sm text-muted-foreground">
                        {typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Connections</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Incoming:
                    </span>
                    <div className="text-sm">
                      {edges.filter((e) => e.target === selectedNode.id).length}{" "}
                      connections
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Outgoing:
                    </span>
                    <div className="text-sm">
                      {edges.filter((e) => e.source === selectedNode.id).length}{" "}
                      connections
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </div>
  );
}
