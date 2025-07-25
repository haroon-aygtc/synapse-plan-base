import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestWorkflowDto {
  @ApiProperty({ description: 'Workflow ID to test' })
  @IsString()
  workflowId: string;

  @ApiProperty({ description: 'Test input data' })
  @IsObject()
  input: Record<string, any>;

  @ApiProperty({ description: 'Test variables', required: false })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiProperty({ description: 'Mock responses for testing', required: false })
  @IsOptional()
  @IsObject()
  mockResponses?: Record<string, any>;
}
