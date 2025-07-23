import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    IsObject,
    IsEnum,
  } from 'class-validator';
  import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  
  export enum DocumentType {
    PDF = 'pdf',
    DOCUMENT = 'document',
    TEXT = 'text',
    MARKDOWN = 'markdown',
    HTML = 'html',
    JSON = 'json',
    CSV = 'csv',
    UNKNOWN = 'unknown',
  }
  
  export class CreateDocumentDto {
    @ApiProperty({ description: 'Document title' })
    @IsString()
    @IsNotEmpty()
    title: string;
  
    @ApiProperty({ description: 'Document type', enum: DocumentType })
    @IsEnum(DocumentType)
    type: DocumentType;
  
    @ApiProperty({ description: 'Document source/URL' })
    @IsString()
    @IsNotEmpty()
    source: string;
  
    @ApiProperty({ description: 'Document content' })
    @IsString()
    @IsNotEmpty()
    content: string;
  
    @ApiPropertyOptional({ description: 'Document tags' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
  
    @ApiPropertyOptional({ description: 'Document metadata' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
  
    @ApiPropertyOptional({ description: 'Organization ID' })
    @IsOptional()
    @IsString()
    organizationId?: string;
  
    @ApiPropertyOptional({ description: 'User ID' })
    @IsOptional()
    @IsString()
    userId?: string;
  }
  