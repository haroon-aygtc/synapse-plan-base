import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OptimizePromptDto {
  @ApiProperty({ 
    description: 'Current prompt to optimize',
    minLength: 10,
    maxLength: 5000
  })
  @IsString()
  @Length(10, 5000)
  currentPrompt: string;

  @ApiProperty({ description: 'Use case for the prompt' })
  @IsString()
  useCase: string;

  @ApiPropertyOptional({ description: 'Performance issues to address' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  performanceIssues?: string[];

  @ApiPropertyOptional({ 
    description: 'Target metrics to achieve',
    example: { accuracy: 0.9, responseTime: 0.8, relevance: 0.85 }
  })
  @IsOptional()
  @IsObject()
  targetMetrics?: Record<string, number>;
}