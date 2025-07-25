"use client";

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
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
  TooltipProvider,
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
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Widget, WidgetConfiguration } from "@/lib/sdk/types";
import style from "styled-jsx/style";

interface VisualToolBuilderProps {
  widget: Widget;
  onUpdate: (updates: Partial<Widget>) => void;
  onConfigurationUpdate: (configUpdates: Partial<WidgetConfiguration>) => void;
}

// Component type definitions
type ComponentType =
  | "header"
  | "chat-input"
  | "message-bubble"
  | "button"
  | "image"
  | "text"
  | "divider";

interface ComponentPosition {
  x: number;
  y: number;
}

interface ComponentSize {
  width: number;
  height: number;
}

interface BaseComponentProperties {
  [key: string]: unknown;
}

interface HeaderProperties extends BaseComponentProperties {
  title: string;
  showLogo: boolean;
  backgroundColor: string;
  textColor: string;
}

interface ChatInputProperties extends BaseComponentProperties {
  placeholder: string;
  showSendButton: boolean;
  enableFileUpload: boolean;
  enableVoiceInput: boolean;
}

interface MessageBubbleProperties extends BaseComponentProperties {
  sender: "user" | "assistant";
  message: string;
  timestamp: boolean;
  avatar: boolean;
}

interface ButtonProperties extends BaseComponentProperties {
  text: string;
  variant: "primary" | "secondary" | "outline";
  size: "small" | "medium" | "large";
  disabled: boolean;
}

interface ImageProperties extends BaseComponentProperties {
  src: string;
  alt: string;
  rounded: boolean;
}

interface TextProperties extends BaseComponentProperties {
  content: string;
  fontSize: number;
  fontWeight: "normal" | "medium" | "semibold" | "bold";
  textAlign: "left" | "center" | "right";
}

interface DividerProperties extends BaseComponentProperties {
  orientation: "horizontal" | "vertical";
  thickness: number;
  color: string;
}

type ComponentProperties =
  | HeaderProperties
  | ChatInputProperties
  | MessageBubbleProperties
  | ButtonProperties
  | ImageProperties
  | TextProperties
  | DividerProperties;

interface WidgetComponent {
  id: string;
  type: ComponentType;
  position: ComponentPosition;
  size: ComponentSize;
  properties: ComponentProperties;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

interface ComponentLibraryItem {
  type: ComponentType;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  defaultProps: ComponentProperties;
  category: "layout" | "input" | "display" | "interaction";
}

type DeviceType = "desktop" | "mobile" | "tablet";

interface DeviceDimensions {
  width: number;
  height: number;
}

// Component library with proper typing
const COMPONENT_LIBRARY: ComponentLibraryItem[] = [
  {
    type: "header",
    name: "Header",
    icon: Type,
    description: "Widget header with title and branding",
    category: "layout",
    defaultProps: {
      title: "Chat Widget",
      showLogo: true,
      backgroundColor: "#3b82f6",
      textColor: "#ffffff",
    } as HeaderProperties,
  },
  {
    type: "chat-input",
    name: "Chat Input",
    icon: MessageSquare,
    description: "Text input for user messages",
    category: "input",
    defaultProps: {
      placeholder: "Type your message...",
      showSendButton: true,
      enableFileUpload: false,
      enableVoiceInput: false,
    } as ChatInputProperties,
  },
  {
    type: "message-bubble",
    name: "Message Bubble",
    icon: MessageSquare,
    description: "Chat message display",
    category: "display",
    defaultProps: {
      sender: "user",
      message: "Hello, how can I help you?",
      timestamp: true,
      avatar: true,
    } as MessageBubbleProperties,
  },
  {
    type: "button",
    name: "Action Button",
    icon: Send,
    description: "Interactive button component",
    category: "interaction",
    defaultProps: {
      text: "Send",
      variant: "primary",
      size: "medium",
      disabled: false,
    } as ButtonProperties,
  },
  {
    type: "image",
    name: "Image",
    icon: Image,
    description: "Image display component",
    category: "display",
    defaultProps: {
      src: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80",
      alt: "Widget image",
      rounded: true,
    } as ImageProperties,
  },
  {
    type: "text",
    name: "Text Block",
    icon: Type,
    description: "Static text content",
    category: "display",
    defaultProps: {
      content: "Welcome to our chat widget!",
      fontSize: 14,
      fontWeight: "normal",
      textAlign: "left",
    } as TextProperties,
  },
  {
    type: "divider",
    name: "Divider",
    icon: MoreHorizontal,
    description: "Visual separator line",
    category: "layout",
    defaultProps: {
      orientation: "horizontal",
      thickness: 1,
      color: "#e5e7eb",
    } as DividerProperties,
  },
];

// Device configurations
const DEVICE_CONFIGS: Record<DeviceType, DeviceDimensions> = {
  mobile: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 400, height: 600 },
};

// Validation functions
const validateComponentProperties = (type: ComponentType, properties: ComponentProperties): boolean => {
  try {
    switch (type) {
      case "header":
        const headerProps = properties as HeaderProperties;
        return !!(headerProps.title && headerProps.backgroundColor && headerProps.textColor);
      case "chat-input":
        const inputProps = properties as ChatInputProperties;
        return !!(inputProps.placeholder);
      case "button":
        const buttonProps = properties as ButtonProperties;
        return !!(buttonProps.text && buttonProps.variant);
      case "image":
        const imageProps = properties as ImageProperties;
        return !!(imageProps.src && imageProps.alt);
      case "text":
        const textProps = properties as TextProperties;
        return !!(textProps.content);
      default:
        return true;
    }
  } catch {
    return false;
  }
};

// Safe property access helper
const safeGetNestedProperty = <T,>(obj: unknown, path: string, defaultValue: T): T => {
  try {
    return path.split('.').reduce((current: any, key: string) => current?.[key], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

export function VisualToolBuilder({
  widget,
  onUpdate,
  onConfigurationUpdate,
}: VisualToolBuilderProps) {
  // Initialize components with safe property access
  const initializeComponents = useCallback((): WidgetComponent[] => {
    const primaryColor = safeGetNestedProperty(widget, 'configuration.theme.primaryColor', '#3b82f6');
    const enableFileUpload = safeGetNestedProperty(widget, 'configuration.behavior.enableFileUpload', false);
    const enableVoiceInput = safeGetNestedProperty(widget, 'configuration.behavior.enableVoiceInput', false);

    return [
      {
        id: "header-1",
        type: "header",
        position: { x: 0, y: 0 },
        size: { width: 400, height: 60 },
        properties: {
          title: widget.name || "Chat Widget",
          showLogo: true,
          backgroundColor: primaryColor,
          textColor: "#ffffff",
        } as HeaderProperties,
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
          enableFileUpload,
          enableVoiceInput,
        } as ChatInputProperties,
        visible: true,
        locked: false,
        zIndex: 2,
      },
    ];
  }, [widget]);

  const [components, setComponents] = useState<WidgetComponent[]>(initializeComponents);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<DeviceType>("desktop");
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Update components when widget changes
  useEffect(() => {
    setComponents(initializeComponents());
  }, [initializeComponents]);

  // Memoized device dimensions
  const deviceDimensions = useMemo((): DeviceDimensions => {
    if (previewDevice !== "desktop") {
      return DEVICE_CONFIGS[previewDevice];
    }

    const width = safeGetNestedProperty(widget, 'configuration.layout.width', 400);
    const height = safeGetNestedProperty(widget, 'configuration.layout.height', 600);

    return { width, height };
  }, [previewDevice, widget]);

  // Error handling wrapper
  const handleError = useCallback((error: Error, context: string) => {
    console.error(`VisualToolBuilder Error (${context}):`, error);
    setError(`${context}: ${error.message}`);
    toast({
      title: "Error",
      description: `${context}: ${error.message}`,
      variant: "destructive",
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    try {
      if (!result.destination) return;

      const { source, destination } = result;

      if (
        source.droppableId === "component-library" &&
        destination.droppableId === "canvas"
      ) {
        // Add new component from library
        const componentType = COMPONENT_LIBRARY[source.index];
        if (!componentType) {
          throw new Error("Invalid component type selected");
        }

        const newComponent: WidgetComponent = {
          id: `${componentType.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: componentType.type,
          position: {
            x: snapToGrid ? Math.round(50 / 20) * 20 : 50,
            y: snapToGrid ? Math.round((100 + components.length * 80) / 20) * 20 : 100 + components.length * 80
          },
          size: { width: 200, height: 40 },
          properties: { ...componentType.defaultProps },
          visible: true,
          locked: false,
          zIndex: Math.max(0, ...components.map(c => c.zIndex)) + 1,
        };

        // Validate component properties
        if (!validateComponentProperties(newComponent.type, newComponent.properties)) {
          throw new Error("Invalid component properties");
        }

        setComponents((prev) => [...prev, newComponent]);
        setSelectedComponent(newComponent.id);

        toast({
          title: "Component Added",
          description: `${componentType.name} component has been added to the canvas.`,
        });
      } else if (
        source.droppableId === "canvas" &&
        destination.droppableId === "canvas"
      ) {
        // Reorder components
        setComponents((prev) => {
          const newComponents = Array.from(prev);
          const [reorderedItem] = newComponents.splice(source.index, 1);
          newComponents.splice(destination.index, 0, reorderedItem);
          return newComponents;
        });
      }
    } catch (error) {
      handleError(error as Error, "Drag and drop operation");
    }
  }, [components, snapToGrid, handleError]);

  const handleComponentSelect = useCallback((componentId: string) => {
    try {
      setSelectedComponent(componentId);
      clearError();
    } catch (error) {
      handleError(error as Error, "Component selection");
    }
  }, [clearError, handleError]);

  const handleComponentUpdate = useCallback((
    componentId: string,
    updates: Partial<WidgetComponent>,
  ) => {
    try {
      setComponents((prev) =>
        prev.map((comp) => {
          if (comp.id === componentId) {
            const updatedComponent = { ...comp, ...updates };

            // Validate updated properties if they exist
            if (updates.properties && !validateComponentProperties(comp.type, updates.properties as ComponentProperties)) {
              throw new Error("Invalid component properties");
            }

            return updatedComponent;
          }
          return comp;
        }),
      );
    } catch (error) {
      handleError(error as Error, "Component update");
    }
  }, [handleError]);

  const handleComponentDelete = useCallback((componentId: string) => {
    try {
      setComponents((prev) => prev.filter((comp) => comp.id !== componentId));
      if (selectedComponent === componentId) {
        setSelectedComponent(null);
      }

      toast({
        title: "Component Deleted",
        description: "Component has been removed from the canvas.",
      });
    } catch (error) {
      handleError(error as Error, "Component deletion");
    }
  }, [selectedComponent, handleError]);

  const handleComponentDuplicate = useCallback((componentId: string) => {
    try {
      const component = components.find((comp) => comp.id === componentId);
      if (!component) {
        throw new Error("Component not found");
      }

      const newComponent: WidgetComponent = {
        ...component,
        id: `${component.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          x: snapToGrid ? Math.round((component.position.x + 20) / 20) * 20 : component.position.x + 20,
          y: snapToGrid ? Math.round((component.position.y + 20) / 20) * 20 : component.position.y + 20,
        },
        zIndex: Math.max(0, ...components.map((c) => c.zIndex)) + 1,
      };

      setComponents((prev) => [...prev, newComponent]);
      setSelectedComponent(newComponent.id);

      toast({
        title: "Component Duplicated",
        description: "Component has been duplicated successfully.",
      });
    } catch (error) {
      handleError(error as Error, "Component duplication");
    }
  }, [components, snapToGrid, handleError]);

  const renderComponent = useCallback((component: WidgetComponent) => {
    try {
      const isSelected = selectedComponent === component.id;
      const style: React.CSSProperties = {
        position: "absolute",
        left: component.position.x,
        top: component.position.y,
        width: component.size.width,
        height: component.size.height,
        zIndex: component.zIndex,
        opacity: component.visible ? 1 : 0.5,
        border: isSelected ? "2px solid #3b82f6" : "1px solid transparent",
        borderRadius: "4px",
        cursor: component.locked ? "not-allowed" : "move",
        transition: "all 0.2s ease-in-out",
      };

      let content: React.ReactNode;

      switch (component.type) {
        case "header": {
          const headerProps = component.properties as HeaderProperties;
          content = (
            <div
              className="w-full h-full flex items-center justify-between px-4 rounded"
              style={{
                backgroundColor: headerProps.backgroundColor || "#3b82f6",
                color: headerProps.textColor || "#ffffff",
              }}
              role="banner"
              aria-label="Widget header"
            >
              <span className="font-semibold truncate" title={headerProps.title}>
                {headerProps.title || "Untitled"}
              </span>
              {headerProps.showLogo && (
                <div
                  className="w-6 h-6 bg-white/20 rounded flex-shrink-0"
                  aria-label="Logo placeholder"
                />
              )}
            </div>
          );
          break;
        }
        case "chat-input": {
          const inputProps = component.properties as ChatInputProperties;
          content = (
            <div
              className="w-full h-full flex items-center gap-2 px-3 bg-white border border-gray-200 rounded-lg"
              role="textbox"
              aria-label="Chat input area"
            >
              <input
                type="text"
                className="flex-1 outline-none text-sm"
                placeholder={inputProps.placeholder || "Type your message..."}
                disabled
                aria-label="Message input"
              />
              {inputProps.enableFileUpload && (
                <Paperclip
                  className="h-4 w-4 text-gray-400"
                  aria-label="File upload"
                />
              )}
              {inputProps.enableVoiceInput && (
                <Mic
                  className="h-4 w-4 text-gray-400"
                  aria-label="Voice input"
                />
              )}
              {inputProps.showSendButton && (
                <Send
                  className="h-4 w-4 text-blue-500"
                  aria-label="Send message"
                />
              )}
            </div>
          );
          break;
        }
        case "message-bubble": {
          const bubbleProps = component.properties as MessageBubbleProperties;
          const isUser = bubbleProps.sender === "user";
          content = (
            <div
              className={cn(
                "p-3 rounded-lg max-w-xs",
                isUser
                  ? "bg-blue-500 text-white ml-auto"
                  : "bg-gray-100 text-gray-900"
              )}
              role="article"
              aria-label={`Message from ${bubbleProps.sender}`}
            >
              <div className="text-sm break-words">
                {bubbleProps.message || "Sample message"}
              </div>
              {bubbleProps.timestamp && (
                <div className="text-xs opacity-70 mt-1" aria-label="Message timestamp">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          );
          break;
        }
        case "button": {
          const buttonProps = component.properties as ButtonProperties;
          const getButtonClasses = () => {
            const baseClasses = "px-4 py-2 rounded font-medium transition-all duration-200";
            const variantClasses = {
              primary: "bg-blue-500 text-white hover:bg-blue-600",
              secondary: "bg-gray-500 text-white hover:bg-gray-600",
              outline: "border border-gray-300 text-gray-700 hover:bg-gray-50"
            };
            const sizeClasses = {
              small: "px-2 py-1 text-xs",
              medium: "px-4 py-2 text-sm",
              large: "px-6 py-3 text-base"
            };
            const disabledClasses = buttonProps.disabled
              ? "opacity-50 cursor-not-allowed"
              : "";

            return cn(
              baseClasses,
              variantClasses[buttonProps.variant || "primary"],
              sizeClasses[buttonProps.size || "medium"],
              disabledClasses
            );
          };

          content = (
            <button
              className={getButtonClasses()}
              disabled={buttonProps.disabled}
              aria-label={`Action button: ${buttonProps.text}`}
              type="button"
            >
              {buttonProps.text || "Button"}
            </button>
          );
          break;
        }
        case "image": {
          const imageProps = component.properties as ImageProperties;
          content = (
            <img
              src={imageProps.src || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80"}
              alt={imageProps.alt || "Widget image"}
              className={cn(
                "w-full h-full object-cover",
                imageProps.rounded ? "rounded-lg" : ""
              )}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80";
              }}
              loading="lazy"
            />
          );
          break;
        }

        case "text": {
          const textProps = component.properties as TextProperties;
          content = (
            <div
              className="w-full h-full flex items-center p-2"
              style={{
                fontSize: `${textProps.fontSize || 14}px`,
                fontWeight: textProps.fontWeight || "normal",
                textAlign: textProps.textAlign || "left",
              }}
              role="text"
              aria-label="Text content"
            >
              <span className="break-words">
                {textProps.content || "Sample text content"}
              </span>
            </div>
          );
          break;
        }

        case "divider": {
          const dividerProps = component.properties as DividerProperties;
          content = (
            <div
              className={cn(
                dividerProps.orientation === "horizontal"
                  ? "w-full border-t"
                  : "h-full border-l"
              )}
              style={{
                borderWidth: `${dividerProps.thickness || 1}px`,
                borderColor: dividerProps.color || "#e5e7eb",
              }}
              role="separator"
              aria-orientation={dividerProps.orientation || "horizontal"}
            />
          );
          break;
        }

        default:
          content = (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded">
              <div className="text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                <div>Unknown Component</div>
                <div className="text-xs">Type: {component.type}</div>
              </div>
            </div>
          );
    }

    return (
      <div
        key={component.id}
        style={style}
        onClick={() => handleComponentSelect(component.id)}
        className="group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        role="button"
        tabIndex={0}
        aria-label={`${component.type} component${isSelected ? ' (selected)' : ''}`}
        aria-selected={isSelected}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleComponentSelect(component.id);
          } else if (e.key === 'Delete' && isSelected) {
            e.preventDefault();
            handleComponentDelete(component.id);
          } else if (e.key === 'Escape' && isSelected) {
            e.preventDefault();
            setSelectedComponent(null);
          }
        }}
      >
        {content}
        {isSelected && (
          <div className="absolute -top-8 left-0 flex gap-1 bg-white border rounded shadow-sm p-1 z-50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    handleComponentDuplicate(component.id);
                  }}
                  aria-label="Duplicate component"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    handleComponentUpdate(component.id, {
                      visible: !component.visible,
                    });
                  }}
                  aria-label={component.visible ? "Hide component" : "Show component"}
                >
                  {component.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{component.visible ? "Hide" : "Show"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    handleComponentUpdate(component.id, {
                      locked: !component.locked,
                    });
                  }}
                  aria-label={component.locked ? "Unlock component" : "Lock component"}
                >
                  {component.locked ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Unlock className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{component.locked ? "Unlock" : "Lock"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    handleComponentDelete(component.id);
                  }}
                  aria-label="Delete component"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    );
  } catch (error) {
    handleError(error as Error, `Rendering component ${component.id}`);
    return (
      <div
        key={component.id}
        style={style as React.CSSProperties}
        className="bg-red-100 border-2 border-red-300 rounded p-2 flex items-center justify-center"
        role="alert"
        aria-label="Component render error"
      >
        <div className="text-center text-red-600">
          <AlertTriangle className="h-6 w-6 mx-auto mb-1" />
          <div className="text-xs">Render Error</div>
          <div className="text-xs opacity-75">{component.type}</div>
        </div>
      </div>
    );
  }
}, [selectedComponent, handleComponentSelect, handleComponentUpdate, handleComponentDelete, handleComponentDuplicate, handleError]);

  const selectedComponentData = components.find(
    (comp) => comp.id === selectedComponent,
  );

  // Error boundary component
  if (error) {
    return (
      <TooltipProvider>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">Visual Tool Builder Error</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={clearError} variant="outline">
            Try Again
          </Button>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
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
                    role="listbox"
                    aria-label="Component library"
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={previewDevice === "desktop" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreviewDevice("desktop")}
                        aria-label="Desktop preview"
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Desktop Preview</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={previewDevice === "tablet" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreviewDevice("tablet")}
                        aria-label="Tablet preview"
                      >
                        <Tablet className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Tablet Preview</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={previewDevice === "mobile" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreviewDevice("mobile")}
                        aria-label="Mobile preview"
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mobile Preview</TooltipContent>
                  </Tooltip>
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
                      ...deviceDimensions,
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
                            value={selectedComponentData.properties.title as string}
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
                              selectedComponentData.properties.backgroundColor as string
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
                            value={selectedComponentData.properties.placeholder as string}
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
                            value={selectedComponentData.properties.text as string}
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
                            value={selectedComponentData.properties.variant as string }
                            onValueChange={(value) =>
                              handleComponentUpdate(selectedComponentData.id, {
                                properties: {
                                  ...(selectedComponentData.properties as ButtonProperties),
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
    </TooltipProvider>
  );
}
