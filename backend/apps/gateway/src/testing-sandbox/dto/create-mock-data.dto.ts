import { IsString, IsOptional, IsObject, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MockDataSchemaDto {
  @ApiProperty({
    example: 'object',
    description: 'Data type',
    enum: ['object', 'array', 'string', 'number', 'boolean'],
  })
  @IsEnum(['object', 'array', 'string', 'number', 'boolean'])
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';

  @ApiPropertyOptional({ description: 'Object properties schema' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, MockDataSchemaDto>;

  @ApiPropertyOptional({ description: 'Array items schema' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MockDataSchemaDto)
  items?: MockDataSchemaDto;

  @ApiPropertyOptional({ example: 'email', description: 'String format' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({
    example: '^[a-zA-Z]+$',
    description: 'String pattern',
  })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional({ example: 0, description: 'Minimum number value' })
  @IsOptional()
  minimum?: number;

  @ApiPropertyOptional({ example: 100, description: 'Maximum number value' })
  @IsOptional()
  maximum?: number;

  @ApiPropertyOptional({ example: 1, description: 'Minimum string length' })
  @IsOptional()
  minLength?: number;

  @ApiPropertyOptional({ example: 255, description: 'Maximum string length' })
  @IsOptional()
  maxLength?: number;

  @ApiPropertyOptional({
    example: ['option1', 'option2'],
    description: 'Enum values',
  })
  @IsOptional()
  @IsArray()
  enum?: any[];
}

export class MockDataRuleDto {
  @ApiProperty({ example: 'rule-1', description: 'Rule ID' })
  @IsString()
  id: string;

  @ApiProperty({
    example: 'input.type === "test"',
    description: 'Rule condition',
  })
  @IsString()
  condition: string;

  @ApiProperty({
    example: 'return',
    description: 'Rule action',
    enum: ['return', 'modify', 'delay', 'error'],
  })
  @IsEnum(['return', 'modify', 'delay', 'error'])
  action: 'return' | 'modify' | 'delay' | 'error';

  @ApiPropertyOptional({ description: 'Return value' })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({ example: 1000, description: 'Delay in milliseconds' })
  @IsOptional()
  delay?: number;

  @ApiPropertyOptional({ example: 500, description: 'Error code' })
  @IsOptional()
  errorCode?: number;

  @ApiPropertyOptional({
    example: 'Internal Server Error',
    description: 'Error message',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class CreateMockDataDto {
  @ApiProperty({ example: 'User Mock Data', description: 'Mock data name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Mock data for user objects',
    description: 'Mock data description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'user', description: 'Data type' })
  @IsString()
  dataType: string;

  @ApiProperty({ description: 'Data schema definition' })
  @ValidateNested()
  @Type(() => MockDataSchemaDto)
  schema: MockDataSchemaDto;

  @ApiProperty({ description: 'Mock data content' })
  @IsObject()
  data: any;

  @ApiPropertyOptional({ description: 'Mock data rules' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MockDataRuleDto)
  rules?: MockDataRuleDto[];

  @ApiPropertyOptional({ description: 'Additional configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}
