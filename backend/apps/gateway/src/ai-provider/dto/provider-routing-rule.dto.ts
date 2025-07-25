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
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class RoutingConditionsDto {
  @ApiPropertyOptional({ description: "Target model name" })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: "Execution type (agent, tool, workflow)",
  })
  @IsOptional()
  @IsString()
  executionType?: string;

  @ApiPropertyOptional({ description: "Maximum cost threshold" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costThreshold?: number;

  @ApiPropertyOptional({
    description: "Minimum performance threshold (response time)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  performanceThreshold?: number;

  @ApiPropertyOptional({ description: "Target organization ID" })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: "Target user ID" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "Request priority level" })
  @IsOptional()
  @IsString()
  priority?: "low" | "medium" | "high" | "urgent";

  @ApiPropertyOptional({ description: "Time-based conditions" })
  @IsOptional()
  @IsObject()
  timeConditions?: {
    startHour?: number;
    endHour?: number;
    daysOfWeek?: number[];
    timezone?: string;
  };

  @ApiPropertyOptional({ description: "Geographic conditions" })
  @IsOptional()
  @IsObject()
  geoConditions?: {
    countries?: string[];
    regions?: string[];
    excludeCountries?: string[];
  };
}

export class ProviderRoutingRuleDto {
  @ApiProperty({ description: "Rule name" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Rule description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Rule priority (1-1000)", default: 100 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority: number;

  @ApiProperty({ description: "Routing conditions" })
  @ValidateNested()
  @Type(() => RoutingConditionsDto)
  conditions: RoutingConditionsDto;

  @ApiProperty({ description: "Target provider ID" })
  @IsString()
  targetProvider: string;

  @ApiPropertyOptional({
    description: "Fallback provider IDs in order of preference",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fallbackProviders?: string[];

  @ApiPropertyOptional({ description: "Weight for load balancing (1-100)" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  weight?: number;

  @ApiPropertyOptional({
    description: "Whether the rule is active",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Rule expiration date" })
  @IsOptional()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: "Additional metadata for the rule" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateRoutingRuleDto extends ProviderRoutingRuleDto {}

export class UpdateRoutingRuleDto {
  @ApiPropertyOptional({ description: "Rule name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Rule description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Rule priority (1-1000)" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ description: "Routing conditions" })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoutingConditionsDto)
  conditions?: RoutingConditionsDto;

  @ApiPropertyOptional({ description: "Target provider ID" })
  @IsOptional()
  @IsString()
  targetProvider?: string;

  @ApiPropertyOptional({ description: "Fallback provider IDs" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fallbackProviders?: string[];

  @ApiPropertyOptional({ description: "Weight for load balancing" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  weight?: number;

  @ApiPropertyOptional({ description: "Whether the rule is active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Rule expiration date" })
  @IsOptional()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RoutingRuleResponseDto {
  @ApiProperty({ description: "Rule ID" })
  id: string;

  @ApiProperty({ description: "Rule name" })
  name: string;

  @ApiProperty({ description: "Rule description" })
  description?: string;

  @ApiProperty({ description: "Rule priority" })
  priority: number;

  @ApiProperty({ description: "Routing conditions" })
  conditions: RoutingConditionsDto;

  @ApiProperty({ description: "Target provider ID" })
  targetProvider: string;

  @ApiProperty({ description: "Fallback provider IDs" })
  fallbackProviders: string[];

  @ApiProperty({ description: "Load balancing weight" })
  weight: number;

  @ApiProperty({ description: "Whether the rule is active" })
  isActive: boolean;

  @ApiProperty({ description: "Rule creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Rule last update date" })
  updatedAt: Date;

  @ApiProperty({ description: "Rule expiration date" })
  expiresAt?: Date;

  @ApiProperty({ description: "Rule usage statistics" })
  stats?: {
    totalMatches: number;
    successfulRoutes: number;
    failedRoutes: number;
    averageResponseTime: number;
    lastUsed?: Date;
  };

  @ApiProperty({ description: "Additional metadata" })
  metadata?: Record<string, any>;
}

export class BulkRoutingRuleOperationDto {
  @ApiProperty({ description: "Operation type" })
  @IsString()
  operation: "activate" | "deactivate" | "delete" | "update_priority";

  @ApiProperty({ description: "Rule IDs to operate on" })
  @IsArray()
  @IsString({ each: true })
  ruleIds: string[];

  @ApiPropertyOptional({ description: "Data for update operations" })
  @IsOptional()
  @IsObject()
  data?: {
    priority?: number;
    isActive?: boolean;
  };
}

export class RoutingRuleTestDto {
  @ApiProperty({ description: "Test request data" })
  @IsObject()
  request: {
    model?: string;
    executionType?: string;
    organizationId?: string;
    userId?: string;
    priority?: string;
    estimatedCost?: number;
    maxResponseTime?: number;
    context?: Record<string, any>;
  };

  @ApiPropertyOptional({ description: "Specific rule IDs to test" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ruleIds?: string[];
}

export class RoutingRuleTestResultDto {
  @ApiProperty({ description: "Matched rules in order of priority" })
  matchedRules: Array<{
    ruleId: string;
    ruleName: string;
    priority: number;
    targetProvider: string;
    matchReason: string;
    confidence: number;
  }>;

  @ApiProperty({ description: "Selected provider" })
  selectedProvider: {
    providerId: string;
    providerName: string;
    selectionReason: string;
    estimatedCost?: number;
    estimatedResponseTime?: number;
  };

  @ApiProperty({ description: "Fallback providers" })
  fallbackProviders: Array<{
    providerId: string;
    providerName: string;
    fallbackReason: string;
  }>;

  @ApiProperty({ description: "Test execution time" })
  executionTime: number;

  @ApiProperty({ description: "Any warnings or recommendations" })
  warnings: string[];
}
