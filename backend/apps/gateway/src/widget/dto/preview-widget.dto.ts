import { IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PreviewWidgetDto {
  @ApiProperty({
    description: 'Device type for preview',
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop',
  })
  @IsOptional()
  @IsEnum(['desktop', 'mobile', 'tablet'])
  device?: 'desktop' | 'mobile' | 'tablet';

  @ApiProperty({
    description: 'Theme overrides for preview',
    required: false,
  })
  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @ApiProperty({
    description: 'Mock data for preview',
    required: false,
  })
  @IsOptional()
  @IsObject()
  mockData?: Record<string, any>;
}
