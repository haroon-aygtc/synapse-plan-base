"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Square,
  Bot,
  Wrench,
  GitBranch,
  RotateCcw,
  User,
  Plus,
} from "lucide-react";

interface WorkflowNode {
  id: string;
  type: "agent" | "tool" | "condition" | "loop" | "hitl" | "start" | "end";
  position: { x: number; y: number };
  data: Record<string, any>;
}

interface WorkflowComponentPaletteProps {
  onNodeAdd: (
    nodeType: WorkflowNode["type"],
    position: { x: number; y: number },
  ) => void;
}

interface ComponentDefinition {
  type: WorkflowNode["type"];
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: "flow" | "execution" | "logic" | "human";
}

const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  {
    type: "start",
    label: "Start",
    description: "Entry point for workflow execution",
    icon: <Play className="h-4 w-4" />,
    color: "bg-green-100 border-green-300 text-green-800",
    category: "flow",
  },
  {
    type: "end",
    label: "End",
    description: "Exit point for workflow execution",
    icon: <Square className="h-4 w-4" />,
    color: "bg-red-100 border-red-300 text-red-800",
    category: "flow",
  },
  {
    type: "agent",
    label: "AI Agent",
    description: "Execute AI agent with conversation capabilities",
    icon: <Bot className="h-4 w-4" />,
    color: "bg-blue-100 border-blue-300 text-blue-800",
    category: "execution",
  },
  {
    type: "tool",
    label: "Tool",
    description: "Execute external tool or API integration",
    icon: <Wrench className="h-4 w-4" />,
    color: "bg-purple-100 border-purple-300 text-purple-800",
    category: "execution",
  },
  {
    type: "condition",
    label: "Condition",
    description: "Conditional branching based on data evaluation",
    icon: <GitBranch className="h-4 w-4" />,
    color: "bg-yellow-100 border-yellow-300 text-yellow-800",
    category: "logic",
  },
  {
    type: "loop",
    label: "Loop",
    description: "Iterate over data or repeat actions",
    icon: <RotateCcw className="h-4 w-4" />,
    color: "bg-orange-100 border-orange-300 text-orange-800",
    category: "logic",
  },
  {
    type: "hitl",
    label: "Human Approval",
    description: "Pause workflow for human review and approval",
    icon: <User className="h-4 w-4" />,
    color: "bg-pink-100 border-pink-300 text-pink-800",
    category: "human",
  },
];

const CATEGORIES = {
  flow: { label: "Flow Control", description: "Start and end points" },
  execution: { label: "Execution", description: "AI agents and tools" },
  logic: { label: "Logic", description: "Conditions and loops" },
  human: { label: "Human-in-Loop", description: "Human interaction points" },
};

export default function WorkflowComponentPalette({
  onNodeAdd,
}: WorkflowComponentPaletteProps) {
  const handleDragStart = (
    e: React.DragEvent,
    nodeType: WorkflowNode["type"],
  ) => {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleAddNode = (nodeType: WorkflowNode["type"]) => {
    // Add node at a default position - the canvas will handle positioning
    const position = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    };
    onNodeAdd(nodeType, position);
  };

  const renderComponentsByCategory = (category: keyof typeof CATEGORIES) => {
    const components = COMPONENT_DEFINITIONS.filter(
      (comp) => comp.category === category,
    );

    return (
      <div key={category} className="mb-6">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-900">
            {CATEGORIES[category].label}
          </h3>
          <p className="text-xs text-gray-500">
            {CATEGORIES[category].description}
          </p>
        </div>
        <div className="space-y-2">
          {components.map((component) => (
            <div
              key={component.type}
              className={`p-3 rounded-lg border-2 border-dashed cursor-move hover:shadow-md transition-all duration-200 ${component.color}`}
              draggable
              onDragStart={(e: React.DragEvent) => handleDragStart(e, component.type)}
              onClick={() => handleAddNode(component.type)}
            >
              <div className="flex items-center gap-2 mb-2">
                {component.icon}
                <span className="font-medium text-sm">{component.label}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {component.type}
                </Badge>
              </div>
              <p className="text-xs opacity-80">{component.description}</p>
              <div className="flex items-center justify-center mt-2 opacity-60">
                <Plus className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Components</h2>
          <p className="text-sm text-gray-500">
            Drag components to the canvas or click to add
          </p>
        </div>

        {Object.keys(CATEGORIES).map((category) =>
          renderComponentsByCategory(category as keyof typeof CATEGORIES),
        )}

        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Tips</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Drag components to the canvas</li>
            <li>• Connect nodes by clicking connection points</li>
            <li>• Configure nodes in the Properties panel</li>
            <li>• Test your workflow before saving</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
