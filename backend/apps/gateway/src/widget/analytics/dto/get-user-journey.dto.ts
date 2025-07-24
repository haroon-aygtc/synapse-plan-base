import { IsOptional, IsDateString, IsString, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class GetUserJourneyDto {
  @ApiProperty({ 
    description: 'Start date for user journey analysis',
    required: false,
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    description: 'End date for user journey analysis',
    required: false,
    example: '2024-01-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ 
    description: 'Specific session ID to analyze',
    required: false
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ 
    description: 'Minimum session duration in seconds',
    required: false,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  minSessionDuration?: number;

  @ApiProperty({ 
    description: 'Maximum session duration in seconds',
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxSessionDuration?: number;

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
    description: 'Include conversion events in journey',
    required: false,
    default: true
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeConversions?: boolean;

  @ApiProperty({ 
    description: 'Include error events in journey',
    required: false,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeErrors?: boolean;

  @ApiProperty({ 
    description: 'Maximum number of journeys to return',
    required: false,
    default: 100
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiProperty({ 
    description: 'Offset for pagination',
    required: false,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}