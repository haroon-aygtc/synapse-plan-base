import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WidgetConfiguration } from '@shared/interfaces';

export class CreateWidgetDto {
  @ApiProperty({
    description: 'Widget name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Widget description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Widget type',
    enum: ['agent', 'tool', 'workflow'],
  })
  @IsEnum(['agent', 'tool', 'workflow'])
  type: 'agent' | 'tool' | 'workflow';

  @ApiProperty({
    description: 'Source ID (agent, tool, or workflow ID)',
  })
  @IsString()
  sourceId: string;

  @ApiProperty({
    description: 'Widget configuration',
    required: false,
  })
  @IsOptional()
  @IsObject()
  configuration?: WidgetConfiguration;

  @ApiProperty({
    description: 'Widget active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Widget version',
    default: '1.0.0',
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
