import { IsString, IsOptional, IsObject, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteAgentDto {
  @ApiProperty({ description: 'Input message for the agent' })
  @IsString()
  input: string;

  @ApiPropertyOptional({ description: 'Session ID for conversation context' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Execution context' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Execution metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether to stream the response',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to include tool calls in response',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeToolCalls?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to include knowledge search in response',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeKnowledgeSearch?: boolean;
}
