"use client";

import React, { useState, useCallback, useRef, useMemo, useEffect, Component, ErrorInfo } from "react";
import {
  Card,
  CardContent,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import {
  Trash2,
  Settings,
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
  Type,
  Image,
  MessageSquare,
  Send,
  Mic,
  Paperclip,
  MoreHorizontal,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Widget, WidgetConfiguration } from "@/lib/sdk/types";

interface VisualToolBuilderProps {
  widget: Widget;
  onUpdate: (updates: Partial<Widget>) => void;
  onConfigurationUpdate: (configUpdates: Partial<WidgetConfiguration>) => void;
  className?: string;
  disabled?: boolean;
  onError?: (error: Error, context: string) => void;
}

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class VisualToolBuilderErrorBoundary extends Component<
  React.PropsWithChildren<{ onError?: (error: Error, errorInfo: ErrorInfo) => void }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ onError?: (error: Error, errorInfo: ErrorInfo) => void }>) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {this.state.error?.message || 'An unexpected error occurred in the Visual Tool Builder.'}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
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
  readonly id?: string;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly type?: ComponentType;
  readonly error?: string;
  readonly 'aria-label'?: string;
  readonly 'data-testid'?: string;
}

interface HeaderProperties extends BaseComponentProperties {
  readonly title: string;
  readonly showLogo: boolean;
  readonly backgroundColor: string;
  readonly textColor: string;
  readonly logoUrl?: string;
  readonly subtitle?: string;
}

interface ChatInputProperties extends BaseComponentProperties {
  readonly placeholder: string;
  readonly showSendButton: boolean;
  readonly enableFileUpload: boolean;
  readonly enableVoiceInput: boolean;
  readonly maxLength?: number;
  readonly disabled?: boolean;
}

interface MessageBubbleProperties extends BaseComponentProperties {
  readonly sender: "user" | "assistant";
  readonly message: string;
  readonly timestamp: boolean;
  readonly avatar: boolean;
  readonly avatarUrl?: string;
  readonly isTyping?: boolean;
}

interface ButtonProperties extends BaseComponentProperties {
  readonly text: string;
  readonly variant: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  readonly size: "small" | "medium" | "large";
  readonly disabled: boolean;
  readonly icon?: string;
  readonly onClick?: string;
}

interface ImageProperties extends BaseComponentProperties {
  readonly src: string;
  readonly alt: string;
  readonly rounded: boolean;
  readonly objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  readonly loading?: "lazy" | "eager";
}

interface TextProperties extends BaseComponentProperties {
  readonly content: string;
  readonly fontSize: number;
  readonly fontWeight: "normal" | "medium" | "semibold" | "bold";
  readonly textAlign: "left" | "center" | "right" | "justify";
  readonly color?: string;
  readonly lineHeight?: number;
}

interface DividerProperties extends BaseComponentProperties {
  readonly orientation: "horizontal" | "vertical";
  readonly thickness: number;
  readonly color: string;
  readonly borderStyle?: "solid" | "dashed" | "dotted";
  readonly margin?: number;
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
  readonly id: string;
  readonly type: ComponentType;
  readonly position: ComponentPosition;
  readonly size: ComponentSize;
  readonly properties: ComponentProperties;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly zIndex: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly metadata?: Record<string, unknown>;
  readonly 'data-testid'?: string;
}

interface ComponentLibraryItem {
  readonly type: ComponentType;
  readonly name: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly description: string;
  readonly defaultProps: ComponentProperties;
  readonly category: "layout" | "input" | "display" | "interaction";
  readonly tags?: readonly string[];
  readonly isDeprecated?: boolean;
  readonly minSize?: ComponentSize;
  readonly maxSize?: ComponentSize;
}

type DeviceType = "desktop" | "mobile" | "tablet";

interface DeviceDimensions {
  width: number;
  height: number;
}

// Safe property access helper with proper typing
const safeGetNestedProperty = <T,>(obj: unknown, path: string, defaultValue: T): T => {
  try {
    if (!obj || typeof obj !== 'object') {
      return defaultValue;
    }
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj) as T ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

// Type guard for button properties
const isButtonProperties = (properties: ComponentProperties): properties is ButtonProperties => {
  return 'text' in properties && 'variant' in properties && 'size' in properties;
};

// Type guard for header properties
const isHeaderProperties = (properties: ComponentProperties): properties is HeaderProperties => {
  return 'title' in properties && 'backgroundColor' in properties;
};

// Type guard for chat input properties
const isChatInputProperties = (properties: ComponentProperties): properties is ChatInputProperties => {
  return 'placeholder' in properties && 'showSendButton' in properties;
};

// Type guard for message bubble properties
const isMessageBubbleProperties = (properties: ComponentProperties): properties is MessageBubbleProperties => {
  return 'sender' in properties && 'message' in properties;
};

// Type guard for image properties
const isImageProperties = (properties: ComponentProperties): properties is ImageProperties => {
  return 'src' in properties && 'alt' in properties;
};

// Type guard for text properties
const isTextProperties = (properties: ComponentProperties): properties is TextProperties => {
  return 'content' in properties && 'fontSize' in properties;
};

// Type guard for divider properties
const isDividerProperties = (properties: ComponentProperties): properties is DividerProperties => {
  return 'orientation' in properties && 'thickness' in properties;
};

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
      borderStyle: "solid",
    } as DividerProperties,
  },
];

// Device configurations
const DEVICE_CONFIGS: Record<DeviceType, DeviceDimensions> = {
  mobile: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 400, height: 600 },
};

// Validation functions with comprehensive type checking
const validateComponentProperties = (type: ComponentType, properties: ComponentProperties): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  try {
    if (!properties || typeof properties !== 'object') {
      errors.push('Properties object is required');
      return { isValid: false, errors };
    }

    switch (type) {
      case "header": {
        if (!isHeaderProperties(properties)) {
          errors.push('Invalid header properties structure');
          break;
        }
        const headerProps = properties;
        if (!headerProps.title || typeof headerProps.title !== 'string' || headerProps.title.trim().length === 0) {
          errors.push('Header title is required and must be a non-empty string');
        }
        if (!headerProps.backgroundColor || typeof headerProps.backgroundColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(headerProps.backgroundColor)) {
          errors.push('Header background color must be a valid hex color');
        }
        if (!headerProps.textColor || typeof headerProps.textColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(headerProps.textColor)) {
          errors.push('Header text color must be a valid hex color');
        }
        if (typeof headerProps.showLogo !== 'boolean') {
          errors.push('Header showLogo must be a boolean');
        }
        break;
      }
      case "chat-input": {
        if (!isChatInputProperties(properties)) {
          errors.push('Invalid chat input properties structure');
          break;
        }
        const inputProps = properties;
        if (!inputProps.placeholder || typeof inputProps.placeholder !== 'string') {
          errors.push('Chat input placeholder is required and must be a string');
        }
        if (typeof inputProps.showSendButton !== 'boolean') {
          errors.push('Chat input showSendButton must be a boolean');
        }
        if (typeof inputProps.enableFileUpload !== 'boolean') {
          errors.push('Chat input enableFileUpload must be a boolean');
        }
        if (typeof inputProps.enableVoiceInput !== 'boolean') {
          errors.push('Chat input enableVoiceInput must be a boolean');
        }
        if (inputProps.maxLength !== undefined && (typeof inputProps.maxLength !== 'number' || inputProps.maxLength < 1)) {
          errors.push('Chat input maxLength must be a positive number');
        }
        break;
      }
      case "button": {
        if (!isButtonProperties(properties)) {
          errors.push('Invalid button properties structure');
          break;
        }
        const buttonProps = properties;
        if (!buttonProps.text || typeof buttonProps.text !== 'string' || buttonProps.text.trim().length === 0) {
          errors.push('Button text is required and must be a non-empty string');
        }
        if (!buttonProps.variant || !['primary', 'secondary', 'outline', 'ghost', 'destructive'].includes(buttonProps.variant)) {
          errors.push('Button variant must be one of: primary, secondary, outline, ghost, destructive');
        }
        if (!buttonProps.size || !['small', 'medium', 'large'].includes(buttonProps.size)) {
          errors.push('Button size must be one of: small, medium, large');
        }
        if (typeof buttonProps.disabled !== 'boolean') {
          errors.push('Button disabled must be a boolean');
        }
        break;
      }
      case "image": {
        if (!isImageProperties(properties)) {
          errors.push('Invalid image properties structure');
          break;
        }
        const imageProps = properties;
        if (!imageProps.src || typeof imageProps.src !== 'string') {
          errors.push('Image src is required and must be a string');
        } else {
          try {
            new URL(imageProps.src);
          } catch {
            errors.push('Image src must be a valid URL');
          }
        }
        if (!imageProps.alt || typeof imageProps.alt !== 'string') {
          errors.push('Image alt text is required and must be a string');
        }
        if (typeof imageProps.rounded !== 'boolean') {
          errors.push('Image rounded must be a boolean');
        }
        if (imageProps.objectFit && !['cover', 'contain', 'fill', 'none', 'scale-down'].includes(imageProps.objectFit)) {
          errors.push('Image objectFit must be one of: cover, contain, fill, none, scale-down');
        }
        break;
      }
      case "text": {
        if (!isTextProperties(properties)) {
          errors.push('Invalid text properties structure');
          break;
        }
        const textProps = properties;
        if (!textProps.content || typeof textProps.content !== 'string') {
          errors.push('Text content is required and must be a string');
        }
        if (typeof textProps.fontSize !== 'number' || textProps.fontSize < 8 || textProps.fontSize > 72) {
          errors.push('Text fontSize must be a number between 8 and 72');
        }
        if (!['normal', 'medium', 'semibold', 'bold'].includes(textProps.fontWeight)) {
          errors.push('Text fontWeight must be one of: normal, medium, semibold, bold');
        }
        if (!['left', 'center', 'right', 'justify'].includes(textProps.textAlign)) {
          errors.push('Text textAlign must be one of: left, center, right, justify');
        }
        if (textProps.color && !/^#[0-9A-Fa-f]{6}$/.test(textProps.color)) {
          errors.push('Text color must be a valid hex color');
        }
        break;
      }
      case "divider": {
        if (!isDividerProperties(properties)) {
          errors.push('Invalid divider properties structure');
          break;
        }
        const dividerProps = properties;
        if (!['horizontal', 'vertical'].includes(dividerProps.orientation)) {
          errors.push('Divider orientation must be horizontal or vertical');
        }
        if (typeof dividerProps.thickness !== 'number' || dividerProps.thickness < 1 || dividerProps.thickness > 10) {
          errors.push('Divider thickness must be a number between 1 and 10');
        }
        if (!dividerProps.color || !/^#[0-9A-Fa-f]{6}$/.test(dividerProps.color)) {
          errors.push('Divider color must be a valid hex color');
        }
        if (dividerProps.borderStyle && !['solid', 'dashed', 'dotted'].includes(dividerProps.borderStyle)) {
          errors.push('Divider borderStyle must be one of: solid, dashed, dotted');
        }
        break;
      }
      case "message-bubble": {
        if (!isMessageBubbleProperties(properties)) {
          errors.push('Invalid message bubble properties structure');
          break;
        }
        const bubbleProps = properties;
        if (!['user', 'assistant'].includes(bubbleProps.sender)) {
          errors.push('Message bubble sender must be user or assistant');
        }
        if (!bubbleProps.message || typeof bubbleProps.message !== 'string') {
          errors.push('Message bubble message is required and must be a string');
        }
        if (typeof bubbleProps.timestamp !== 'boolean') {
          errors.push('Message bubble timestamp must be a boolean');
        }
        if (typeof bubbleProps.avatar !== 'boolean') {
          errors.push('Message bubble avatar must be a boolean');
        }
        break;
      }
      default:
        errors.push(`Unknown component type: ${type}`);
    }

    return { isValid: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors };
  }
};

// Component size validation
const validateComponentSize = (size: ComponentSize): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (typeof size.width !== 'number' || size.width < 10 || size.width > 2000) {
    errors.push('Component width must be between 10 and 2000 pixels');
  }
  
  if (typeof size.height !== 'number' || size.height < 10 || size.height > 2000) {
    errors.push('Component height must be between 10 and 2000 pixels');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Component position validation
const validateComponentPosition = (position: ComponentPosition, canvasDimensions: DeviceDimensions): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (typeof position.x !== 'number' || position.x < 0 || position.x > canvasDimensions.width) {
    errors.push(`Component x position must be between 0 and ${canvasDimensions.width}`);
  }
  
  if (typeof position.y !== 'number' || position.y < 0 || position.y > canvasDimensions.height) {
    errors.push(`Component y position must be between 0 and ${canvasDimensions.height}`);
  }
  
  return { isValid: errors.length === 0, errors };
};

function VisualToolBuilderComponent({
  widget,
  onUpdate,
  onConfigurationUpdate,
  className,
  disabled = false,
  onError,
}: VisualToolBuilderProps) {
  // Initialize components with safe property access and validation
  const initializeComponents = useCallback((): WidgetComponent[] => {
    try {
      const primaryColor = safeGetNestedProperty(widget, 'configuration.theme.primaryColor', '#3b82f6');
      const enableFileUpload = false; // Default disabled - not in WidgetBehavior interface
      const enableVoiceInput = false; // Default disabled - not in WidgetBehavior interface
      const widgetName = widget?.name || "Chat Widget";

      const initialComponents: WidgetComponent[] = [
        {
          id: "header-1",
          type: "header",
          position: { x: 0, y: 0 },
          size: { width: 400, height: 60 },
          properties: {
            title: widgetName,
            showLogo: true,
            backgroundColor: primaryColor,
            textColor: "#ffffff",
          } as HeaderProperties,
          visible: true,
          locked: false,
          zIndex: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
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
            maxLength: 1000,
            disabled: false,
          } as ChatInputProperties,
          visible: true,
          locked: false,
          zIndex: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Validate each component
      const validatedComponents = initialComponents.filter(component => {
        const validation = validateComponentProperties(component.type, component.properties);
        if (!validation.isValid) {
          return false;
        }
        return true;
      });

      return validatedComponents;
    } catch (error) {
      return [];
    }
  }, [widget]);

  const [components, setComponents] = useState<WidgetComponent[]>(initializeComponents());
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<DeviceType>("desktop");
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(`${context}: ${error.message}`);
    if (onError) {
      onError(error, context);
    }
    toast({
      title: "Error",
      description: `${context}: ${error.message}`,
      variant: "destructive",
    });
  }, [onError]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (disabled) return;
    
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

        // Generate unique ID with better entropy
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const componentId = `${componentType.type}-${timestamp}-${randomId}`;

        // Calculate position with bounds checking
        const baseX = 50;
        const baseY = 100 + components.length * 80;
        const maxX = deviceDimensions.width - 200;
        const maxY = deviceDimensions.height - 40;
        
        const position = {
          x: snapToGrid 
            ? Math.round(Math.min(baseX, maxX) / 20) * 20 
            : Math.min(baseX, maxX),
          y: snapToGrid 
            ? Math.round(Math.min(baseY, maxY) / 20) * 20 
            : Math.min(baseY, maxY)
        };

        // Determine appropriate size based on component type
        const getDefaultSize = (type: ComponentType): ComponentSize => {
          switch (type) {
            case 'header':
              return { width: Math.min(400, deviceDimensions.width), height: 60 };
            case 'chat-input':
              return { width: Math.min(380, deviceDimensions.width - 20), height: 50 };
            case 'button':
              return { width: 120, height: 40 };
            case 'image':
              return { width: 200, height: 150 };
            case 'text':
              return { width: 200, height: 40 };
            case 'message-bubble':
              return { width: 250, height: 80 };
            case 'divider':
              return { width: 200, height: 2 };
            default:
              return { width: 200, height: 40 };
          }
        };

        const newComponent: WidgetComponent = {
          id: componentId,
          type: componentType.type,
          position,
          size: getDefaultSize(componentType.type),
          properties: { ...componentType.defaultProps },
          visible: true,
          locked: false,
          zIndex: Math.max(0, ...components.map(c => c.zIndex)) + 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Validate component properties
        const validation = validateComponentProperties(newComponent.type, newComponent.properties);
        if (!validation.isValid) {
          throw new Error(`Invalid component properties: ${validation.errors.join(', ')}`);
        }

        // Validate component size
        const sizeValidation = validateComponentSize(newComponent.size);
        if (!sizeValidation.isValid) {
          throw new Error(`Invalid component size: ${sizeValidation.errors.join(', ')}`);
        }

        // Validate component position
        const positionValidation = validateComponentPosition(newComponent.position, deviceDimensions);
        if (!positionValidation.isValid) {
          throw new Error(`Invalid component position: ${positionValidation.errors.join(', ')}`);
        }

        setComponents((prev) => [...prev, newComponent]);
        setSelectedComponent(newComponent.id);

        toast({
          title: "Component Added",
          description: `${componentType.name} component has been added to the canvas.`,
        });
      } else if (
        source.droppableId === "canvas" &&
        destination.droppableId === "canvas" &&
        source.index !== destination.index
      ) {
        // Reorder components
        setComponents((prev) => {
          const newComponents = Array.from(prev);
          const [reorderedItem] = newComponents.splice(source.index, 1);
          if (reorderedItem) {
            newComponents.splice(destination.index, 0, {
              ...reorderedItem,
              updatedAt: new Date(),
            });
          }
          return newComponents;
        });

        toast({
          title: "Component Reordered",
          description: "Component order has been updated.",
        });
      }
    } catch (error) {
      handleError(error as Error, "Drag and drop operation");
    }
  }, [components, snapToGrid, handleError, disabled, deviceDimensions]);

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
    if (disabled) return;
    
    try {
      setComponents((prev) =>
        prev.map((comp) => {
          if (comp.id === componentId) {
            const updatedComponent = { 
              ...comp, 
              ...updates,
              updatedAt: new Date(),
            };

            // Validate updated properties if they exist
            if (updates.properties) {
              const validation = validateComponentProperties(comp.type, updates.properties as ComponentProperties);
              if (!validation.isValid) {
                throw new Error(`Invalid component properties: ${validation.errors.join(', ')}`);
              }
            }

            // Validate updated size if it exists
            if (updates.size) {
              const sizeValidation = validateComponentSize(updates.size);
              if (!sizeValidation.isValid) {
                throw new Error(`Invalid component size: ${sizeValidation.errors.join(', ')}`);
              }
            }

            // Validate updated position if it exists
            if (updates.position) {
              const positionValidation = validateComponentPosition(updates.position, deviceDimensions);
              if (!positionValidation.isValid) {
                throw new Error(`Invalid component position: ${positionValidation.errors.join(', ')}`);
              }
            }

            // Apply grid snapping if enabled
            if (updates.position && snapToGrid) {
              updatedComponent.position = {
                x: Math.round(updates.position.x / 20) * 20,
                y: Math.round(updates.position.y / 20) * 20,
              };
            }

            return updatedComponent;
          }
          return comp;
        }),
      );
    } catch (error) {
      handleError(error as Error, "Component update");
    }
  }, [handleError, disabled, deviceDimensions, snapToGrid]);

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
    if (disabled) return;
    
    try {
      const component = components.find((comp) => comp.id === componentId);
      if (!component) {
        throw new Error("Component not found");
      }

      // Generate unique ID
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const newComponentId = `${component.type}-${timestamp}-${randomId}`;

      // Calculate new position with bounds checking
      const offset = 20;
      const newX = component.position.x + offset;
      const newY = component.position.y + offset;
      const maxX = deviceDimensions.width - component.size.width;
      const maxY = deviceDimensions.height - component.size.height;

      const newPosition = {
        x: Math.min(newX, maxX),
        y: Math.min(newY, maxY),
      };

      // Apply grid snapping if enabled
      if (snapToGrid) {
        newPosition.x = Math.round(newPosition.x / 20) * 20;
        newPosition.y = Math.round(newPosition.y / 20) * 20;
      }

      const newComponent: WidgetComponent = {
        ...component,
        id: newComponentId,
        position: newPosition,
        zIndex: Math.max(0, ...components.map((c) => c.zIndex)) + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate the duplicated component
      const validation = validateComponentProperties(newComponent.type, newComponent.properties);
      if (!validation.isValid) {
        throw new Error(`Invalid duplicated component: ${validation.errors.join(', ')}`);
      }

      setComponents((prev) => [...prev, newComponent]);
      setSelectedComponent(newComponent.id);

      toast({
        title: "Component Duplicated",
        description: "Component has been duplicated successfully.",
      });
    } catch (error) {
      handleError(error as Error, "Component duplication");
    }
  }, [components, snapToGrid, handleError, disabled, deviceDimensions]);

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
          if (!isHeaderProperties(component.properties)) {
            throw new Error('Invalid header properties');
          }
          const headerProps = component.properties;
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
                  role="img"
                />
              )}
            </div>
          );
          break;
        }
        case "chat-input": {
          if (!isChatInputProperties(component.properties)) {
            throw new Error('Invalid chat input properties');
          }
          const inputProps = component.properties;
          content = (
            <div
              className="w-full h-full flex items-center gap-2 px-3 bg-white border border-gray-200 rounded-lg"
              role="group"
              aria-label="Chat input area"
            >
              <input
                type="text"
                className="flex-1 outline-none text-sm"
                placeholder={inputProps.placeholder || "Type your message..."}
                disabled
                aria-label="Message input"
                maxLength={inputProps.maxLength}
              />
              {inputProps.enableFileUpload && (
                <button type="button" aria-label="File upload" className="p-1 hover:bg-gray-100 rounded">
                  <Paperclip className="h-4 w-4 text-gray-400" />
                </button>
              )}
              {inputProps.enableVoiceInput && (
                <button type="button" aria-label="Voice input" className="p-1 hover:bg-gray-100 rounded">
                  <Mic className="h-4 w-4 text-gray-400" />
                </button>
              )}
              {inputProps.showSendButton && (
                <button type="button" aria-label="Send message" className="p-1 hover:bg-gray-100 rounded">
                  <Send className="h-4 w-4 text-blue-500" />
                </button>
              )}
            </div>
          );
          break;
        }
        case "message-bubble": {
          if (!isMessageBubbleProperties(component.properties)) {
            throw new Error('Invalid message bubble properties');
          }
          const bubbleProps = component.properties;
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
              {bubbleProps.avatar && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0" role="img" aria-label="User avatar" />
                </div>
              )}
              <div className="text-sm break-words">
                {bubbleProps.message || "Sample message"}
              </div>
              {bubbleProps.timestamp && (
                <div className="text-xs opacity-70 mt-1" aria-label="Message timestamp">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {bubbleProps.isTyping && (
                <div className="flex gap-1 mt-1" aria-label="Typing indicator">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          );
          break;
        }
        case "button": {
          if (!isButtonProperties(component.properties)) {
            throw new Error('Invalid button properties');
          }
          const buttonProps = component.properties;
          const getButtonClasses = () => {
            const baseClasses = "px-4 py-2 rounded font-medium transition-all duration-200";
            const variantClasses = {
              primary: "bg-blue-500 text-white hover:bg-blue-600",
              secondary: "bg-gray-500 text-white hover:bg-gray-600",
              outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
              ghost: "text-gray-700 hover:bg-gray-100",
              destructive: "bg-red-500 text-white hover:bg-red-600"
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
              variantClasses[buttonProps.variant] || variantClasses.primary,
              sizeClasses[buttonProps.size] || sizeClasses.medium,
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
          if (!isImageProperties(component.properties)) {
            throw new Error('Invalid image properties');
          }
          const imageProps = component.properties;
          content = (
            <img
              src={imageProps.src || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80"}
              alt={imageProps.alt || "Widget image"}
              className={cn(
                "w-full h-full",
                imageProps.rounded ? "rounded-lg" : ""
              )}
              style={{
                objectFit: imageProps.objectFit || 'cover'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80";
                target.alt = "Fallback image";
              }}
              loading={imageProps.loading || "lazy"}
            />
          );
          break;
        }

        case "text": {
          if (!isTextProperties(component.properties)) {
            throw new Error('Invalid text properties');
          }
          const textProps = component.properties;
          content = (
            <div
              className="w-full h-full flex items-center p-2"
              style={{
                fontSize: `${textProps.fontSize || 14}px`,
                fontWeight: textProps.fontWeight || "normal",
                textAlign: textProps.textAlign || "left",
                color: textProps.color,
                lineHeight: textProps.lineHeight || 1.5,
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
          if (!isDividerProperties(component.properties)) {
            throw new Error('Invalid divider properties');
          }
          const dividerProps = component.properties;
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
                borderStyle: dividerProps.borderStyle || 'solid',
                margin: dividerProps.margin ? `${dividerProps.margin}px` : '0',
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
      const errorStyle: React.CSSProperties = {
        position: "absolute",
        left: component.position.x,
        top: component.position.y,
        width: component.size.width,
        height: component.size.height,
        zIndex: component.zIndex,
      };
      return (
        <div
          key={component.id}
          style={errorStyle}
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

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-[800px]", className)}>
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-muted-foreground">Loading Visual Tool Builder...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("p-6", className)}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Visual Tool Builder Error</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <Button
              onClick={clearError}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} data-testid="visual-tool-builder">
      <TooltipProvider delayDuration={300}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[800px]" role="application" aria-label="Visual Tool Builder">
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
                            isDragDisabled={disabled || component.isDeprecated}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "p-3 border rounded-lg transition-all duration-200",
                                  {
                                    "cursor-move hover:bg-gray-50 hover:border-gray-300": !disabled && !component.isDeprecated,
                                    "shadow-lg bg-blue-50 border-blue-200": snapshot.isDragging,
                                    "opacity-50 cursor-not-allowed": disabled || component.isDeprecated,
                                  }
                                )}
                                role="button"
                                tabIndex={disabled || component.isDeprecated ? -1 : 0}
                                aria-label={`Drag ${component.name} component to canvas`}
                                aria-disabled={disabled || component.isDeprecated}
                                data-testid={`component-library-${component.type}`}
                                onKeyDown={(e) => {
                                  if ((e.key === 'Enter' || e.key === ' ') && !disabled && !component.isDeprecated) {
                                    e.preventDefault();
                                    // Simulate drag and drop for keyboard users
                                    const mockResult: DropResult = {
                                      draggableId: component.type,
                                      type: 'DEFAULT',
                                      source: { droppableId: 'component-library', index },
                                      destination: { droppableId: 'canvas', index: components.length },
                                      reason: 'DROP',
                                      mode: 'FLUID',
                                      combine: null,
                                    };
                                    handleDragEnd(mockResult);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <component.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm truncate">
                                      {component.name}
                                      {component.isDeprecated && (
                                        <Badge variant="destructive" className="ml-2 text-xs">
                                          Deprecated
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground line-clamp-2">
                                      {component.description}
                                    </div>
                                    {component.tags && component.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {component.tags.slice(0, 2).map((tag) => (
                                          <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
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
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={showGrid ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowGrid(!showGrid)}
                            aria-label="Toggle grid"
                          >
                            <Grid className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Toggle Grid</TooltipContent>
                      </Tooltip>
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
                          minHeight: deviceDimensions.height,
                        }}
                        role="main"
                        aria-label="Canvas for widget components"
                        data-testid="canvas"
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
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleComponentUpdate(selectedComponentData.id, {
                                  position: {
                                    ...selectedComponentData.position,
                                    x: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className="h-8"
                              min={0}
                              max={deviceDimensions.width}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Y Position</Label>
                            <Input
                              type="number"
                              value={selectedComponentData.position.y}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleComponentUpdate(selectedComponentData.id, {
                                  position: {
                                    ...selectedComponentData.position,
                                    y: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className="h-8"
                              min={0}
                              max={deviceDimensions.height}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Width</Label>
                            <Input
                              type="number"
                              value={selectedComponentData.size.width}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleComponentUpdate(selectedComponentData.id, {
                                  size: {
                                    ...selectedComponentData.size,
                                    width: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className="h-8"
                              min={10}
                              max={2000}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Height</Label>
                            <Input
                              type="number"
                              value={selectedComponentData.size.height}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleComponentUpdate(selectedComponentData.id, {
                                  size: {
                                    ...selectedComponentData.size,
                                    height: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className="h-8"
                              min={10}
                              max={2000}
                            />
                          </div>
                        </div>

                        {/* Component-specific properties */}
                        {selectedComponentData.type === "header" && isHeaderProperties(selectedComponentData.properties) && (
                          <>
                            <div>
                              <Label className="text-xs">Title</Label>
                              <Input
                                value={selectedComponentData.properties.title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  handleComponentUpdate(selectedComponentData.id, {
                                    properties: {
                                      ...selectedComponentData.properties,
                                      title: e.target.value,
                                    },
                                  })
                                }
                                className="h-8"
                                maxLength={100}
                                required
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Background Color</Label>
                              <Input
                                type="color"
                                value={selectedComponentData.properties.backgroundColor}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
                            <div>
                              <Label className="text-xs">Text Color</Label>
                              <Input
                                type="color"
                                value={selectedComponentData.properties.textColor}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  handleComponentUpdate(selectedComponentData.id, {
                                    properties: {
                                      ...selectedComponentData.properties,
                                      textColor: e.target.value,
                                    },
                                  })
                                }
                                className="h-8"
                              />
                            </div>
                          </>
                        )}

                        {selectedComponentData.type === "chat-input" && isChatInputProperties(selectedComponentData.properties) && (
                          <>
                            <div>
                              <Label className="text-xs">Placeholder</Label>
                              <Input
                                value={selectedComponentData.properties.placeholder}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  handleComponentUpdate(selectedComponentData.id, {
                                    properties: {
                                      ...selectedComponentData.properties,
                                      placeholder: e.target.value,
                                    },
                                  })
                                }
                                className="h-8"
                                maxLength={100}
                                required
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Max Length</Label>
                              <Input
                                type="number"
                                value={selectedComponentData.properties.maxLength || 1000}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  handleComponentUpdate(selectedComponentData.id, {
                                    properties: {
                                      ...selectedComponentData.properties,
                                      maxLength: parseInt(e.target.value) || 1000,
                                    },
                                  })
                                }
                                className="h-8"
                                min={1}
                                max={5000}
                              />
                            </div>
                          </>
                        )}

                        {selectedComponentData.type === "button" && isButtonProperties(selectedComponentData.properties) && (
                          <>
                            <div>
                              <Label className="text-xs">Button Text</Label>
                              <Input
                                value={selectedComponentData.properties.text}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  handleComponentUpdate(selectedComponentData.id, {
                                    properties: {
                                      ...selectedComponentData.properties,
                                      text: e.target.value,
                                    },
                                  })
                                }
                                className="h-8"
                                maxLength={50}
                                required
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Variant</Label>
                              <Select
                                value={selectedComponentData.properties.variant}
                                onValueChange={(value: ButtonProperties['variant']) =>
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
                                  <SelectItem value="secondary">Secondary</SelectItem>
                                  <SelectItem value="outline">Outline</SelectItem>
                                  <SelectItem value="ghost">Ghost</SelectItem>
                                  <SelectItem value="destructive">Destructive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Size</Label>
                              <Select
                                value={selectedComponentData.properties.size}
                                onValueChange={(value: ButtonProperties['size']) =>
                                  handleComponentUpdate(selectedComponentData.id, {
                                    properties: {
                                      ...selectedComponentData.properties,
                                      size: value,
                                    },
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="small">Small</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="large">Large</SelectItem>
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
    </div>
  );
}

// Main export with error boundary
export function VisualToolBuilder(props: VisualToolBuilderProps) {
  return (
    <VisualToolBuilderErrorBoundary onError={props.onError as (error: Error, errorInfo: React.ErrorInfo) => void}>
      <VisualToolBuilderComponent {...props} />
    </VisualToolBuilderErrorBoundary>
  );
}