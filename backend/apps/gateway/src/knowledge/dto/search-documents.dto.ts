import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsObject,
    IsEnum,
    Min,
    Max,
  } from 'class-validator';
  import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  
  export enum SearchType {
    SEMANTIC = 'semantic',
    KEYWORD = 'keyword',
    HYBRID = 'hybrid',
  }
  
  export class SearchDocumentsDto {
    @ApiProperty({ description: 'Search query' })
    @IsString()
    @IsNotEmpty()
    query: string;
  
    @ApiPropertyOptional({ description: 'Search type', enum: SearchType, default: SearchType.HYBRID })
    @IsOptional()
    @IsEnum(SearchType)
    type?: SearchType;
  
    @ApiPropertyOptional({ description: 'Maximum number of results', default: 10 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    maxResults?: number;
  
    @ApiPropertyOptional({ description: 'Similarity threshold', default: 0.7 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    threshold?: number;
  
    @ApiPropertyOptional({ description: 'Search filters' })
    @IsOptional()
    @IsObject()
    filters?: {
      documentTypes?: string[];
      tags?: string[];
      dateRange?: {
        from: Date;
        to: Date;
      };
      organizationId?: string;
      userId?: string;
    };
  
    @ApiPropertyOptional({ description: 'Organization ID' })
    @IsOptional()
    @IsString()
    organizationId?: string;
  
    @ApiPropertyOptional({ description: 'User ID' })
    @IsOptional()
    @IsString()
    userId?: string;
  }
  