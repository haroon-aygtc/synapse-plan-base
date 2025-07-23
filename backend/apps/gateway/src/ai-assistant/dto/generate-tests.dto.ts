import {
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
  QUALITY = 'quality',
}

export class GenerateTestsDto {
  @ApiProperty({ 
    description: 'Type of tests to generate',
    enum: TestType,
    default: TestType.INTEGRATION
  })
  @IsOptional()
  @IsEnum(TestType)
  testType?: TestType = TestType.INTEGRATION;

  @ApiProperty({ 
    description: 'Number of test cases to generate',
    minimum: 1,
    maximum: 20,
    default: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  count?: number = 5;
}