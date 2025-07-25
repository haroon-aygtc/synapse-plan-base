import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ConfigurationType {
  AGENT = 'agent',
  TOOL = 'tool',
  WORKFLOW = 'workflow',
  WIDGET = 'widget',
}

export enum IntentType {
  CREATE = 'create',
  MODIFY = 'modify',
  OPTIMIZE = 'optimize',
  ANALYZE = 'analyze',
  EXPLAIN = 'explain',
}

export class ConfigurationContext {
  @ApiProperty({ description: 'Current user role' })
  @IsString()
  userRole: string;

  @ApiProperty({ description: 'Organization context' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Previous configurations for context', required: false })
  @IsOptional()
  @IsArray()
  previousConfigurations?: any[];

  @ApiProperty({ description: 'Current project context', required: false })
  @IsOptional()
  @IsObject()
  projectContext?: Record<string, any>;

  @ApiProperty({ description: 'User preferences', required: false })
  @IsOptional()
  @IsObject()
  userPreferences?: Record<string, any>;
}

export class ProcessNaturalLanguageDto {
  @ApiProperty({ description: 'Natural language description of what to configure' })
  @IsString()
  description: string;

  @ApiProperty({ enum: ConfigurationType, description: 'Type of configuration to generate' })
  @IsEnum(ConfigurationType)
  configurationType: ConfigurationType;

  @ApiProperty({ description: 'Configuration context' })
  @ValidateNested()
  @Type(() => ConfigurationContext)
  context: ConfigurationContext;

  @ApiProperty({ description: 'Additional requirements or constraints', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalRequirements?: string[];

  @ApiProperty({ description: 'Target language for multi-language support', required: false })
  @IsOptional()
  @IsString()
  targetLanguage?: string;
}

export class IntentRecognitionDto {
  @ApiProperty({ description: 'User input text to analyze' })
  @IsString()
  userInput: string;

  @ApiProperty({ description: 'Context for intent recognition' })
  @ValidateNested()
  @Type(() => ConfigurationContext)
  context: ConfigurationContext;

  @ApiProperty({ description: 'Previous conversation history', required: false })
  @IsOptional()
  @IsArray()
  conversationHistory?: Array<{ role: string; content: string; timestamp: Date }>;
}

export class ConfigurationSuggestionDto {
  @ApiProperty({ description: 'Current configuration state' })
  @IsObject()
  currentConfiguration: any;

  @ApiProperty({ description: 'User intent or goal' })
  @IsString()
  userIntent: string;

  @ApiProperty({ description: 'Configuration context' })
  @ValidateNested()
  @Type(() => ConfigurationContext)
  context: ConfigurationContext;

  @ApiProperty({ description: 'Performance metrics for optimization', required: false })
  @IsOptional()
  @IsObject()
  performanceMetrics?: Record<string, number>;
}

export class ValidationOptimizationDto {
  @ApiProperty({ description: 'Configuration to validate and optimize' })
  @IsObject()
  configuration: any;

  @ApiProperty({ enum: ConfigurationType, description: 'Type of configuration' })
  @IsEnum(ConfigurationType)
  configurationType: ConfigurationType;

  @ApiProperty({ description: 'Validation context' })
  @ValidateNested()
  @Type(() => ConfigurationContext)
  context: ConfigurationContext;

  @ApiProperty({ description: 'Target performance metrics', required: false })
  @IsOptional()
  @IsObject()
  targetMetrics?: Record<string, number>;
}

export class LearningFeedbackDto {
  @ApiProperty({ description: 'Configuration that was generated' })
  @IsObject()
  generatedConfiguration: any;

  @ApiProperty({ description: 'User feedback on the configuration' })
  @IsString()
  userFeedback: string;

  @ApiProperty({ description: 'Success metrics', required: false })
  @IsOptional()
  @IsObject()
  successMetrics?: Record<string, number>;

  @ApiProperty({ description: 'User satisfaction rating (1-5)', required: false })
  @IsOptional()
  satisfactionRating?: number;

  @ApiProperty({ description: 'Configuration context' })
  @ValidateNested()
  @Type(() => ConfigurationContext)
  context: ConfigurationContext;
}
