import { IsOptional, IsArray, IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestWidgetDto {
  @ApiProperty({
    description: 'Browsers to test on',
    type: [String],
    default: ['chrome', 'firefox', 'safari', 'edge'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  browsers?: string[];

  @ApiProperty({
    description: 'Devices to test on',
    type: [String],
    default: ['desktop', 'mobile', 'tablet'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  devices?: string[];

  @ApiProperty({
    description: 'Check accessibility compliance',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  checkAccessibility?: boolean;

  @ApiProperty({
    description: 'Check performance metrics',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  checkPerformance?: boolean;

  @ApiProperty({
    description: 'Check SEO compliance',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  checkSEO?: boolean;
}
