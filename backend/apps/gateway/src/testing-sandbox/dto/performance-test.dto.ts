import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ExecuteTestDto } from './execute-test.dto';

export enum PerformanceTestType {
  LOAD = 'load',
  STRESS = 'stress',
  SPIKE = 'spike',
  VOLUME = 'volume',
  ENDURANCE = 'endurance',
}

export class LoadPatternDto {
  @ApiProperty({ description: 'Pattern type' })
  @IsEnum(['constant', 'ramp-up', 'spike', 'step'])
  type: 'constant' | 'ramp-up' | 'spike' | 'step';

  @ApiProperty({ description: 'Initial load' })
  @IsNumber()
  @Min(1)
  initialLoad: number;

  @ApiProperty({ description: 'Peak load' })
  @IsNumber()
  @Min(1)
  peakLoad: number;

  @ApiProperty({ description: 'Ramp-up duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rampUpDuration?: number;

  @ApiProperty({ description: 'Hold duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  holdDuration?: number;
}

export class PerformanceTestDto {
  @ApiProperty({ description: 'Performance test name' })
  @IsString()
  testName: string;

  @ApiProperty({ description: 'Test description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Performance test type',
    enum: PerformanceTestType,
  })
  @IsEnum(PerformanceTestType)
  testType: PerformanceTestType;

  @ApiProperty({ description: 'Test request to execute', type: ExecuteTestDto })
  @ValidateNested()
  @Type(() => ExecuteTestDto)
  testRequest: ExecuteTestDto;

  @ApiProperty({ description: 'Number of concurrent users', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  concurrency?: number;

  @ApiProperty({ description: 'Test duration in milliseconds', default: 60000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  duration?: number;

  @ApiProperty({ description: 'Requests per second', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rps?: number;

  @ApiProperty({
    description: 'Load pattern configuration',
    type: LoadPatternDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LoadPatternDto)
  loadPattern?: LoadPatternDto;

  @ApiProperty({ description: 'Performance thresholds' })
  @IsOptional()
  @IsObject()
  thresholds?: {
    responseTime?: {
      p50?: number;
      p95?: number;
      p99?: number;
    };
    errorRate?: number;
    throughput?: number;
  };

  @ApiProperty({ description: 'Test configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiProperty({ description: 'Test metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
