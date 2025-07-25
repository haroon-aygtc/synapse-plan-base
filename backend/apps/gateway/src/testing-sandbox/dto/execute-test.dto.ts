import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteTestDto {
  @ApiProperty({ example: 'My Test', description: 'Test name' })
  @IsString()
  testName: string;

  @ApiProperty({
    example: 'agent',
    description: 'Test type',
    enum: ['agent', 'tool', 'workflow', 'integration'],
  })
  @IsEnum(['agent', 'tool', 'workflow', 'integration'])
  testType: string;

  @ApiProperty({ description: 'Test data and parameters' })
  @IsObject()
  testData: any;

  @ApiPropertyOptional({ description: 'Test configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiPropertyOptional({
    example: 30000,
    description: 'Timeout in milliseconds',
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Enable streaming updates',
  })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Enable debug mode' })
  @IsOptional()
  @IsBoolean()
  debug?: boolean;
}
