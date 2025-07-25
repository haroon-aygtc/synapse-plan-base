import { PartialType } from '@nestjs/swagger';
import { CreateSandboxDto } from './create-sandbox.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSandboxDto extends PartialType(CreateSandboxDto) {
  @ApiPropertyOptional({
    example: 'active',
    description: 'Sandbox status',
    enum: [
      'initializing',
      'active',
      'paused',
      'stopped',
      'failed',
      'deleted',
      'cleaned',
    ],
  })
  @IsOptional()
  @IsEnum([
    'initializing',
    'active',
    'paused',
    'stopped',
    'failed',
    'deleted',
    'cleaned',
  ])
  status?: string;
}
