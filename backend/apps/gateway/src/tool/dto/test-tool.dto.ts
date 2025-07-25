import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestToolDto {
  @ApiProperty({ description: 'Function name to test' })
  @IsString()
  @IsNotEmpty()
  functionName: string;

  @ApiProperty({ description: 'Test parameters' })
  @IsObject()
  parameters: Record<string, any>;

  @ApiProperty({ description: 'Expected result for validation', required: false })
  @IsOptional()
  expectedResult?: any;
}
