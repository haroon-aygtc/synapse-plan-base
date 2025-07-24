import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsObject } from 'class-validator';
import { CreateWidgetDto, WidgetConfigurationDto } from './create-widget.dto';

export class UpdateWidgetDto extends PartialType(CreateWidgetDto) {
  @ApiPropertyOptional({ description: 'Widget name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Widget description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Widget configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Partial<WidgetConfigurationDto>;

  @ApiPropertyOptional({ description: 'Widget active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Widget version' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DeployWidgetDto {
  @ApiPropertyOptional({
    description: 'Deployment environment',
    enum: ['staging', 'production'],
    example: 'production',
  })
  @IsOptional()
  @IsString()
  environment?: 'staging' | 'production';

  @ApiPropertyOptional({
    description: 'Custom domain for widget',
    example: 'widgets.example.com',
  })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({
    description: 'Enable analytics tracking',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enableAnalytics?: boolean;

  @ApiPropertyOptional({ description: 'Enable caching', example: true })
  @IsOptional()
  @IsBoolean()
  enableCaching?: boolean;
}

export class GenerateEmbedCodeDto {
  @ApiPropertyOptional({
    description: 'Embed code format',
    enum: ['javascript', 'iframe', 'react', 'vue', 'angular'],
    example: 'javascript',
  })
  @IsOptional()
  @IsString()
  format?: 'javascript' | 'iframe' | 'react' | 'vue' | 'angular';

  @ApiPropertyOptional({
    description: 'Container ID for JavaScript embed',
    example: 'widget-container',
  })
  @IsOptional()
  @IsString()
  containerId?: string;

  @ApiPropertyOptional({ description: 'Custom width', example: '400px' })
  @IsOptional()
  @IsString()
  width?: string;

  @ApiPropertyOptional({ description: 'Custom height', example: '600px' })
  @IsOptional()
  @IsString()
  height?: string;

  @ApiPropertyOptional({
    description: 'Enable responsive design',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  responsive?: boolean;

  @ApiPropertyOptional({ description: 'Theme overrides' })
  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;
}

export class TestWidgetDto {
  @ApiPropertyOptional({
    description: 'Browsers to test',
    example: ['chrome', 'firefox', 'safari'],
  })
  @IsOptional()
  @IsString({ each: true })
  browsers?: string[];

  @ApiPropertyOptional({
    description: 'Devices to test',
    example: ['desktop', 'mobile', 'tablet'],
  })
  @IsOptional()
  @IsString({ each: true })
  devices?: string[];

  @ApiPropertyOptional({ description: 'Check accessibility', example: true })
  @IsOptional()
  @IsBoolean()
  checkAccessibility?: boolean;

  @ApiPropertyOptional({ description: 'Check performance', example: true })
  @IsOptional()
  @IsBoolean()
  checkPerformance?: boolean;

  @ApiPropertyOptional({ description: 'Check SEO', example: true })
  @IsOptional()
  @IsBoolean()
  checkSEO?: boolean;
}

export class PreviewWidgetDto {
  @ApiPropertyOptional({
    description: 'Device type for preview',
    enum: ['desktop', 'mobile', 'tablet'],
    example: 'desktop',
  })
  @IsOptional()
  @IsString()
  device?: 'desktop' | 'mobile' | 'tablet';

  @ApiPropertyOptional({ description: 'Theme overrides for preview' })
  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Mock data for preview' })
  @IsOptional()
  @IsObject()
  mockData?: Record<string, any>;
}

export class CloneWidgetDto {
  @ApiPropertyOptional({ description: 'Name for cloned widget' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Configuration overrides for cloned widget',
  })
  @IsOptional()
  @IsObject()
  configuration?: Partial<WidgetConfigurationDto>;
}

export class PublishTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Template category',
    example: 'customer-support',
  })
  @IsString()
  category: string;

  @ApiPropertyOptional({
    description: 'Template tags',
    example: ['chat', 'support', 'ai'],
  })
  @IsString({ each: true })
  tags: string[];

  @ApiPropertyOptional({ description: 'Make template public', example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
