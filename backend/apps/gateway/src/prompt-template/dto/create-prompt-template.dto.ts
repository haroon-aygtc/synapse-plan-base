import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUUID,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class VariableValidationDto {
  @ApiPropertyOptional({ description: 'Minimum value for number type' })
  @IsOptional()
  min?: number;

  @ApiPropertyOptional({ description: 'Maximum value for number type' })
  @IsOptional()
  max?: number;

  @ApiPropertyOptional({ description: 'Regex pattern for string validation' })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional({ description: 'Enum values for validation' })
  @IsOptional()
  @IsArray()
  enum?: any[];
}

class TemplateVariableDto {
  @ApiProperty({ description: 'Variable name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Variable type' })
  @IsString()
  @IsNotEmpty()
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';

  @ApiPropertyOptional({ description: 'Variable description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether the variable is required' })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ description: 'Default value for the variable' })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({ description: 'Validation rules for the variable' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VariableValidationDto)
  validation?: VariableValidationDto;
}

export class CreatePromptTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Template content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Template category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Template version' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables?: TemplateVariableDto[];

  @ApiPropertyOptional({ description: 'Template metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Whether the template is public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Parent template ID for inheritance' })
  @IsOptional()
  @IsUUID()
  parentTemplateId?: string;
}
