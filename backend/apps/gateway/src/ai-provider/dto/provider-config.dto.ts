import {
  IsString,
  IsEnum,
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

class BulkProviderConfigDto {
  @ApiProperty({ description: 'Provider name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Provider type', enum: ProviderType })
  @IsEnum(ProviderType)
  type: ProviderType;

  @ApiProperty({ description: 'API key for the provider' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: 'Base URL for the provider API' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Available models for this provider' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  models?: string[];

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

export class ProviderConfigDto extends BulkProviderConfigDto {}
