import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class AgentResponseDto {
  @ApiProperty({ description: 'Agent ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Agent name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Agent description' })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Agent prompt' })
  @Expose()
  prompt: string;

  @ApiProperty({ description: 'AI model' })
  @Expose()
  model: string;

  @ApiProperty({ description: 'Temperature setting' })
  @Expose()
  temperature: number;

  @ApiProperty({ description: 'Max tokens' })
  @Expose()
  maxTokens: number;

  @ApiPropertyOptional({ description: 'Available tools' })
  @Expose()
  tools?: string[];

  @ApiPropertyOptional({ description: 'Knowledge sources' })
  @Expose()
  knowledgeSources?: string[];

  @ApiPropertyOptional({ description: 'Agent settings' })
  @Expose()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Agent metadata' })
  @Expose()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Agent version' })
  @Expose()
  version: string;

  @ApiPropertyOptional({ description: 'Prompt template ID' })
  @Expose()
  promptTemplateId?: string;

  @ApiPropertyOptional({ description: 'Testing configuration' })
  @Expose()
  testingConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Performance metrics' })
  @Expose()
  performanceMetrics?: {
    successRate: number;
    averageResponseTime: number;
    totalExecutions: number;
    errorRate: number;
    lastUpdated: Date;
  };

  @ApiProperty({ description: 'Whether agent is active' })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Organization ID' })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: 'User ID' })
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Creation date' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;
}
