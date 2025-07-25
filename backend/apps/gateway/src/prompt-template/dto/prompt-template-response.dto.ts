import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class VariableValidationDto {
  @ApiPropertyOptional()
  @Expose()
  min?: number;

  @ApiPropertyOptional()
  @Expose()
  max?: number;

  @ApiPropertyOptional()
  @Expose()
  pattern?: string;

  @ApiPropertyOptional()
  @Expose()
  enum?: any[];
}

class TemplateVariableDto {
  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  required: boolean;

  @ApiPropertyOptional()
  @Expose()
  defaultValue?: any;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => VariableValidationDto)
  validation?: VariableValidationDto;
}

export class PromptTemplateResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  content: string;

  @ApiProperty()
  @Expose()
  category: string;

  @ApiProperty()
  @Expose()
  version: string;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => TemplateVariableDto)
  variables?: TemplateVariableDto[];

  @ApiPropertyOptional()
  @Expose()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @Expose()
  tags?: string[];

  @ApiProperty()
  @Expose()
  isPublic: boolean;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional()
  @Expose()
  parentTemplateId?: string;

  @ApiProperty()
  @Expose()
  forkCount: number;

  @ApiProperty()
  @Expose()
  usageCount: number;

  @ApiProperty()
  @Expose()
  rating: number;

  @ApiProperty()
  @Expose()
  ratingCount: number;

  @ApiProperty()
  @Expose()
  userId: string;

  @ApiProperty()
  @Expose()
  organizationId: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
