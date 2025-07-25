import { IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PersonalityProfileDto {
  @ApiProperty({
    description: 'Personality traits with values 0-100',
    example: {
      friendliness: 80,
      professionalism: 90,
      creativity: 60,
      directness: 70,
      empathy: 65,
      humor: 40,
    },
  })
  @IsObject()
  traits: Record<string, number>;
}
