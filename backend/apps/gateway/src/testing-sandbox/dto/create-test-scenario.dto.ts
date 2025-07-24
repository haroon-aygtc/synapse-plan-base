import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TestType } from './execute-test.dto';

export class TestStepDto {
  @ApiProperty({ description: 'Step name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Step description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Step type', enum: TestType })
  @IsEnum(TestType)
  type: TestType;

  @ApiProperty({ description: 'Step input data' })
  @IsObject()
  input: Record<string, any>;

  @ApiProperty({ description: 'Expected output' })
  @IsOptional()
  @IsObject()
  expectedOutput?: Record<string, any>;

  @ApiProperty({ description: 'Step configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiProperty({ description: 'Step order' })
  @IsOptional()
  order?: number;
}

export class CreateTestScenarioDto {
  @ApiProperty({ description: 'Scenario name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Scenario description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Scenario type', enum: TestType })
  @IsEnum(TestType)
  type: TestType;

  @ApiProperty({ description: 'Test steps', type: [TestStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestStepDto)
  steps: TestStepDto[];

  @ApiProperty({ description: 'Scenario configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiProperty({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Scenario metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
