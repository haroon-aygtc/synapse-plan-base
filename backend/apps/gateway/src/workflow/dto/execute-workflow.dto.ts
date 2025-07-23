import {
    IsObject,
    IsOptional,
    IsString,
    IsNumber,
    IsBoolean,
  } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';
  
  export class ExecuteWorkflowDto {
    @ApiProperty({ description: 'Workflow input data' })
    @IsObject()
    input: Record<string, any>;
  
    @ApiProperty({ description: 'Workflow variables', required: false })
    @IsOptional()
    @IsObject()
    variables?: Record<string, any>;
  
    @ApiProperty({ description: 'Execution timeout in milliseconds', required: false })
    @IsOptional()
    @IsNumber()
    timeout?: number;
  
    @ApiProperty({ description: 'Number of retry attempts', required: false })
    @IsOptional()
    @IsNumber()
    retryAttempts?: number;
  
    @ApiProperty({ description: 'Notify on completion', required: false })
    @IsOptional()
    @IsBoolean()
    notifyOnCompletion?: boolean;
  
    @ApiProperty({ description: 'Execution ID', required: false })
    @IsOptional()
    @IsString()
    executionId?: string;
  }
  