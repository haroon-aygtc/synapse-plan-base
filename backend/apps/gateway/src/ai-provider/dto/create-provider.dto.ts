import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '@database/entities/ai-provider.entity';

class RateLimitsDto {
  @ApiProperty({ description: 'Requests per minute limit' })
  @IsNumber()
  @Min(1)
  requestsPerMinute: number;

  @ApiProperty({ description: 'Tokens per minute limit' })
  @IsNumber()
  @Min(1)
  tokensPerMinute: number;
}

class ProviderConfigDto {
  @ApiProperty({ description: 'API key for the provider' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: 'Base URL for the provider API' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Request timeout in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number;

  @ApiPropertyOptional({ description: 'Maximum number of retries' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ description: 'Rate limits configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RateLimitsDto)
  rateLimits?: RateLimitsDto;

  @ApiPropertyOptional({ description: 'Available models for this provider' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  models?: string[];

  @ApiPropertyOptional({ description: 'Custom headers for requests' })
  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string>;
}

export class CreateProviderDto {
  @ApiProperty({ description: 'Provider name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Provider type', enum: ProviderType })
  @IsEnum(ProviderType)
  type: ProviderType;

  @ApiProperty({ description: 'Provider configuration' })
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  config: ProviderConfigDto;

  @ApiPropertyOptional({
    description: 'Provider priority (1-1000)',
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Cost multiplier for this provider',
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10.0)
  costMultiplier?: number;

  @ApiPropertyOptional({
    description: 'Whether the provider is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
