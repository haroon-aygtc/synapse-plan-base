import { IsString, IsOptional, IsObject, IsArray, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateConfigDto {
  @ApiProperty({
    description: 'Description of what the agent should do',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @Length(10, 1000)
  description: string;

  @ApiProperty({ description: 'Primary use case for the agent' })
  @IsString()
  useCase: string;

  @ApiProperty({
    description: 'Personality traits with values 0-100',
    example: { friendliness: 80, professionalism: 90, creativity: 60 },
  })
  @IsObject()
  personalityTraits: Record<string, number>;

  @ApiPropertyOptional({ description: 'Specific requirements for the agent' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({ description: 'Constraints or limitations' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  constraints?: string[];
}
