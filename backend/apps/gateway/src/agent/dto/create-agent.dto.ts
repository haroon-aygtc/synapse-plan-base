import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsUUID,
  Min,
  Max,
  Length,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ description: 'Agent name', minLength: 1, maxLength: 255 })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional({ description: 'Agent description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Agent prompt template' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ description: 'AI model to use', default: 'gpt-4' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'Temperature for AI responses',
    minimum: 0,
    maximum: 1,
    default: 0.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Maximum tokens for responses',
    default: 2000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8000)
  @Type(() => Number)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Available tools for the agent' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @ApiPropertyOptional({ description: 'Knowledge sources for the agent' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knowledgeSources?: string[];

  @ApiPropertyOptional({ description: 'Agent settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Agent metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Agent version', default: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Prompt template ID' })
  @IsOptional()
  @IsUUID()
  promptTemplateId?: string;

  @ApiPropertyOptional({ description: 'Testing configuration' })
  @IsOptional()
  @IsObject()
  testingConfig?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether agent is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
