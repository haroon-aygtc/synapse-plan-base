import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WidgetThemeDto {
  @ApiProperty({
    description: 'Primary color in hex format',
    example: '#3b82f6',
  })
  @IsString()
  primaryColor: string;

  @ApiProperty({
    description: 'Secondary color in hex format',
    example: '#64748b',
  })
  @IsString()
  secondaryColor: string;

  @ApiProperty({
    description: 'Background color in hex format',
    example: '#ffffff',
  })
  @IsString()
  backgroundColor: string;

  @ApiProperty({ description: 'Text color in hex format', example: '#1f2937' })
  @IsString()
  textColor: string;

  @ApiProperty({ description: 'Border radius in pixels', example: 8 })
  @IsNumber()
  @Min(0)
  @Max(50)
  borderRadius: number;

  @ApiProperty({ description: 'Font size in pixels', example: 14 })
  @IsNumber()
  @Min(8)
  @Max(24)
  fontSize: number;

  @ApiPropertyOptional({
    description: 'Font family',
    example: 'Inter, sans-serif',
  })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiPropertyOptional({ description: 'Custom CSS styles' })
  @IsOptional()
  @IsString()
  customCSS?: string;
}

export class WidgetLayoutDto {
  @ApiProperty({ description: 'Widget width in pixels', example: 400 })
  @IsNumber()
  @Min(200)
  @Max(1200)
  width: number;

  @ApiProperty({ description: 'Widget height in pixels', example: 600 })
  @IsNumber()
  @Min(300)
  @Max(1000)
  height: number;

  @ApiProperty({
    description: 'Widget position on page',
    enum: [
      'bottom-right',
      'bottom-left',
      'top-right',
      'top-left',
      'center',
      'fullscreen',
    ],
    example: 'bottom-right',
  })
  @IsEnum([
    'bottom-right',
    'bottom-left',
    'top-right',
    'top-left',
    'center',
    'fullscreen',
  ])
  position:
    | 'bottom-right'
    | 'bottom-left'
    | 'top-right'
    | 'top-left'
    | 'center'
    | 'fullscreen';

  @ApiProperty({ description: 'Enable responsive design', example: true })
  @IsBoolean()
  responsive: boolean;

  @ApiPropertyOptional({ description: 'CSS z-index value', example: 1000 })
  @IsOptional()
  @IsNumber()
  zIndex?: number;

  @ApiPropertyOptional({ description: 'Widget margins' })
  @IsOptional()
  @IsObject()
  margin?: { top: number; right: number; bottom: number; left: number };
}

export class WidgetBehaviorDto {
  @ApiProperty({ description: 'Auto-open widget on page load', example: false })
  @IsBoolean()
  autoOpen: boolean;

  @ApiProperty({ description: 'Show welcome message', example: true })
  @IsBoolean()
  showWelcomeMessage: boolean;

  @ApiProperty({ description: 'Enable typing indicator', example: true })
  @IsBoolean()
  enableTypingIndicator: boolean;

  @ApiProperty({ description: 'Enable sound notifications', example: false })
  @IsBoolean()
  enableSoundNotifications: boolean;

  @ApiPropertyOptional({
    description: 'Session timeout in minutes',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  sessionTimeout?: number;

  @ApiPropertyOptional({
    description: 'Maximum messages per session',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  maxMessages?: number;

  @ApiPropertyOptional({ description: 'Enable file upload', example: false })
  @IsOptional()
  @IsBoolean()
  enableFileUpload?: boolean;

  @ApiPropertyOptional({ description: 'Enable voice input', example: false })
  @IsOptional()
  @IsBoolean()
  enableVoiceInput?: boolean;
}

export class WidgetBrandingDto {
  @ApiProperty({ description: 'Show company logo', example: true })
  @IsBoolean()
  showLogo: boolean;

  @ApiPropertyOptional({ description: 'Company name', example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Custom header HTML' })
  @IsOptional()
  @IsString()
  customHeader?: string;

  @ApiPropertyOptional({ description: 'Custom footer HTML' })
  @IsOptional()
  @IsString()
  customFooter?: string;

  @ApiPropertyOptional({
    description: 'Powered by text',
    example: 'Powered by SynapseAI',
  })
  @IsOptional()
  @IsString()
  poweredByText?: string;

  @ApiPropertyOptional({ description: 'Show powered by text', example: true })
  @IsOptional()
  @IsBoolean()
  showPoweredBy?: boolean;
}

export class WidgetSecurityDto {
  @ApiProperty({
    description: 'Allowed domains for widget embedding',
    example: ['example.com', 'app.example.com'],
  })
  @IsArray()
  @IsString({ each: true })
  allowedDomains: string[];

  @ApiProperty({ description: 'Require user authentication', example: false })
  @IsBoolean()
  requireAuth: boolean;

  @ApiProperty({ description: 'Rate limiting configuration' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit?: number;
  };

  @ApiPropertyOptional({ description: 'Enable CORS', example: true })
  @IsOptional()
  @IsBoolean()
  enableCORS?: boolean;

  @ApiPropertyOptional({ description: 'Enable CSRF protection', example: true })
  @IsOptional()
  @IsBoolean()
  csrfProtection?: boolean;

  @ApiPropertyOptional({
    description: 'Encrypt data transmission',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  encryptData?: boolean;
}

export class WidgetConfigurationDto {
  @ApiProperty({ description: 'Widget theme configuration' })
  @IsObject()
  @ValidateNested()
  @Type(() => WidgetThemeDto)
  theme: WidgetThemeDto;

  @ApiProperty({ description: 'Widget layout configuration' })
  @IsObject()
  @ValidateNested()
  @Type(() => WidgetLayoutDto)
  layout: WidgetLayoutDto;

  @ApiProperty({ description: 'Widget behavior configuration' })
  @IsObject()
  @ValidateNested()
  @Type(() => WidgetBehaviorDto)
  behavior: WidgetBehaviorDto;

  @ApiProperty({ description: 'Widget branding configuration' })
  @IsObject()
  @ValidateNested()
  @Type(() => WidgetBrandingDto)
  branding: WidgetBrandingDto;

  @ApiProperty({ description: 'Widget security configuration' })
  @IsObject()
  @ValidateNested()
  @Type(() => WidgetSecurityDto)
  security: WidgetSecurityDto;
}

export class CreateWidgetDto {
  @ApiProperty({ description: 'Widget name', example: 'Customer Support Chat' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Widget description',
    example: 'AI-powered customer support widget',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Widget type',
    enum: ['agent', 'tool', 'workflow'],
    example: 'agent',
  })
  @IsEnum(['agent', 'tool', 'workflow'])
  type: 'agent' | 'tool' | 'workflow';

  @ApiProperty({
    description: 'Source ID (agent, tool, or workflow ID)',
    example: 'uuid-here',
  })
  @IsString()
  sourceId: string;

  @ApiProperty({ description: 'Widget configuration' })
  @IsObject()
  @ValidateNested()
  @Type(() => WidgetConfigurationDto)
  configuration: WidgetConfigurationDto;

  @ApiPropertyOptional({ description: 'Widget active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Template ID if creating from template' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Widget version', example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
