import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  CreateVisualBuilderDto,
  ComponentSuggestionDto,
  PreviewGenerationDto,
  TemplateGenerationDto,
  ComponentValidationDto,
  CollaborativeEditingDto,
  VisualBuilderCanvas,
  ComponentConfiguration,
  ComponentType,
  ComponentConnection,
} from '../dto/visual-builder.dto';

interface ComponentSuggestion {
  type: ComponentType;
  name: string;
  description: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  reasoning: string;
  compatibility: string[];
  priority: 'high' | 'medium' | 'low';
}

interface PreviewResult {
  previewUrl: string;
  previewData: any;
  responsiveTests: ResponsiveTestResult[];
  validationResults: ValidationResult[];
  performanceMetrics: PerformanceMetrics;
}

interface ResponsiveTestResult {
  device: string;
  screenSize: string;
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

interface ValidationResult {
  componentId: string;
  status: 'valid' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  complexity: number;
}

interface TemplateResult {
  canvas: VisualBuilderCanvas;
  description: string;
  features: string[];
  complexity: string;
  estimatedTime: string;
  instructions: string[];
}

@Injectable()
export class VisualBuilderService {
  private readonly logger = new Logger(VisualBuilderService.name);
  private readonly openai: OpenAI;
  
  // In-memory storage for collaborative editing (in production, use Redis or similar)
  private readonly canvasStates: Map<string, VisualBuilderCanvas> = new Map();
  private readonly activeEditors: Map<string, Set<string>> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async createVisualBuilder(
    dto: CreateVisualBuilderDto,
    userId: string,
    organizationId: string,
  ): Promise<{
    canvas: VisualBuilderCanvas;
    suggestions: ComponentSuggestion[];
    validationResults: ValidationResult[];
  }> {
    this.logger.log(`Creating visual builder for user ${userId}`);

    try {
      // Store canvas state
      this.canvasStates.set(dto.canvas.id, dto.canvas);

      // Validate the canvas
      const validationResults = await this.validateCanvas(dto.canvas);

      // Generate initial suggestions
      const suggestions = await this.generateComponentSuggestions({
        canvas: dto.canvas,
        userIntent: 'Initialize canvas with recommended components',
        context: dto.context,
      });

      this.logger.log(`Created visual builder with ${suggestions.length} suggestions`);
      
      return {
        canvas: dto.canvas,
        suggestions,
        validationResults,
      };
    } catch (error) {
      this.logger.error('Failed to create visual builder', error);
      throw new Error('Failed to create visual builder');
    }
  }

  async generateComponentSuggestions(
    dto: ComponentSuggestionDto,
  ): Promise<ComponentSuggestion[]> {
    this.logger.log('Generating intelligent component suggestions');

    try {
      const prompt = `
Analyze the current visual builder canvas and suggest intelligent components:

Current Canvas: ${JSON.stringify(dto.canvas)}
User Intent: ${dto.userIntent}
Selected Component: ${dto.selectedComponentId || 'None'}
Context: ${JSON.stringify(dto.context)}

Based on the current canvas state and user intent, suggest 3-5 components that would be most helpful.

Respond in JSON format:
{
  "suggestions": [
    {
      "type": "component_type",
      "name": "Component Name",
      "description": "What this component does",
      "config": {
        "default_configuration": "values"
      },
      "position": {
        "x": suggested_x_position,
        "y": suggested_y_position
      },
      "reasoning": "Why this component is suggested",
      "compatibility": ["compatible", "component", "types"],
      "priority": "high|medium|low"
    }
  ]
}

Consider:
1. Workflow logic and common patterns
2. Data flow requirements
3. Error handling needs
4. Integration opportunities
5. User experience optimization
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert visual workflow designer. Provide intelligent, contextual component suggestions in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      
      this.logger.log(`Generated ${result.suggestions?.length || 0} component suggestions`);
      return result.suggestions || [];
    } catch (error) {
      this.logger.error('Failed to generate component suggestions', error);
      throw new Error('Failed to generate component suggestions');
    }
  }

  async generatePreview(
    dto: PreviewGenerationDto,
    userId: string,
    organizationId: string,
  ): Promise<PreviewResult> {
    this.logger.log(`Generating preview for ${dto.previewType} device`);

    try {
      // Validate canvas before preview
      const validationResults = await this.validateCanvas(dto.canvas);

      // Generate preview data
      const previewData = await this.generatePreviewData(dto.canvas, dto.testData);

      // Run responsive tests if requested
      const responsiveTests = dto.includeResponsiveTesting 
        ? await this.runResponsiveTests(dto.canvas, dto.previewType)
        : [];

      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(dto.canvas);

      // Generate preview URL (in production, this would be a real URL)
      const previewUrl = `https://preview.synapseai.com/canvas/${dto.canvas.id}?device=${dto.previewType}`;

      this.logger.log(`Generated preview for canvas ${dto.canvas.id}`);
      
      return {
        previewUrl,
        previewData,
        responsiveTests,
        validationResults,
        performanceMetrics,
      };
    } catch (error) {
      this.logger.error('Failed to generate preview', error);
      throw new Error('Failed to generate preview');
    }
  }

  async generateTemplate(
    dto: TemplateGenerationDto,
    userId: string,
    organizationId: string,
  ): Promise<TemplateResult> {
    this.logger.log(`Generating template for ${dto.category} - ${dto.useCase}`);

    try {
      const prompt = `
Generate a visual builder template based on the following requirements:

Description: ${dto.description}
Category: ${dto.category}
Use Case: ${dto.useCase}
Complexity: ${dto.complexity}
Required Features: ${dto.requiredFeatures?.join(', ') || 'None specified'}
Context: ${JSON.stringify(dto.context)}

Create a complete visual builder canvas with components and connections.

Respond in JSON format:
{
  "canvas": {
    "id": "generated_template_id",
    "name": "Template Name",
    "description": "Template description",
    "components": [
      {
        "id": "component_id",
        "name": "Component Name",
        "type": "component_type",
        "position": {"x": 100, "y": 100},
        "config": {"configuration": "values"},
        "inputPorts": ["input_ports"],
        "outputPorts": ["output_ports"]
      }
    ],
    "connections": [
      {
        "sourceId": "source_component_id",
        "sourcePort": "output_port",
        "targetId": "target_component_id",
        "targetPort": "input_port",
        "type": "data"
      }
    ]
  },
  "description": "Detailed template description",
  "features": ["list", "of", "features"],
  "complexity": "${dto.complexity}",
  "estimatedTime": "estimated implementation time",
  "instructions": ["step", "by", "step", "instructions"]
}

Make the template production-ready and optimized for the specified use case.
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert template generator for visual workflow builders. Create comprehensive, production-ready templates in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      
      this.logger.log(`Generated template with ${result.canvas?.components?.length || 0} components`);
      return result;
    } catch (error) {
      this.logger.error('Failed to generate template', error);
      throw new Error('Failed to generate template');
    }
  }

  async validateComponent(
    dto: ComponentValidationDto,
  ): Promise<{
    isValid: boolean;
    validationResults: ValidationResult[];
    suggestions: string[];
    compatibility: { compatible: string[]; incompatible: string[] };
  }> {
    this.logger.log(`Validating component ${dto.component.id}`);

    try {
      const validationResults: ValidationResult[] = [];
      const suggestions: string[] = [];
      const compatible: string[] = [];
      const incompatible: string[] = [];

      // Basic validation
      if (!dto.component.name || dto.component.name.trim() === '') {
        validationResults.push({
          componentId: dto.component.id,
          status: 'error',
          message: 'Component name is required',
          suggestion: 'Provide a descriptive name for the component',
        });
      }

      if (!dto.component.config || Object.keys(dto.component.config).length === 0) {
        validationResults.push({
          componentId: dto.component.id,
          status: 'warning',
          message: 'Component configuration is empty',
          suggestion: 'Configure the component with appropriate settings',
        });
      }

      // Type-specific validation
      await this.validateComponentByType(dto.component, validationResults, suggestions);

      // Compatibility check
      await this.checkComponentCompatibility(dto.component, dto.canvas, compatible, incompatible);

      const isValid = validationResults.filter(r => r.status === 'error').length === 0;

      this.logger.log(`Component validation completed: ${isValid ? 'valid' : 'invalid'}`);
      
      return {
        isValid,
        validationResults,
        suggestions,
        compatibility: { compatible, incompatible },
      };
    } catch (error) {
      this.logger.error('Failed to validate component', error);
      throw new Error('Failed to validate component');
    }
  }

  async handleCollaborativeEdit(
    dto: CollaborativeEditingDto,
    userId: string,
    organizationId: string,
  ): Promise<{
    success: boolean;
    updatedCanvas?: VisualBuilderCanvas;
    conflicts?: string[];
    activeEditors: string[];
  }> {
    this.logger.log(`Handling collaborative edit for canvas ${dto.canvasId}`);

    try {
      const canvas = this.canvasStates.get(dto.canvasId);
      if (!canvas) {
        throw new Error('Canvas not found');
      }

      // Track active editors
      if (!this.activeEditors.has(dto.canvasId)) {
        this.activeEditors.set(dto.canvasId, new Set());
      }
      this.activeEditors.get(dto.canvasId)!.add(userId);

      // Apply the edit operation
      const updatedCanvas = await this.applyEditOperation(canvas, dto.operation);
      
      // Update canvas state
      this.canvasStates.set(dto.canvasId, updatedCanvas);

      // Check for conflicts (simplified conflict detection)
      const conflicts = await this.detectEditConflicts(dto.canvasId, dto.operation);

      const activeEditors = Array.from(this.activeEditors.get(dto.canvasId) || []);

      this.logger.log(`Collaborative edit applied successfully for canvas ${dto.canvasId}`);
      
      return {
        success: true,
        updatedCanvas,
        conflicts,
        activeEditors,
      };
    } catch (error) {
      this.logger.error('Failed to handle collaborative edit', error);
      return {
        success: false,
        conflicts: [error instanceof Error ? error.message : String(error)],
        activeEditors: [],
      };
    }
  }

  private async validateCanvas(canvas: VisualBuilderCanvas): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate components
    for (const component of canvas.components) {
      if (!component.name || component.name.trim() === '') {
        results.push({
          componentId: component.id,
          status: 'error',
          message: 'Component name is required',
        });
      }

      if (!component.type) {
        results.push({
          componentId: component.id,
          status: 'error',
          message: 'Component type is required',
        });
      }
    }

    // Validate connections
    for (const connection of canvas.connections) {
      const sourceExists = canvas.components.some(c => c.id === connection.sourceId);
      const targetExists = canvas.components.some(c => c.id === connection.targetId);

      if (!sourceExists) {
        results.push({
          componentId: connection.sourceId,
          status: 'error',
          message: 'Source component not found',
        });
      }

      if (!targetExists) {
        results.push({
          componentId: connection.targetId,
          status: 'error',
          message: 'Target component not found',
        });
      }
    }

    return results;
  }

  private async generatePreviewData(canvas: VisualBuilderCanvas, testData?: Record<string, any>): Promise<any> {
    // Generate preview data based on canvas configuration
    const previewData = {
      canvasId: canvas.id,
      components: canvas.components.map(component => ({
        id: component.id,
        name: component.name,
        type: component.type,
        rendered: true,
        data: testData?.[component.id] || this.generateMockData(component.type),
      })),
      connections: canvas.connections,
      timestamp: new Date(),
    };

    return previewData;
  }

  private async runResponsiveTests(canvas: VisualBuilderCanvas, deviceType: string): Promise<ResponsiveTestResult[]> {
    const tests: ResponsiveTestResult[] = [];

    const deviceConfigs = {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 },
    };

    for (const [device, config] of Object.entries(deviceConfigs)) {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check component positioning for device
      for (const component of canvas.components) {
        if (component.position.x > config.width - 100) {
          issues.push(`Component ${component.name} may be cut off on ${device}`);
          recommendations.push(`Adjust position of ${component.name} for ${device} layout`);
        }
      }

      tests.push({
        device,
        screenSize: `${config.width}x${config.height}`,
        passed: issues.length === 0,
        issues,
        recommendations,
      });
    }

    return tests;
  }

  private calculatePerformanceMetrics(canvas: VisualBuilderCanvas): PerformanceMetrics {
    const componentCount = canvas.components.length;
    const connectionCount = canvas.connections.length;
    
    // Simplified performance calculation
    const complexity = componentCount + (connectionCount * 0.5);
    const estimatedLoadTime = Math.max(100, complexity * 10); // ms
    const estimatedRenderTime = Math.max(50, complexity * 5); // ms
    const estimatedMemoryUsage = Math.max(1, complexity * 0.1); // MB

    return {
      loadTime: estimatedLoadTime,
      renderTime: estimatedRenderTime,
      memoryUsage: estimatedMemoryUsage,
      complexity,
    };
  }

  private async validateComponentByType(
    component: ComponentConfiguration,
    validationResults: ValidationResult[],
    suggestions: string[],
  ): Promise<void> {
    switch (component.type) {
      case ComponentType.INPUT:
        if (!component.config.inputType) {
          validationResults.push({
            componentId: component.id,
            status: 'warning',
            message: 'Input type not specified',
            suggestion: 'Specify input type (text, number, file, etc.)',
          });
        }
        break;

      case ComponentType.API_CALL:
        if (!component.config.endpoint) {
          validationResults.push({
            componentId: component.id,
            status: 'error',
            message: 'API endpoint is required',
            suggestion: 'Configure the API endpoint URL',
          });
        }
        break;

      case ComponentType.CONDITION:
        if (!component.config.condition) {
          validationResults.push({
            componentId: component.id,
            status: 'error',
            message: 'Condition logic is required',
            suggestion: 'Define the condition logic',
          });
        }
        break;

      default:
        // Generic validation for other types
        break;
    }
  }

  private async checkComponentCompatibility(
    component: ComponentConfiguration,
    canvas: VisualBuilderCanvas,
    compatible: string[],
    incompatible: string[],
  ): Promise<void> {
    // Check compatibility with existing components
    for (const existingComponent of canvas.components) {
      if (existingComponent.id === component.id) continue;

      const isCompatible = this.areComponentsCompatible(component.type, existingComponent.type);
      
      if (isCompatible) {
        compatible.push(existingComponent.name);
      } else {
        incompatible.push(existingComponent.name);
      }
    }
  }

  private areComponentsCompatible(type1: ComponentType, type2: ComponentType): boolean {
    // Define compatibility rules
    const compatibilityMatrix: Record<ComponentType, ComponentType[]> = {
      [ComponentType.INPUT]: [ComponentType.PROCESSOR, ComponentType.VALIDATION, ComponentType.TRANSFORM],
      [ComponentType.OUTPUT]: [ComponentType.PROCESSOR, ComponentType.TRANSFORM],
      [ComponentType.PROCESSOR]: [ComponentType.INPUT, ComponentType.OUTPUT, ComponentType.CONDITION, ComponentType.API_CALL],
      [ComponentType.CONDITION]: [ComponentType.PROCESSOR, ComponentType.LOOP],
      [ComponentType.LOOP]: [ComponentType.PROCESSOR, ComponentType.CONDITION],
      [ComponentType.API_CALL]: [ComponentType.PROCESSOR, ComponentType.TRANSFORM],
      [ComponentType.TRANSFORM]: [ComponentType.INPUT, ComponentType.OUTPUT, ComponentType.PROCESSOR, ComponentType.API_CALL],
      [ComponentType.VALIDATION]: [ComponentType.INPUT, ComponentType.PROCESSOR],
    };

    return compatibilityMatrix[type1]?.includes(type2) || false;
  }

  private async applyEditOperation(canvas: VisualBuilderCanvas, operation: any): Promise<VisualBuilderCanvas> {
    const updatedCanvas = { ...canvas };

    switch (operation.type) {
      case 'add':
        if (operation.data) {
          updatedCanvas.components.push(operation.data);
        }
        break;

      case 'update':
        if (operation.componentId && operation.data) {
          const index = updatedCanvas.components.findIndex(c => c.id === operation.componentId);
          if (index !== -1) {
            updatedCanvas.components[index] = { ...updatedCanvas.components[index], ...operation.data };
          }
        }
        break;

      case 'delete':
        if (operation.componentId) {
          updatedCanvas.components = updatedCanvas.components.filter(c => c.id !== operation.componentId);
          updatedCanvas.connections = updatedCanvas.connections.filter(
            conn => conn.sourceId !== operation.componentId && conn.targetId !== operation.componentId
          );
        }
        break;

      case 'move':
        if (operation.componentId && operation.position) {
          const component = updatedCanvas.components.find(c => c.id === operation.componentId);
          if (component) {
            component.position = operation.position;
          }
        }
        break;

      case 'connect':
        if (operation.connection) {
          updatedCanvas.connections.push(operation.connection);
        }
        break;
    }

    return updatedCanvas;
  }

  private async detectEditConflicts(canvasId: string, operation: any): Promise<string[]> {
    const conflicts: string[] = [];

    // Simplified conflict detection
    // In production, implement more sophisticated conflict resolution
    const activeEditorCount = this.activeEditors.get(canvasId)?.size || 0;
    
    if (activeEditorCount > 1 && operation.type === 'update') {
      conflicts.push('Multiple users are editing the same canvas');
    }

    return conflicts;
  }

  private generateMockData(componentType: ComponentType): any {
    switch (componentType) {
      case ComponentType.INPUT:
        return { value: 'Sample input data', type: 'text' };
      case ComponentType.OUTPUT:
        return { result: 'Sample output result', format: 'json' };
      case ComponentType.API_CALL:
        return { response: { status: 200, data: 'API response' } };
      case ComponentType.PROCESSOR:
        return { processed: true, result: 'Processed data' };
      default:
        return { data: 'Mock data', timestamp: new Date() };
    }
  }
}