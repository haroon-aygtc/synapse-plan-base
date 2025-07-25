import { PartialType } from '@nestjs/swagger';
import { CreateTestScenarioDto } from './create-test-scenario.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTestScenarioDto extends PartialType(CreateTestScenarioDto) {
  @ApiPropertyOptional({
    example: 'active',
    description: 'Scenario status',
    enum: ['draft', 'active', 'paused', 'completed', 'failed'],
  })
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'completed', 'failed'])
  status?: string;
}
