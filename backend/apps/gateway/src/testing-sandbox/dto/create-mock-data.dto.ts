import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MockDataType {
  JSON = 'json',
  XML = 'xml',
  CSV = 'csv',
  TEXT = 'text',
  BINARY = 'binary',
  API_RESPONSE = 'api_response',
  DATABASE_RECORD = 'database_record',
}

export class CreateMockDataDto {
  @ApiProperty({ description: 'Mock data name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Mock data description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Mock data type', enum: MockDataType })
  @IsEnum(MockDataType)
  type: MockDataType;

  @ApiProperty({ description: 'Mock data content' })
  @IsObject()
  data: Record<string, any>;

  @ApiProperty({ description: 'Data schema for validation' })
  @IsOptional()
  @IsObject()
  schema?: Record<string, any>;

  @ApiProperty({ description: 'Generation rules for dynamic data' })
  @IsOptional()
  @IsObject()
  generationRules?: {
    count?: number;
    template?: Record<string, any>;
    faker?: Record<string, any>;
    relationships?: Record<string, any>;
  };

  @ApiProperty({ description: 'Enable data persistence', default: false })
  @IsOptional()
  @IsBoolean()
  persistent?: boolean;

  @ApiProperty({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Mock data metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
