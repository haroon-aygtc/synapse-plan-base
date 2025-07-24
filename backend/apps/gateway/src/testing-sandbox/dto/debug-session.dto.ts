import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DebugSessionType {
  AGENT = 'agent',
  TOOL = 'tool',
  WORKFLOW = 'workflow',
  INTEGRATION = 'integration',
}

export enum DebugLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

export class BreakpointDto {
  @ApiProperty({ description: 'Breakpoint ID' })
  @IsString()
  @Expose()
  id: string;

  @ApiProperty({ description: 'Module ID where breakpoint is set' })
  @IsString()
  @Expose()
  moduleId: string;

  @ApiProperty({ description: 'Line number for breakpoint' })
  @IsNumber()
  @Expose()
  line: number;

  @ApiPropertyOptional({ description: 'Condition for conditional breakpoint' })
  @IsOptional()
  @IsString()
  @Expose()
  condition?: string;

  @ApiProperty({ description: 'Whether breakpoint is enabled' })
  @IsBoolean()
  @Expose()
  enabled: boolean;
}

export class WatchExpressionDto {
  @ApiProperty({ description: 'Watch expression ID' })
  @IsString()
  @Expose()
  id: string;

  @ApiProperty({ description: 'Expression to watch' })
  @IsString()
  @Expose()
  expression: string;

  @ApiPropertyOptional({ description: 'Current value of expression' })
  @IsOptional()
  @Expose()
  value?: any;

  @ApiProperty({ description: 'Whether watch is enabled' })
  @IsBoolean()
  @Expose()
  enabled: boolean;
}

export class DebugConfigurationDto {
  @ApiProperty({
    enum: DebugLevel,
    description: 'Debug logging level',
  })
  @IsEnum(DebugLevel)
  @Expose()
  logLevel: DebugLevel;

  @ApiProperty({ description: 'Enable step-by-step debugging' })
  @IsBoolean()
  @Expose()
  stepByStep: boolean;

  @ApiProperty({ description: 'Enable variable inspection' })
  @IsBoolean()
  @Expose()
  variableInspection: boolean;

  @ApiProperty({ description: 'Enable call stack tracking' })
  @IsBoolean()
  @Expose()
  callStackTracking: boolean;

  @ApiProperty({ description: 'Enable performance profiling' })
  @IsBoolean()
  @Expose()
  performanceProfiling: boolean;

  @ApiProperty({
    type: [BreakpointDto],
    description: 'List of breakpoints',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakpointDto)
  @Expose()
  breakpoints: BreakpointDto[];

  @ApiProperty({
    type: [WatchExpressionDto],
    description: 'List of watch expressions',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WatchExpressionDto)
  @Expose()
  watchExpressions: WatchExpressionDto[];

  @ApiPropertyOptional({ description: 'Additional debug settings' })
  @IsOptional()
  @IsObject()
  @Expose()
  additionalSettings?: Record<string, any>;
}

export class CreateDebugSessionDto {
  @ApiProperty({ description: 'Debug session name' })
  @IsString()
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Debug session description' })
  @IsOptional()
  @IsString()
  @Expose()
  description?: string;

  @ApiProperty({
    enum: DebugSessionType,
    description: 'Type of debug session',
  })
  @IsEnum(DebugSessionType)
  @Expose()
  sessionType: DebugSessionType;

  @ApiProperty({ description: 'Target module ID to debug' })
  @IsString()
  @Expose()
  targetModuleId: string;

  @ApiProperty({
    type: DebugConfigurationDto,
    description: 'Debug configuration settings',
  })
  @ValidateNested()
  @Type(() => DebugConfigurationDto)
  @Expose()
  configuration: DebugConfigurationDto;

  @ApiPropertyOptional({ description: 'Initial input data for debugging' })
  @IsOptional()
  @IsObject()
  @Expose()
  initialInput?: any;

  @ApiPropertyOptional({ description: 'Debug session timeout in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Expose()
  timeout?: number;
}

export class DebugSessionDto extends CreateDebugSessionDto {
  @ApiProperty({ description: 'Debug session ID' })
  @IsString()
  @Expose()
  id: string;

  @ApiProperty({ description: 'Sandbox ID' })
  @IsString()
  @Expose()
  sandboxId: string;

  @ApiProperty({ description: 'User ID who created the session' })
  @IsString()
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  @Expose()
  organizationId: string;

  @ApiProperty({ description: 'Debug session status' })
  @IsString()
  @Expose()
  status: string;

  @ApiProperty({ description: 'Session creation timestamp' })
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Session start timestamp' })
  @IsOptional()
  @Expose()
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Session end timestamp' })
  @IsOptional()
  @Expose()
  endedAt?: Date;

  @ApiPropertyOptional({ description: 'Current execution state' })
  @IsOptional()
  @IsObject()
  @Expose()
  currentState?: any;

  @ApiPropertyOptional({ description: 'Debug logs and traces' })
  @IsOptional()
  @IsArray()
  @Expose()
  debugLogs?: Array<{
    timestamp: Date;
    level: DebugLevel;
    message: string;
    data?: any;
    stackTrace?: string;
  }>;
}

export class UpdateDebugSessionDto {
  @ApiPropertyOptional({ description: 'Updated session name' })
  @IsOptional()
  @IsString()
  @Expose()
  name?: string;

  @ApiPropertyOptional({ description: 'Updated session description' })
  @IsOptional()
  @IsString()
  @Expose()
  description?: string;

  @ApiPropertyOptional({
    type: DebugConfigurationDto,
    description: 'Updated debug configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DebugConfigurationDto)
  @Expose()
  configuration?: DebugConfigurationDto;

  @ApiPropertyOptional({ description: 'Updated session status' })
  @IsOptional()
  @IsString()
  @Expose()
  status?: string;
}

export class DebugStepDto {
  @ApiProperty({ description: 'Debug session ID' })
  @IsString()
  @Expose()
  sessionId: string;

  @ApiProperty({
    enum: ['step_into', 'step_over', 'step_out', 'continue', 'pause'],
    description: 'Debug step action',
  })
  @IsEnum(['step_into', 'step_over', 'step_out', 'continue', 'pause'])
  @Expose()
  action: 'step_into' | 'step_over' | 'step_out' | 'continue' | 'pause';

  @ApiPropertyOptional({ description: 'Additional step parameters' })
  @IsOptional()
  @IsObject()
  @Expose()
  parameters?: Record<string, any>;
}

export class DebugVariableDto {
  @ApiProperty({ description: 'Variable name' })
  @IsString()
  @Expose()
  name: string;

  @ApiProperty({ description: 'Variable value' })
  @Expose()
  value: any;

  @ApiProperty({ description: 'Variable type' })
  @IsString()
  @Expose()
  type: string;

  @ApiProperty({ description: 'Variable scope' })
  @IsString()
  @Expose()
  scope: string;

  @ApiPropertyOptional({ description: 'Whether variable is expandable' })
  @IsOptional()
  @IsBoolean()
  @Expose()
  expandable?: boolean;

  @ApiPropertyOptional({ description: 'Child variables if expandable' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebugVariableDto)
  @Expose()
  children?: DebugVariableDto[];
}

export class DebugCallStackDto {
  @ApiProperty({ description: 'Stack frame ID' })
  @IsString()
  @Expose()
  id: string;

  @ApiProperty({ description: 'Function name' })
  @IsString()
  @Expose()
  functionName: string;

  @ApiProperty({ description: 'Module ID' })
  @IsString()
  @Expose()
  moduleId: string;

  @ApiProperty({ description: 'Line number' })
  @IsNumber()
  @Expose()
  line: number;

  @ApiProperty({ description: 'Column number' })
  @IsNumber()
  @Expose()
  column: number;

  @ApiProperty({
    type: [DebugVariableDto],
    description: 'Local variables in this frame',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebugVariableDto)
  @Expose()
  localVariables: DebugVariableDto[];
}

export class DebugSessionStateDto {
  @ApiProperty({ description: 'Debug session ID' })
  @IsString()
  @Expose()
  sessionId: string;

  @ApiProperty({ description: 'Current execution status' })
  @IsString()
  @Expose()
  status: string;

  @ApiProperty({ description: 'Current line being executed' })
  @IsNumber()
  @Expose()
  currentLine: number;

  @ApiProperty({ description: 'Current module being executed' })
  @IsString()
  @Expose()
  currentModule: string;

  @ApiProperty({
    type: [DebugCallStackDto],
    description: 'Current call stack',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebugCallStackDto)
  @Expose()
  callStack: DebugCallStackDto[];

  @ApiProperty({
    type: [DebugVariableDto],
    description: 'Global variables',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebugVariableDto)
  @Expose()
  globalVariables: DebugVariableDto[];

  @ApiPropertyOptional({ description: 'Last error if any' })
  @IsOptional()
  @IsObject()
  @Expose()
  lastError?: {
    message: string;
    stack: string;
    timestamp: Date;
  };
}

export class DebugSessionResponseDto {
  @ApiProperty({ description: 'Debug session ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Session name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Session description' })
  @Expose()
  description?: string;

  @ApiProperty({
    enum: DebugSessionType,
    description: 'Type of debug session',
  })
  @Expose()
  sessionType: DebugSessionType;

  @ApiProperty({ description: 'Target module ID' })
  @Expose()
  targetModuleId: string;

  @ApiProperty({ description: 'Sandbox ID' })
  @Expose()
  sandboxId: string;

  @ApiProperty({ description: 'User ID' })
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Organization ID' })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: 'Session status' })
  @Expose()
  status: string;

  @ApiProperty({
    type: DebugConfigurationDto,
    description: 'Debug configuration',
  })
  @Type(() => DebugConfigurationDto)
  @Expose()
  configuration: DebugConfigurationDto;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Start timestamp' })
  @Expose()
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'End timestamp' })
  @Expose()
  endedAt?: Date;

  @ApiPropertyOptional({
    type: DebugSessionStateDto,
    description: 'Current session state',
  })
  @Type(() => DebugSessionStateDto)
  @Expose()
  currentState?: DebugSessionStateDto;
}
