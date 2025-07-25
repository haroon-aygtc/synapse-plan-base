import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeployTemplateDto {
  @ApiPropertyOptional({ description: 'Customizations to apply to the template' })
  @IsOptional()
  @IsObject()
  customizations?: Record<string, any>;
}
