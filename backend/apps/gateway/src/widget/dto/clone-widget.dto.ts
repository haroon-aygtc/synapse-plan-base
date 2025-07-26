import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WidgetConfiguration } from '@shared/interfaces';

export class CloneWidgetDto {
  @ApiProperty({
    description: 'Name for the cloned widget',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Configuration overrides for the cloned widget',
    required: false,
  })
  @IsOptional()
  @IsObject()
  configuration?: Partial<WidgetConfiguration>;
}
