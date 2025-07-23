import {
  IsString,
  IsObject,
  ValidateNested,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OptimizePromptContextDto {
  @ApiProperty({ description: 'Use case for the agent' })
  @IsString()
  useCase: string;

  @ApiProperty({ description: 'AI model being used' })
  @IsString()
  model: string;

  @ApiProperty({ description: 'Personality traits (optional)' })
  @IsObject()
  personalityTraits?: Record<string, number>;

  @ApiProperty({ description: 'Performance metrics (optional)' })
  @IsObject()
  performanceMetrics?: Record<string, number>;
}

export class OptimizePromptDto {
  @ApiProperty({ description: 'Original prompt to optimize' })
  @IsString()
  @Length(10, 5000)
  prompt: string;

  @ApiProperty({ description: 'Context for optimization', type: OptimizePromptContextDto })
  @ValidateNested()
  @Type(() => OptimizePromptContextDto)
  context: OptimizePromptContextDto;
}