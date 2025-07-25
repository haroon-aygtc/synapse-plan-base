import { IsString, IsOptional, IsObject, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestScenarioStepDto {
  @ApiProperty({ example: 'step-1', description: 'Step ID' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Execute Agent', description: 'Step name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'agent', description: 'Step type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Step input data' })
  @IsObject()
  input: any;

  @ApiProperty({ description: 'Expected output' })
  @IsObject()
  expectedOutput: any;

  @ApiPropertyOptional({
    example: 30000,
    description: 'Timeout in milliseconds',
  })
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional({ example: 3, description: 'Number of retries' })
  @IsOptional()
  retries?: number;
}

export class TestScenarioAssertionDto {
  @ApiProperty({ example: 'assertion-1', description: 'Assertion ID' })
  @IsString()
  id: string;

  @ApiProperty({
    example: 'equals',
    description: 'Assertion type',
    enum: ['equals', 'contains', 'matches', 'custom'],
  })
  @IsEnum(['equals', 'contains', 'matches', 'custom'])
  type: 'equals' | 'contains' | 'matches' | 'custom';

  @ApiProperty({ example: 'output.result', description: 'Field to assert' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Expected value' })
  expected: any;

  @ApiPropertyOptional({
    description: 'Actual value (filled during execution)',
  })
  @IsOptional()
  actual?: any;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether assertion passed',
  })
  @IsOptional()
  passed?: boolean;

  @ApiPropertyOptional({
    example: 'Assertion failed',
    description: 'Assertion message',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class CreateTestScenarioDto {
  @ApiProperty({ example: 'Agent Test Scenario', description: 'Scenario name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Test scenario for agent execution',
    description: 'Scenario description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'agent', description: 'Scenario type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Test scenario steps' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestScenarioStepDto)
  steps: TestScenarioStepDto[];

  @ApiProperty({ description: 'Test scenario assertions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestScenarioAssertionDto)
  assertions: TestScenarioAssertionDto[];

  @ApiPropertyOptional({ description: 'Input data for the scenario' })
  @IsOptional()
  @IsObject()
  inputData?: any;

  @ApiPropertyOptional({ description: 'Expected output for the scenario' })
  @IsOptional()
  @IsObject()
  expectedOutput?: any;

  @ApiPropertyOptional({ description: 'Scenario configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}
