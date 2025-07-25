import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExplainAgentDto {
  @ApiProperty({ description: 'Agent name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Agent prompt' })
  @IsString()
  prompt: string;

  @ApiProperty({ description: 'AI model being used' })
  @IsString()
  model: string;

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
}
