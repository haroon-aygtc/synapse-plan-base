import { ApiProperty } from '@nestjs/swagger';
import { ExecutionStatus } from '@shared/enums';

export class WorkflowResponseDto {
  @ApiProperty({ description: 'Workflow ID' })
  id: string;

  @ApiProperty({ description: 'Workflow name' })
  name: string;

  @ApiProperty({ description: 'Workflow description' })
  description: string;

  @ApiProperty({ description: 'Workflow definition' })
  definition: any;

  @ApiProperty({ description: 'Workflow tags' })
  tags?: string[];

  @ApiProperty({ description: 'Whether the workflow is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Workflow version' })
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

export class WorkflowExecutionResponseDto {
  @ApiProperty({ description: 'Execution ID' })
  id: string;

  @ApiProperty({ description: 'Workflow ID' })
  workflowId: string;

  @ApiProperty({ description: 'Execution status', enum: ExecutionStatus })
  status: ExecutionStatus;

  @ApiProperty({ description: 'Execution input' })
  input: Record<string, any>;

  @ApiProperty({ description: 'Execution output' })
  output?: Record<string, any>;

  @ApiProperty({ description: 'Current step' })
  currentStep?: string;

  @ApiProperty({ description: 'Completed steps' })
  completedSteps: string[];

  @ApiProperty({ description: 'Workflow variables' })
  variables: Record<string, any>;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Completion date' })
  completedAt?: Date;

  @ApiProperty({ description: 'Error message if failed' })
  error?: string;
}
