import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
  AB_TEST = 'ab_test',
}

export class TestAgentDto {
  @ApiProperty({ description: 'Test name' })
  @IsString()
  testName: string;

  @ApiProperty({ description: 'Type of test', enum: TestType })
  @IsEnum(TestType)
  testType: TestType;

  @ApiProperty({ description: 'Test input data' })
  @IsObject()
  testInput: Record<string, any>;

  @ApiPropertyOptional({ description: 'Expected output for validation' })
  @IsOptional()
  @IsObject()
  expectedOutput?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Test metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BatchTestAgentDto {
  @ApiProperty({ description: 'Array of test cases', type: [TestAgentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestAgentDto)
  testCases: TestAgentDto[];

  @ApiPropertyOptional({
    description: 'Maximum concurrent tests',
    default: 5,
  })
  @IsOptional()
  maxConcurrency?: number;
}
