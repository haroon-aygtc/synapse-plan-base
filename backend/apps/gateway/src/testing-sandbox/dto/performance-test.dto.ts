import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExecuteTestDto } from './execute-test.dto';

export class PerformanceTestDto {
  @ApiProperty({ example: 'Performance Test 1', description: 'Test name' })
  @IsString()
  testName: string;

  @ApiProperty({ description: 'Test request configuration' })
  @ValidateNested()
  @Type(() => ExecuteTestDto)
  testRequest: ExecuteTestDto;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of concurrent requests',
  })
  @IsOptional()
  @IsNumber()
  concurrency?: number;

  @ApiPropertyOptional({
    example: 60000,
    description: 'Test duration in milliseconds',
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Ramp-up time in milliseconds',
  })
  @IsOptional()
  @IsNumber()
  rampUpTime?: number;

  @ApiPropertyOptional({ description: 'Performance test configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}
