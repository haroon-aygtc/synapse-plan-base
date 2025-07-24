import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ModuleType {
  AGENT = 'agent',
  TOOL = 'tool',
  WORKFLOW = 'workflow',
  KNOWLEDGE = 'knowledge',
  WIDGET = 'widget',
  HITL = 'hitl',
}

export class IntegrationTestStepDto {
  @ApiProperty({ description: 'Step name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Module type', enum: ModuleType })
  @IsEnum(ModuleType)
  moduleType: ModuleType;

  @ApiProperty({ description: 'Module ID' })
  @IsString()
  moduleId: string;

  @ApiProperty({ description: 'Step input data' })
  @IsObject()
  input: Record<string, any>;

  @ApiProperty({ description: 'Expected output' })
  @IsOptional()
  @IsObject()
  expectedOutput?: Record<string, any>;

  @ApiProperty({ description: 'Function name for tools' })
  @IsOptional()
  @IsString()
  functionName?: string;

  @ApiProperty({ description: 'Step configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiProperty({ description: 'Step order' })
  @IsOptional()
  order?: number;

  @ApiProperty({ description: 'Dependencies on other steps' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];
}

export class RunIntegrationTestDto {
  @ApiProperty({ description: 'Integration test name' })
  @IsString()
  testName: string;

  @ApiProperty({ description: 'Test description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Test flow steps',
    type: [IntegrationTestStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegrationTestStepDto)
  testFlow: IntegrationTestStepDto[];

  @ApiProperty({ description: 'Fail fast on first error', default: false })
  @IsOptional()
  @IsBoolean()
  failFast?: boolean;

  @ApiProperty({ description: 'Enable data flow tracking', default: true })
  @IsOptional()
  @IsBoolean()
  trackDataFlow?: boolean;

  @ApiProperty({ description: 'Test configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiProperty({ description: 'Test metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
