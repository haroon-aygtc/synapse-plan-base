import { IsOptional, IsDateString, IsArray, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum PerformanceMetricType {
  LOAD_TIME = 'load_time',
  RESPONSE_TIME = 'response_time',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  CACHE_HIT_RATE = 'cache_hit_rate',
  API_CALLS = 'api_calls',
}

export enum PerformanceAggregation {
  AVERAGE = 'average',
  MEDIAN = 'median',
  P95 = 'p95',
  P99 = 'p99',
  MIN = 'min',
  MAX = 'max',
  SUM = 'sum',
  COUNT = 'count',
}

export class GetPerformanceMetricsDto {
  @ApiProperty({ 
    description: 'Start date for performance metrics',
    required: false,
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    description: 'End date for performance metrics',
    required: false,
    example: '2024-01-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Specific performance metrics to retrieve',
    enum: PerformanceMetricType,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PerformanceMetricType, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  metricTypes?: PerformanceMetricType[];

  @ApiProperty({
    description: 'Aggregation method for metrics',
    enum: PerformanceAggregation,
    required: false,
    default: PerformanceAggregation.AVERAGE,
  })
  @IsOptional()
  @IsEnum(PerformanceAggregation)
  aggregation?: PerformanceAggregation;

  @ApiProperty({ 
    description: 'Filter by device types',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  deviceTypes?: string[];

  @ApiProperty({ 
    description: 'Filter by countries',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  countries?: string[];

  @ApiProperty({ 
    description: 'Filter by browser types',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  browserTypes?: string[];

  @ApiProperty({ 
    description: 'Include historical trends',
    required: false,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeTrends?: boolean;

  @ApiProperty({ 
    description: 'Include performance alerts',
    required: false,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAlerts?: boolean;
}