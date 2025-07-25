import { IsString, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
  QUALITY = 'quality',
}

export class GenerateTestCasesDto {
  @ApiProperty({ description: 'Agent prompt for test case generation' })
  @IsString()
  agentPrompt: string;

  @ApiProperty({ description: 'Use case for the agent' })
  @IsString()
  useCase: string;

  @ApiProperty({
    description: 'Type of tests to generate',
    enum: TestType,
    default: TestType.INTEGRATION,
  })
  @IsEnum(TestType)
  testType: TestType;

  @ApiPropertyOptional({
    description: 'Number of test cases to generate',
    minimum: 1,
    maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  count?: number;
}
