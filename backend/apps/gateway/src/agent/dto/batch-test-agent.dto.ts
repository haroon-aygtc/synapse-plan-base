import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { TestAgentDto } from './test-agent.dto';

export class BatchTestAgentDto {
  @ApiProperty({
    description: 'Array of test cases to run',
    type: [TestAgentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestAgentDto)
  testCases: TestAgentDto[];

  @ApiProperty({
    description: 'Maximum number of concurrent test executions',
    required: false,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  maxConcurrency?: number;
}
