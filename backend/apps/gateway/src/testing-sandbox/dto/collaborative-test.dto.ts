import { IsString, IsOptional, IsObject, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CollaborativeTestDto {
  @ApiProperty({ example: 'Collaborative Test 1', description: 'Test name' })
  @IsString()
  testName: string;

  @ApiProperty({ description: 'List of participant user IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  participants: string[];

  @ApiProperty({ example: 'agent', description: 'Test type' })
  @IsString()
  testType: string;

  @ApiPropertyOptional({ description: 'Test configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Initial test data' })
  @IsOptional()
  @IsObject()
  initialData?: any;
}
