import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ComplexityLevel {
  SIMPLE = 'simple',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export class PromptSuggestionsDto {
  @ApiProperty({ description: 'Use case for prompt suggestions' })
  @IsString()
  useCase: string;

  @ApiPropertyOptional({ description: 'Target industry' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Desired tone' })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiPropertyOptional({
    description: 'Complexity level',
    enum: ComplexityLevel,
    default: ComplexityLevel.INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(ComplexityLevel)
  complexity?: ComplexityLevel;
}
