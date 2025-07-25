import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ComponentType {
  INPUT = 'input',
  OUTPUT = 'output',
  PROCESSOR = 'processor',
  CONDITION = 'condition',
  LOOP = 'loop',
  API_CALL = 'api_call',
  TRANSFORM = 'transform',
  VALIDATION = 'validation',
}

export enum ConnectionType {
  DATA = 'data',
  CONTROL = 'control',
  ERROR = 'error',
}

export class ComponentPosition {
  @ApiProperty({ description: 'X coordinate' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Y coordinate' })
  @IsNumber()
  y: number;
}

export class ComponentConnection {
  @ApiProperty({ description: 'Source component ID' })
  @IsString()
  sourceId: string;

  @ApiProperty({ description: 'Source port name' })
  @IsString()
  sourcePort: string;

  @ApiProperty({ description: 'Target component ID' })
  @IsString()
  targetId: string;

  @ApiProperty({ description: 'Target port name' })
  @IsString()
  targetPort: string;

  @ApiProperty({ enum: ConnectionType, description: 'Type of connection' })
  @IsEnum(ConnectionType)
  type: ConnectionType;

  @ApiProperty({ description: 'Connection metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ComponentConfiguration {
  @ApiProperty({ description: 'Component ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Component name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ComponentType, description: 'Type of component' })
  @IsEnum(ComponentType)
  type: ComponentType;

  @ApiProperty({ description: 'Component position' })
  @ValidateNested()
  @Type(() => ComponentPosition)
  position: ComponentPosition;

  @ApiProperty({ description: 'Component configuration' })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: 'Input ports', required: false })
  @IsOptional()
  @IsArray()
  inputPorts?: string[];

  @ApiProperty({ description: 'Output ports', required: false })
  @IsOptional()
  @IsArray()
  outputPorts?: string[];

  @ApiProperty({ description: 'Component metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class VisualBuilderCanvas {
  @ApiProperty({ description: 'Canvas ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Canvas name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Canvas description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Components on the canvas' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentConfiguration)
  components: ComponentConfiguration[];

  @ApiProperty({ description: 'Connections between components' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentConnection)
  connections: ComponentConnection[];

  @ApiProperty({ description: 'Canvas metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateVisualBuilderDto {
  @ApiProperty({ description: 'Builder configuration' })
  @ValidateNested()
  @Type(() => VisualBuilderCanvas)
  canvas: VisualBuilderCanvas;

  @ApiProperty({ description: 'Target configuration type' })
  @IsString()
  configurationType: string;

  @ApiProperty({ description: 'User context' })
  @IsObject()
  context: Record<string, any>;
}

export class ComponentSuggestionDto {
  @ApiProperty({ description: 'Current canvas state' })
  @ValidateNested()
  @Type(() => VisualBuilderCanvas)
  canvas: VisualBuilderCanvas;

  @ApiProperty({ description: 'User intent or goal' })
  @IsString()
  userIntent: string;

  @ApiProperty({ description: 'Selected component ID', required: false })
  @IsOptional()
  @IsString()
  selectedComponentId?: string;

  @ApiProperty({ description: 'Context for suggestions' })
  @IsObject()
  context: Record<string, any>;
}

export class PreviewGenerationDto {
  @ApiProperty({ description: 'Canvas to generate preview for' })
  @ValidateNested()
  @Type(() => VisualBuilderCanvas)
  canvas: VisualBuilderCanvas;

  @ApiProperty({ description: 'Preview type' })
  @IsEnum(['desktop', 'tablet', 'mobile'])
  previewType: 'desktop' | 'tablet' | 'mobile';

  @ApiProperty({ description: 'Include responsive testing', required: false })
  @IsOptional()
  @IsBoolean()
  includeResponsiveTesting?: boolean;

  @ApiProperty({ description: 'Test data for preview', required: false })
  @IsOptional()
  @IsObject()
  testData?: Record<string, any>;
}

export class TemplateGenerationDto {
  @ApiProperty({ description: 'Template description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Template category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Target use case' })
  @IsString()
  useCase: string;

  @ApiProperty({ description: 'Complexity level' })
  @IsEnum(['simple', 'intermediate', 'advanced'])
  complexity: 'simple' | 'intermediate' | 'advanced';

  @ApiProperty({ description: 'Required features', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredFeatures?: string[];

  @ApiProperty({ description: 'Context for template generation' })
  @IsObject()
  context: Record<string, any>;
}

export class ComponentValidationDto {
  @ApiProperty({ description: 'Component to validate' })
  @ValidateNested()
  @Type(() => ComponentConfiguration)
  component: ComponentConfiguration;

  @ApiProperty({ description: 'Canvas context' })
  @ValidateNested()
  @Type(() => VisualBuilderCanvas)
  canvas: VisualBuilderCanvas;

  @ApiProperty({ description: 'Validation context' })
  @IsObject()
  context: Record<string, any>;
}

export class CollaborativeEditingDto {
  @ApiProperty({ description: 'Canvas ID' })
  @IsString()
  canvasId: string;

  @ApiProperty({ description: 'Edit operation' })
  @IsObject()
  operation: {
    type: 'add' | 'update' | 'delete' | 'move' | 'connect';
    componentId?: string;
    data?: any;
    position?: ComponentPosition;
    connection?: ComponentConnection;
  };

  @ApiProperty({ description: 'User making the edit' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Edit timestamp' })
  @IsOptional()
  timestamp?: Date;
}
