import {
    IsString,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsArray,
    IsBoolean,
  } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';
  
  export class CreateWorkflowDto {
    @ApiProperty({ description: 'Workflow name' })
    @IsString()
    @IsNotEmpty()
    name: string;
  
    @ApiProperty({ description: 'Workflow description' })
    @IsString()
    @IsNotEmpty()
    description: string;
  
    @ApiProperty({ description: 'Workflow definition' })
    @IsObject()
    definition: {
      nodes: Array<{
        id: string;
        type: 'agent' | 'tool' | 'condition' | 'loop' | 'hitl' | 'start' | 'end';
        position: { x: number; y: number };
        data: Record<string, any>;
      }>;
      edges: Array<{
        id: string;
        source: string;
        target: string;
        condition?: string;
        label?: string;
      }>;
      variables: Record<string, any>;
      settings: {
        timeout: number;
        retryAttempts: number;
        errorHandling: 'stop' | 'continue' | 'retry';
        notifications: boolean;
      };
    };
  
    @ApiProperty({ description: 'Workflow tags', required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
  
    @ApiProperty({ description: 'Whether the workflow is active', required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
  
    @ApiProperty({ description: 'Organization ID' })
    @IsString()
    @IsNotEmpty()
    organizationId: string;
  
    @ApiProperty({ description: 'User ID' })
    @IsString()
    @IsNotEmpty()
    userId: string;
  }
  