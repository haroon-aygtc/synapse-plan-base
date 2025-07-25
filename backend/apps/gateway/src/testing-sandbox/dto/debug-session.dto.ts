import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DebugBreakpointDto {
  @ApiProperty({ example: 'bp-1', description: 'Breakpoint ID' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'agent-123', description: 'Module ID' })
  @IsString()
  moduleId: string;

  @ApiProperty({ example: 42, description: 'Line number' })
  @IsNumber()
  line: number;

  @ApiPropertyOptional({
    example: 'x > 10',
    description: 'Breakpoint condition',
  })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiProperty({ example: true, description: 'Whether breakpoint is enabled' })
  @IsBoolean()
  enabled: boolean;
}

export class DebugWatchExpressionDto {
  @ApiProperty({ example: 'watch-1', description: 'Watch expression ID' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'user.name', description: 'Expression to watch' })
  @IsString()
  expression: string;

  @ApiPropertyOptional({ description: 'Current value of the expression' })
  @IsOptional()
  value?: any;

  @ApiProperty({
    example: true,
    description: 'Whether watch expression is enabled',
  })
  @IsBoolean()
  enabled: boolean;
}

export class DebugConfigurationDto {
  @ApiProperty({
    example: 'debug',
    description: 'Log level',
    enum: ['error', 'warn', 'info', 'debug', 'trace'],
  })
  @IsEnum(['error', 'warn', 'info', 'debug', 'trace'])
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';

  @ApiProperty({ example: true, description: 'Enable step-by-step execution' })
  @IsBoolean()
  stepByStep: boolean;

  @ApiProperty({ example: true, description: 'Enable variable inspection' })
  @IsBoolean()
  variableInspection: boolean;

  @ApiProperty({ example: true, description: 'Enable call stack tracking' })
  @IsBoolean()
  callStackTracking: boolean;

  @ApiProperty({ example: false, description: 'Enable performance profiling' })
  @IsBoolean()
  performanceProfiling: boolean;

  @ApiProperty({ description: 'Debug breakpoints' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebugBreakpointDto)
  breakpoints: DebugBreakpointDto[];

  @ApiProperty({ description: 'Watch expressions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebugWatchExpressionDto)
  watchExpressions: DebugWatchExpressionDto[];

  @ApiPropertyOptional({ description: 'Additional debug settings' })
  @IsOptional()
  @IsObject()
  additionalSettings?: Record<string, any>;
}

export class DebugSessionDto {
  @ApiPropertyOptional({
    example: 'Debug Session 1',
    description: 'Debug session name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Debug session for agent testing',
    description: 'Debug session description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'agent', description: 'Session type' })
  @IsString()
  sessionType: string;

  @ApiProperty({ example: 'agent-123', description: 'Target module ID' })
  @IsString()
  targetModuleId: string;

  @ApiProperty({ description: 'Debug configuration' })
  @ValidateNested()
  @Type(() => DebugConfigurationDto)
  configuration: DebugConfigurationDto;

  @ApiPropertyOptional({ description: 'Initial input for debugging' })
  @IsOptional()
  @IsObject()
  initialInput?: any;

  @ApiPropertyOptional({
    example: 300000,
    description: 'Debug session timeout in milliseconds',
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;
}
