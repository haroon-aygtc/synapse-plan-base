import { IsString, IsOptional, IsObject, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AnalyticsEventType {
  VIEW = 'view',
  INTERACTION = 'interaction',
  CONVERSION = 'conversion',
  ERROR = 'error',
  CLICK = 'click',
  SCROLL = 'scroll',
  FORM_SUBMIT = 'form_submit',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
}

export class TrackEventDto {
  @ApiProperty({
    description: 'Type of analytics event',
    enum: AnalyticsEventType,
  })
  @IsEnum(AnalyticsEventType)
  eventType: AnalyticsEventType;

  @ApiProperty({ description: 'Session ID for tracking user sessions' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Page URL where event occurred', required: false })
  @IsOptional()
  @IsString()
  pageUrl?: string;

  @ApiProperty({ description: 'User agent string', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'IP address of the user', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'Device type (desktop, mobile, tablet)', required: false })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiProperty({ description: 'Browser information', required: false })
  @IsOptional()
  @IsObject()
  browserInfo?: {
    name: string;
    version: string;
  };

  @ApiProperty({ description: 'Operating system information', required: false })
  @IsOptional()
  @IsString()
  operatingSystem?: string;

  @ApiProperty({ description: 'Geolocation data', required: false })
  @IsOptional()
  @IsObject()
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  @ApiProperty({ description: 'Error message for error events', required: false })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({ description: 'Additional event properties', required: false })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiProperty({ description: 'Event value for conversion tracking', required: false })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiProperty({ description: 'Whether this is a unique visitor', required: false })
  @IsOptional()
  @IsBoolean()
  isUniqueVisitor?: boolean;

  @ApiProperty({ description: 'Whether this is a returning visitor', required: false })
  @IsOptional()
  @IsBoolean()
  isReturningVisitor?: boolean;

  @ApiProperty({ description: 'Page depth in the session', required: false })
  @IsOptional()
  @IsNumber()
  pageDepth?: number;
}