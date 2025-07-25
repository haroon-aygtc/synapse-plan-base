import { IsOptional, IsDateString, IsArray, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class FunnelStep {
  @ApiProperty({ description: 'Step name' })
  name: string;

  @ApiProperty({ description: 'Event type for this step' })
  eventType: string;

  @ApiProperty({ description: 'Additional filters for this step', required: false })
  filters?: Record<string, any>;
}

export class GetConversionFunnelDto {
  @ApiProperty({
    description: 'Start date for funnel analysis',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for funnel analysis',
    required: false,
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Funnel steps to analyze',
    type: [FunnelStep],
    required: false,
  })
  @IsOptional()
  @IsArray()
  steps?: FunnelStep[];

  @ApiProperty({
    description: 'Time window for funnel completion (in minutes)',
    required: false,
    default: 1440,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  timeWindow?: number;

  @ApiProperty({
    description: 'Filter by device types',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  deviceTypes?: string[];

  @ApiProperty({
    description: 'Filter by countries',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  countries?: string[];

  @ApiProperty({
    description: 'Include breakdown by segments',
    required: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSegments?: boolean;
}
