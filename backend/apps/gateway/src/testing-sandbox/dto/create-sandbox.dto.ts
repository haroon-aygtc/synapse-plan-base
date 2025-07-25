import { IsString, IsOptional, IsObject, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResourceLimitsDto {
  @ApiProperty({ example: '512m', description: 'Memory limit' })
  @IsString()
  memory: string;

  @ApiProperty({ example: '0.5', description: 'CPU limit' })
  @IsString()
  cpu: string;

  @ApiProperty({ example: 300000, description: 'Timeout in milliseconds' })
  timeout: number;

  @ApiProperty({ example: true, description: 'Network access allowed' })
  networkAccess: boolean;

  @ApiProperty({ example: [80, 443, 3000], description: 'Allowed ports' })
  @IsArray()
  allowedPorts: number[];
}

export class IsolationConfigDto {
  @ApiProperty()
  @IsObject()
  filesystem: {
    readOnly: boolean;
    allowedPaths: string[];
  };

  @ApiProperty()
  @IsObject()
  network: {
    allowedDomains: string[];
    blockedPorts: number[];
  };

  @ApiProperty()
  @IsObject()
  environment: {
    allowedEnvVars: string[];
  };
}

export class CreateSandboxDto {
  @ApiProperty({ example: 'My Test Sandbox', description: 'Sandbox name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Sandbox for testing agents',
    description: 'Sandbox description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'agent',
    description: 'Sandbox type',
    enum: ['agent', 'tool', 'workflow', 'integration'],
  })
  @IsEnum(['agent', 'tool', 'workflow', 'integration'])
  type: string;

  @ApiPropertyOptional({ description: 'Resource limits configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceLimitsDto)
  resourceLimits?: ResourceLimitsDto;

  @ApiPropertyOptional({ description: 'Isolation configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => IsolationConfigDto)
  isolationConfig?: IsolationConfigDto;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Environment variables' })
  @IsOptional()
  @IsObject()
  environment?: Record<string, any>;
}
