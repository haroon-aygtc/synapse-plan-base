import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyzeAgentDto {
  @ApiProperty({ description: 'Agent name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Agent description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Agent prompt' })
  @IsString()
  prompt: string;

  @ApiProperty({ description: 'AI model being used' })
  @IsString()
  model: string;

  @ApiProperty({ description: 'Temperature setting' })
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature: number;

  @ApiPropertyOptional({ description: 'Available tools' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @ApiPropertyOptional({ description: 'Knowledge sources' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knowledgeSources?: string[];

  @ApiPropertyOptional({ description: 'Performance metrics data' })
  @IsOptional()
  @IsObject()
  performanceMetrics?: Record<string, any>;
}