import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishTemplateDto {
  @ApiProperty({
    description: 'Template name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Template description',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Template category',
  })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Template tags',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({
    description: 'Make template publicly available',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
