import { ApiProperty } from '@nestjs/swagger';
import { ExecutionStatus } from '@shared/enums';

export class ToolResponseDto {
  @ApiProperty({ description: 'Tool ID' })
  id: string;

  @ApiProperty({ description: 'Tool name' })
  name: string;

  @ApiProperty({ description: 'Tool description' })
  description: string;

  @ApiProperty({ description: 'Tool schema' })
  schema: any;

  @ApiProperty({ description: 'API endpoint' })
  endpoint: string;

  @ApiProperty({ description: 'HTTP method' })
  method: string;

  @ApiProperty({ description: 'HTTP headers' })
  headers: Record<string, string>;

  @ApiProperty({ description: 'Tool category' })
  category?: string;

  @ApiProperty({ description: 'Tool tags' })
  tags?: string[];

  @ApiProperty({ description: 'Whether the tool is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Tool version' })
  version: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class ToolExecutionResponseDto {
  @ApiProperty({ description: 'Execution ID' })
  id: string;

  @ApiProperty({ description: 'Tool ID' })
  toolId: string;

  @ApiProperty({ description: 'Function name' })
  functionName: string;

  @ApiProperty({ description: 'Execution parameters' })
  parameters: Record<string, any>;

  @ApiProperty({ description: 'Execution result' })
  result?: any;

  @ApiProperty({ description: 'Execution status', enum: ExecutionStatus })
  status: ExecutionStatus;

  @ApiProperty({ description: 'Execution time in milliseconds' })
  executionTime: number;

  @ApiProperty({ description: 'Execution cost' })
  cost?: number;

  @ApiProperty({ description: 'Error message if failed' })
  error?: string;
}
