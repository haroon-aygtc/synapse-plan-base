import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  ValidateNested,
  IsUrl,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AuthenticationType {
  NONE = 'none',
  API_KEY = 'api_key',
  BEARER_TOKEN = 'bearer_token',
  BASIC_AUTH = 'basic_auth',
  OAUTH2 = 'oauth2',
  JWT = 'jwt',
  CUSTOM = 'custom',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export enum ParameterType {
  QUERY = 'query',
  PATH = 'path',
  HEADER = 'header',
  BODY = 'body',
  FORM = 'form',
}

export class APIEndpointAnalysisDto {
  @ApiProperty({ description: 'API endpoint URL' })
  @IsUrl()
  endpoint: string;

  @ApiProperty({ enum: HttpMethod, description: 'HTTP method' })
  @IsEnum(HttpMethod)
  method: HttpMethod;

  @ApiProperty({ description: 'Request headers', required: false })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiProperty({ description: 'Request body for analysis', required: false })
  @IsOptional()
  @IsObject()
  requestBody?: any;

  @ApiProperty({ description: 'Query parameters for analysis', required: false })
  @IsOptional()
  @IsObject()
  queryParams?: Record<string, any>;

  @ApiProperty({ description: 'Context for analysis' })
  @IsObject()
  context: Record<string, any>;
}

export class SchemaGenerationDto {
  @ApiProperty({ description: 'API endpoint URL' })
  @IsUrl()
  endpoint: string;

  @ApiProperty({ enum: HttpMethod, description: 'HTTP method' })
  @IsEnum(HttpMethod)
  method: HttpMethod;

  @ApiProperty({ description: 'Sample request data', required: false })
  @IsOptional()
  @IsObject()
  sampleRequest?: any;

  @ApiProperty({ description: 'Sample response data', required: false })
  @IsOptional()
  @IsObject()
  sampleResponse?: any;

  @ApiProperty({ description: 'API documentation URL', required: false })
  @IsOptional()
  @IsUrl()
  documentationUrl?: string;

  @ApiProperty({ description: 'Context for schema generation' })
  @IsObject()
  context: Record<string, any>;
}

export class AuthenticationDetectionDto {
  @ApiProperty({ description: 'API endpoint URL' })
  @IsUrl()
  endpoint: string;

  @ApiProperty({ description: 'Request headers for analysis' })
  @IsObject()
  headers: Record<string, string>;

  @ApiProperty({ description: 'Response headers from API', required: false })
  @IsOptional()
  @IsObject()
  responseHeaders?: Record<string, string>;

  @ApiProperty({ description: 'API documentation content', required: false })
  @IsOptional()
  @IsString()
  documentation?: string;

  @ApiProperty({ description: 'Context for authentication detection' })
  @IsObject()
  context: Record<string, any>;
}

export class ParameterMappingDto {
  @ApiProperty({ description: 'API endpoint URL' })
  @IsUrl()
  endpoint: string;

  @ApiProperty({ description: 'Generated or existing schema' })
  @IsObject()
  schema: any;

  @ApiProperty({ description: 'User requirements for parameter mapping' })
  @IsString()
  userRequirements: string;

  @ApiProperty({ description: 'Sample data for mapping', required: false })
  @IsOptional()
  @IsObject()
  sampleData?: any;

  @ApiProperty({ description: 'Context for parameter mapping' })
  @IsObject()
  context: Record<string, any>;
}

export class ErrorPatternAnalysisDto {
  @ApiProperty({ description: 'API endpoint URL' })
  @IsUrl()
  endpoint: string;

  @ApiProperty({ description: 'Sample error responses' })
  @IsArray()
  errorResponses: Array<{
    statusCode: number;
    response: any;
    headers?: Record<string, string>;
  }>;

  @ApiProperty({ description: 'API documentation for error handling', required: false })
  @IsOptional()
  @IsString()
  errorDocumentation?: string;

  @ApiProperty({ description: 'Context for error pattern analysis' })
  @IsObject()
  context: Record<string, any>;
}

export class APITestingDto {
  @ApiProperty({ description: 'API endpoint URL' })
  @IsUrl()
  endpoint: string;

  @ApiProperty({ enum: HttpMethod, description: 'HTTP method' })
  @IsEnum(HttpMethod)
  method: HttpMethod;

  @ApiProperty({ description: 'Authentication configuration' })
  @IsObject()
  authentication: {
    type: AuthenticationType;
    credentials: Record<string, any>;
  };

  @ApiProperty({ description: 'Test parameters' })
  @IsObject()
  testParameters: Record<string, any>;

  @ApiProperty({ description: 'Expected response format', required: false })
  @IsOptional()
  @IsObject()
  expectedResponse?: any;

  @ApiProperty({ description: 'Context for API testing' })
  @IsObject()
  context: Record<string, any>;
}

export class APIValidationDto {
  @ApiProperty({ description: 'Generated API configuration' })
  @IsObject()
  apiConfiguration: {
    endpoint: string;
    method: HttpMethod;
    authentication: any;
    parameters: any;
    schema: any;
    errorHandling: any;
  };

  @ApiProperty({ description: 'Validation requirements' })
  @IsArray()
  @IsString({ each: true })
  validationRequirements: string[];

  @ApiProperty({ description: 'Context for validation' })
  @IsObject()
  context: Record<string, any>;
}
