import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IntegrationTestStepDto {
  @ApiProperty({ example: 'agent-1', description: 'Module ID' })
  @IsString()
  moduleId: string;

  @ApiProperty({
    example: 'agent',
    description: 'Module type',
    enum: ['agent', 'tool', 'workflow'],
  })
  @IsString()
  moduleType: 'agent' | 'tool' | 'workflow';

  @ApiProperty({ description: 'Input data for the module' })
  @IsObject()
  input: any;

  @ApiPropertyOptional({ description: 'Context data' })
  @IsOptional()
  @IsObject()
  context?: any;

  @ApiPropertyOptional({ description: 'Variables for workflow steps' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'execute',
    description: 'Function name for tools',
  })
  @IsOptional()
  @IsString()
  functionName?: string;
}

export class RunIntegrationTestDto {
  @ApiProperty({ example: 'Integration Test 1', description: 'Test name' })
  @IsString()
  testName: string;

  @ApiProperty({ description: 'Test flow steps' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegrationTestStepDto)
  testFlow: IntegrationTestStepDto[];

  @ApiPropertyOptional({ example: true, description: 'Stop on first failure' })
  @IsOptional()
  @IsBoolean()
  failFast?: boolean;

  @ApiPropertyOptional({ description: 'Test configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}
