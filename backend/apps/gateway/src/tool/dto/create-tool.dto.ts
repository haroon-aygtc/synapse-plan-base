import {
    IsString,
    IsNotEmpty,
    IsObject,
    IsUrl,
    IsEnum,
    IsOptional,
    IsArray,
    IsBoolean,
  } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';
  
  enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH',
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
  
    @ApiProperty({ description: 'Tool category', required: false })
    @IsOptional()
    @IsString()
    category?: string;
  
    @ApiProperty({ description: 'Tool tags', required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
  
    @ApiProperty({ description: 'Whether the tool is active', required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
  
    @ApiProperty({ description: 'Organization ID' })
    @IsString()
    @IsNotEmpty()
    organizationId: string;
  
    @ApiProperty({ description: 'User ID' })
    @IsString()
    @IsNotEmpty()
    userId: string;
  }
  