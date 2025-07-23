import {
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RoutingConditionsDto {
  @ApiPropertyOptional({ description: 'Target model name' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'Execution type (agent, tool, workflow)',
  })
  @IsOptional()
  @IsString()
  executionType?: string;

  @ApiPropertyOptional({ description: 'Maximum cost threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costThreshold?: number;

  @ApiPropertyOptional({
    description: 'Minimum performance threshold (response time)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  performanceThreshold?: number;

  @ApiPropertyOptional({ description: 'Target organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Target user ID' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class ProviderRoutingRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Rule priority (1-1000)', default: 100 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority: number;

  @ApiProperty({ description: 'Routing conditions' })
  @ValidateNested()
  @Type(() => RoutingConditionsDto)
  conditions: RoutingConditionsDto;

  @ApiProperty({ description: 'Target provider ID' })
  @IsString()
  targetProvider: string;

  @ApiPropertyOptional({ description: 'Fallback provider IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fallbackProviders?: string[];

  @ApiPropertyOptional({
    description: 'Whether the rule is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
