import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeployWidgetDto {
  @ApiProperty({
    description: 'Deployment environment',
    enum: ['staging', 'production'],
    default: 'production',
  })
  @IsOptional()
  @IsEnum(['staging', 'production'])
  environment?: 'staging' | 'production';

  @ApiProperty({
    description: 'Custom domain for widget deployment',
    required: false,
  })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiProperty({
    description: 'Enable analytics tracking',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableAnalytics?: boolean;

  @ApiProperty({
    description: 'Enable caching for better performance',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableCaching?: boolean;
}
