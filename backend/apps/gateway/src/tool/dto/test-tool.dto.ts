import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestToolDto {
  @ApiProperty({ description: 'Function name to test' })
  @IsString()
  @IsNotEmpty()
  functionName: string;

  @ApiProperty({ description: 'Test parameters' })
  @IsObject()
  parameters: Record<string, any>;

  @ApiProperty({ description: 'Expected result for validation', required: false })
  @IsOptional()
  expectedResult?: any;

  @ApiProperty({ description: 'Workflow ID for context testing', required: false })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiProperty({ description: 'Workflow context data', required: false })
  @IsOptional()
  workflowContext?: {
    stepId?: string;
    stepName?: string;
    stepType?: string;
    previousStepResults?: Record<string, any>;
    workflowVariables?: Record<string, any>;
    executionId?: string;
  };
}
