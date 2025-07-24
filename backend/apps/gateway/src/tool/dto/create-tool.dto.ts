import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsUrl,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

enum AuthType {
  NONE = 'none',
  API_KEY = 'api_key',
  BEARER = 'bearer',
  BASIC = 'basic',
  OAUTH2 = 'oauth2',
}

class AuthenticationConfig {
  @ApiProperty({ description: 'Authentication type', enum: AuthType })
  @IsEnum(AuthType)
  type: AuthType;

  @ApiProperty({ description: 'API key or token', required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ description: 'Username for basic auth', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Password for basic auth', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ description: 'OAuth2 configuration', required: false })
  @IsOptional()
  @IsObject()
  oauth2Config?: {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
}

class RateLimitConfig {
  @ApiProperty({ description: 'Requests per minute' })
  @IsNumber()
  @Min(1)
  @Max(10000)
  requestsPerMinute: number;

  @ApiProperty({ description: 'Burst limit', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  burstLimit?: number;
}

export class CreateToolDto {
  @ApiProperty({ description: 'Tool name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Tool description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Tool schema definition' })
  @IsObject()
  schema: any;

  @ApiProperty({ description: 'API endpoint URL' })
  @IsUrl()
  endpoint: string;

  @ApiProperty({ description: 'HTTP method', enum: HttpMethod })
  @IsEnum(HttpMethod)
  method: HttpMethod;

  @ApiProperty({ description: 'HTTP headers', required: false })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiProperty({ description: 'Authentication configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthenticationConfig)
  authentication?: AuthenticationConfig;

  @ApiProperty({ description: 'Rate limiting configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => RateLimitConfig)
  rateLimit?: RateLimitConfig;

  @ApiProperty({
    description: 'Request timeout in milliseconds',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number;

  @ApiProperty({ description: 'Retry configuration', required: false })
  @IsOptional()
  @IsObject()
  retryConfig?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };

  @ApiProperty({ description: 'Tool category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Tool tags', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Tool icon URL', required: false })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiProperty({ description: 'Tool documentation URL', required: false })
  @IsOptional()
  @IsUrl()
  documentationUrl?: string;

  @ApiProperty({ description: 'Cost per execution in cents', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerExecution?: number;

  @ApiProperty({ description: 'Whether the tool is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Whether the tool is public', required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
