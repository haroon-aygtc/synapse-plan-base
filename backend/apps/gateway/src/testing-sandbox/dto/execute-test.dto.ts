import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TestType {
  AGENT = 'agent',
  TOOL = 'tool',
  WORKFLOW = 'workflow',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
  UNIT = 'unit',
}

export class ExecuteTestDto {
  @ApiProperty({ description: 'Test type', enum: TestType })
  @IsEnum(TestType)
  testType: TestType;

  @ApiProperty({ description: 'Test name' })
  @IsString()
  testName: string;

  @ApiProperty({ description: 'Test data and parameters' })
  @IsObject()
  testData: Record<string, any>;

  @ApiProperty({ description: 'Test configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiProperty({ description: 'Enable streaming response', default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiProperty({ description: 'Test timeout in milliseconds', default: 30000 })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiProperty({ description: 'Enable debug mode', default: false })
  @IsOptional()
  @IsBoolean()
  debug?: boolean;

  @ApiProperty({ description: 'Test metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
