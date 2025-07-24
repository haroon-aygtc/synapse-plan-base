import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SandboxType {
  AGENT = 'agent',
  TOOL = 'tool',
  WORKFLOW = 'workflow',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
}

export class ResourceLimitsDto {
  @ApiProperty({
    description: 'Memory limit (e.g., 512m, 1g)',
    default: '512m',
  })
  @IsString()
  memory: string;

  @ApiProperty({ description: 'CPU limit (e.g., 0.5, 1.0)', default: '0.5' })
  @IsString()
  cpu: string;

  @ApiProperty({ description: 'Timeout in milliseconds', default: 300000 })
  @IsOptional()
  timeout?: number;

  @ApiProperty({ description: 'Allow network access', default: true })
  @IsOptional()
  networkAccess?: boolean;

  @ApiProperty({ description: 'Allowed ports', type: [Number] })
  @IsOptional()
  @IsArray()
  allowedPorts?: number[];
}

export class IsolationConfigDto {
  @ApiProperty({ description: 'Filesystem isolation configuration' })
  @IsOptional()
  @IsObject()
  filesystem?: {
    readOnly: boolean;
    allowedPaths: string[];
  };

  @ApiProperty({ description: 'Network isolation configuration' })
  @IsOptional()
  @IsObject()
  network?: {
    allowedDomains: string[];
    blockedPorts: number[];
  };

  @ApiProperty({ description: 'Environment isolation configuration' })
  @IsOptional()
  @IsObject()
  environment?: {
    allowedEnvVars: string[];
  };
}

export class CreateSandboxDto {
  @ApiProperty({ description: 'Sandbox name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Sandbox description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Sandbox type', enum: SandboxType })
  @IsEnum(SandboxType)
  type: SandboxType;

  @ApiProperty({ description: 'Sandbox configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiProperty({ description: 'Resource limits', type: ResourceLimitsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceLimitsDto)
  resourceLimits?: ResourceLimitsDto;

  @ApiProperty({
    description: 'Isolation configuration',
    type: IsolationConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IsolationConfigDto)
  isolationConfig?: IsolationConfigDto;

  @ApiProperty({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
