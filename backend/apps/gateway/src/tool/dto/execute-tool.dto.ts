import {
    IsString,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsNumber,
    IsEnum,
  } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';
  
  enum CallerType {
    AGENT = 'agent',
    WORKFLOW = 'workflow',
    USER = 'user',
  }
  
  export class ExecuteToolDto {
    @ApiProperty({ description: 'Function name to execute' })
    @IsString()
    @IsNotEmpty()
    functionName: string;
  
    @ApiProperty({ description: 'Function parameters' })
    @IsObject()
    parameters: Record<string, any>;
  
    @ApiProperty({ description: 'Caller type', enum: CallerType, required: false })
    @IsOptional()
    @IsEnum(CallerType)
    callerType?: CallerType;
  
    @ApiProperty({ description: 'Caller ID', required: false })
    @IsOptional()
    @IsString()
    callerId?: string;
  
    @ApiProperty({ description: 'Execution timeout in milliseconds', required: false })
    @IsOptional()
    @IsNumber()
    timeout?: number;
  
    @ApiProperty({ description: 'Tool call ID', required: false })
    @IsOptional()
    @IsString()
    toolCallId?: string;
  }
  