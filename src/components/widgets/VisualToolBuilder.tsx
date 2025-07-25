"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import {
  Plus,
  Trash2,
  Settings,
  Move,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  Grid,
  Smartphone,
  Monitor,
  Tablet,
  Palette,
  Type,
  Image,
  MessageSquare,
  Send,
  Mic,
  Paperclip,
  MoreHorizontal,
} from "lucide-react";

interface VisualToolBuilderProps {
  widget: any;
  onUpdate: (updates: any) => void;
  onConfigurationUpdate: (configUpdates: any) => void;
}

interface WidgetComponent {
  id: string;
  type:
    | "header"
    | "chat-input"
    | "message-bubble"
    | "button"
    | "image"
    | "text"
    | "divider";
  position: { x: number; y: number };
  size: { width: number; height: number };
  properties: Record<string, any>;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

const COMPONENT_LIBRARY = [
  {
    type: "header",
    name: "Header",
    icon: Type,
    description: "Widget header with title and branding",
    defaultProps: {
      title: "Chat Widget",
      showLogo: true,
      backgroundColor: "#3b82f6",
      textColor: "#ffffff",
    },
  },
  {
    type: "chat-input",
    name: "Chat Input",
    icon: MessageSquare,
    description: "Text input for user messages",
    defaultProps: {
      placeholder: "Type your message...",
      showSendButton: true,
      enableFileUpload: false,
      enableVoiceInput: false,
    },
  },
  {
    type: "message-bubble",
    name: "Message Bubble",
    icon: MessageSquare,
    description: "Chat message display",
    defaultProps: {
      sender: "user",
      message: "Hello, how can I help you?",
      timestamp: true,
      avatar: true,
    },
  },
  {
    type: "button",
    name: "Action Button",
    icon: Send,
    description: "Interactive button component",
    defaultProps: {
      text: "Send",
      variant: "primary",
      size: "medium",
      disabled: false,
    },
  },
  {
    type: "image",
    name: "Image",
    icon: Image,
    description: "Image display component",
    defaultProps: {
      src: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80",
      alt: "Widget image",
      rounded: true,
    },
  },
  {
    type: "text",
    name: "Text Block",
    icon: Type,
    description: "Static text content",
    defaultProps: {
      content: "Welcome to our chat widget!",
      fontSize: 14,
      fontWeight: "normal",
      textAlign: "left",
    },
  },
  {
    type: "divider",
    name: "Divider",
    icon: MoreHorizontal,
    description: "Visual separator line",
    defaultProps: {
      orientation: "horizontal",
      thickness: 1,
      color: "#e5e7eb",
    },
  },
];

export function VisualToolBuilder({
  widget,
  onUpdate,
  onConfigurationUpdate,
}: VisualToolBuilderProps) {
  const [components, setComponents] = useState<WidgetComponent[]>([
    {
      id: "header-1",
      type: "header",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 60 },
      properties: {
        title: widget.name || "Chat Widget",
        showLogo: true,
        backgroundColor: widget.configuration.theme.primaryColor,
        textColor: "#ffffff",
      },
      visible: true,
      locked: false,
      zIndex: 1,
    },
    {
      id: "chat-input-1",
      type: "chat-input",
      position: { x: 10, y: 540 },
      size: { width: 380, height: 50 },
      properties: {
        placeholder: "Type your message...",
        showSendButton: true,
        enableFileUpload: widget.configuration.behavior.enableFileUpload,
        enableVoiceInput: widget.configuration.behavior.enableVoiceInput,
      },
      visible: true,
      locked: false,
      zIndex: 2,
    },
  ]);

  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null,
  );
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "mobile" | "tablet"
  >("desktop");
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getDeviceDimensions = () => {
    switch (previewDevice) {
      case "mobile":
        return { width: 320, height: 568 };
      case "tablet":
        return { width: 768, height: 1024 };
      default:
        return {
          width: widget.configuration.layout.width,
          height: widget.configuration.layout.height,
        };
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (
      source.droppableId === "component-library" &&
      destination.droppableId === "canvas"
    ) {
      // Add new component from library
      const componentType = COMPONENT_LIBRARY[source.index];
      const newComponent: WidgetComponent = {
        id: `${componentType.type}-${Date.now()}`,
        type: componentType.type as any,
        position: { x: 50, y: 100 + components.length * 80 },
        size: { width: 200, height: 40 },
        properties: { ...componentType.defaultProps },
        visible: true,
        locked: false,
        zIndex: components.length + 1,
      };
      setComponents((prev) => [...prev, newComponent]);
    } else if (
      source.droppableId === "canvas" &&
      destination.droppableId === "canvas"
    ) {
      // Reorder components
      const newComponents = Array.from(components);
      const [reorderedItem] = newComponents.splice(source.index, 1);
      newComponents.splice(destination.index, 0, reorderedItem);
      setComponents(newComponents);
    }
  };

  const handleComponentSelect = (componentId: string) => {
    setSelectedComponent(componentId);
  };

  const handleComponentUpdate = (
    componentId: string,
    updates: Partial<WidgetComponent>,
  ) => {
    setComponents((prev) =>
      prev.map((comp) =>
        comp.id === componentId ? { ...comp, ...updates } : comp,
      ),
    );
  };

  const handleComponentDelete = (componentId: string) => {
    setComponents((prev) => prev.filter((comp) => comp.id !== componentId));
    if (selectedComponent === componentId) {
      setSelectedComponent(null);
    }
  };

  const handleComponentDuplicate = (componentId: string) => {
    const component = components.find((comp) => comp.id === componentId);
    if (component) {
      const newComponent: WidgetComponent = {
        ...component,
        id: `${component.type}-${Date.now()}`,
        position: {
          x: component.position.x + 20,
          y: component.position.y + 20,
        },
        zIndex: Math.max(...components.map((c) => c.zIndex)) + 1,
      };
      setComponents((prev) => [...prev, newComponent]);
    }
  };

  const renderComponent = (component: WidgetComponent) => {
    const isSelected = selectedComponent === component.id;
    const style = {
      position: "absolute" as const,
      left: component.position.x,
      top: component.position.y,
      width: component.size.width,
      height: component.size.height,
      zIndex: component.zIndex,
      opacity: component.visible ? 1 : 0.5,
      border: isSelected ? "2px solid #3b82f6" : "1px solid transparent",
      borderRadius: "4px",
      cursor: component.locked ? "not-allowed" : "move",
    };

    let content;
    switch (component.type) {
      case "header":
        content = (
          <div
            className="w-full h-full flex items-center justify-between px-4"
            style={{
              backgroundColor: component.properties.backgroundColor,
              color: component.properties.textColor,
            }}
          >
            <span className="font-semibold">{component.properties.title}</span>
            {component.properties.showLogo && (
              <div className="w-6 h-6 bg-white/20 rounded" />
            )}
          </div>
        );
        break;
      case "chat-input":
        content = (
          <div className="w-full h-full flex items-center gap-2 px-3 bg-white border rounded-lg">
            <input
              className="flex-1 outline-none text-sm"
              placeholder={component.properties.placeholder}
              disabled
            />
            {component.properties.enableFileUpload && (
              <Paperclip className="h-4 w-4 text-gray-400" />
            )}
            {component.properties.enableVoiceInput && (
              <Mic className="h-4 w-4 text-gray-400" />
            )}
            {component.properties.showSendButton && (
              <Send className="h-4 w-4 text-blue-500" />
            )}
          </div>
        );
        break;
      case "message-bubble":
        content = (
          <div
            className={`p-3 rounded-lg max-w-xs ${
              component.properties.sender === "user"
                ? "bg-blue-500 text-white ml-auto"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            <div className="text-sm">{component.properties.message}</div>
            {component.properties.timestamp && (
              <div className="text-xs opacity-70 mt-1">12:34 PM</div>
            )}
          </div>
        );
        break;
      case "button":
        content = (
          <button
            className={`px-4 py-2 rounded font-medium ${
              component.properties.variant === "primary"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-900"
            } ${
              component.properties.disabled
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            disabled={component.properties.disabled}
          >
            {component.properties.text}
          </button>
        );
        break;
      case "image":
        content = (
          <img
            src={component.properties.src}
            alt={component.properties.alt}
            className={`w-full h-full object-cover ${
              component.properties.rounded ? "rounded-lg" : ""
            }`}
          />
        );
        break;
      case "text":
        content = (
          <div
            className="w-full h-full flex items-center"
            style={{
              fontSize: component.properties.fontSize,
              fontWeight: component.properties.fontWeight,
              textAlign: component.properties.textAlign,
            }}
          >
            {component.properties.content}
          </div>
        );
        break;
      case "divider":
        content = (
          <div
            className={`${
              component.properties.orientation === "horizontal"
                ? "w-full border-t"
                : "h-full border-l"
            }`}
            style={{
              borderColor: component.properties.color,
              borderWidth: component.properties.thickness,
            }}
          />
        );
        break;
      default:
        content = <div className="w-full h-full bg-gray-200 rounded" />;
    }

    return (
      <div
        key={component.id}
        style={style}
        onClick={() => handleComponentSelect(component.id)}
        className="group"
      >
        {content}
        {isSelected && (
          <div className="absolute -top-8 left-0 flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                handleComponentDuplicate(component.id);
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                handleComponentUpdate(component.id, {
                  visible: !component.visible,
                });
              }}
            >
              {component.visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                handleComponentUpdate(component.id, {
                  locked: !component.locked,
                });
              }}
            >
              {component.locked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-6 px-2"
              onClick={(e) => {
                e.stopPropagation();
                handleComponentDelete(component.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const selectedComponentData = components.find(
    (comp) => comp.id === selectedComponent,
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[800px]">
        {/* Component Library */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Components
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="component-library">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {COMPONENT_LIBRARY.map((component, index) => (
                      <Draggable
                        key={component.type}
                        draggableId={component.type}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 border rounded-lg cursor-move hover:bg-gray-50 ${
                              snapshot.isDragging ? "shadow-lg" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <component.icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium text-sm">
                                  {component.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {component.description}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Canvas</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant={
                      previewDevice === "desktop" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setPreviewDevice("desktop")}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewDevice === "tablet" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewDevice("tablet")}
                  >
                    <Tablet className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewDevice === "mobile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewDevice("mobile")}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={showGrid ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowGrid(!showGrid)}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <Droppable droppableId="canvas">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="relative mx-auto border-2 border-dashed border-gray-300 bg-white"
                    style={{
                      ...getDeviceDimensions(),
                      backgroundImage: showGrid
                        ? "radial-gradient(circle, #e5e7eb 1px, transparent 1px)"
                        : "none",
                      backgroundSize: showGrid ? "20px 20px" : "none",
                    }}
                    onClick={() => setSelectedComponent(null)}
                  >
                    {components.map((component) => renderComponent(component))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>

        {/* Properties Panel */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedComponentData ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {
                        COMPONENT_LIBRARY.find(
                          (c) => c.type === selectedComponentData.type,
                        )?.name
                      }
                    </Label>
                    <Badge variant="secondary" className="ml-2">
                      {selectedComponentData.id}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">X Position</Label>
                        <Input
                          type="number"
                          value={selectedComponentData.position.x}
                          onChange={(e) =>
                            handleComponentUpdate(selectedComponentData.id, {
                              position: {
                                ...selectedComponentData.position,
                                x: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Y Position</Label>
                        <Input
                          type="number"
                          value={selectedComponentData.position.y}
                          onChange={(e) =>
                            handleComponentUpdate(selectedComponentData.id, {
                              position: {
                                ...selectedComponentData.position,
                                y: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="h-8"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Width</Label>
                        <Input
                          type="number"
                          value={selectedComponentData.size.width}
                          onChange={(e) =>
                            handleComponentUpdate(selectedComponentData.id, {
                              size: {
                                ...selectedComponentData.size,
                                width: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Height</Label>
                        <Input
                          type="number"
                          value={selectedComponentData.size.height}
                          onChange={(e) =>
                            handleComponentUpdate(selectedComponentData.id, {
                              size: {
                                ...selectedComponentData.size,
                                height: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="h-8"
                        />
                      </div>
                    </div>

                    {/* Component-specific properties */}
                    {selectedComponentData.type === "header" && (
                      <>
                        <div>
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={selectedComponentData.properties.title}
                            onChange={(e) =>
                              handleComponentUpdate(selectedComponentData.id, {
                                properties: {
                                  ...selectedComponentData.properties,
                                  title: e.target.value,
                                },
                              })
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Background Color</Label>
                          <Input
                            type="color"
                            value={
                              selectedComponentData.properties.backgroundColor
                            }
                            onChange={(e) =>
                              handleComponentUpdate(selectedComponentData.id, {
                                properties: {
                                  ...selectedComponentData.properties,
                                  backgroundColor: e.target.value,
                                },
                              })
                            }
                            className="h-8"
                          />
                        </div>
                      </>
                    )}

                    {selectedComponentData.type === "chat-input" && (
                      <>
                        <div>
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={selectedComponentData.properties.placeholder}
                            onChange={(e) =>
                              handleComponentUpdate(selectedComponentData.id, {
                                properties: {
                                  ...selectedComponentData.properties,
                                  placeholder: e.target.value,
                                },
                              })
                            }
                            className="h-8"
                          />
                        </div>
                      </>
                    )}

                    {selectedComponentData.type === "button" && (
                      <>
                        <div>
                          <Label className="text-xs">Button Text</Label>
                          <Input
                            value={selectedComponentData.properties.text}
                            onChange={(e) =>
                              handleComponentUpdate(selectedComponentData.id, {
                                properties: {
                                  ...selectedComponentData.properties,
                                  text: e.target.value,
                                },
                              })
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Variant</Label>
                          <Select
                            value={selectedComponentData.properties.variant}
                            onValueChange={(value) =>
                              handleComponentUpdate(selectedComponentData.id, {
                                properties: {
                                  ...selectedComponentData.properties,
                                  variant: value,
                                },
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">Primary</SelectItem>
                              <SelectItem value="secondary">
                                Secondary
                              </SelectItem>
                              <SelectItem value="outline">Outline</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Select a component to edit its properties
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DragDropContext>
  );
}
