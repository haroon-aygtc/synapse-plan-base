import { IsOptional, IsEnum, IsString, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateEmbedCodeDto {
  @ApiProperty({
    description: 'Embed code format',
    enum: ['javascript', 'iframe', 'react', 'vue', 'angular'],
    default: 'javascript',
  })
  @IsOptional()
  @IsEnum(['javascript', 'iframe', 'react', 'vue', 'angular'])
  format?: 'javascript' | 'iframe' | 'react' | 'vue' | 'angular';

  @ApiProperty({
    description: 'Container ID for JavaScript embed',
    required: false,
  })
  @IsOptional()
  @IsString()
  containerId?: string;

  @ApiProperty({
    description: 'Widget width',
    required: false,
  })
  @IsOptional()
  @IsString()
  width?: string;

  @ApiProperty({
    description: 'Widget height',
    required: false,
  })
  @IsOptional()
  @IsString()
  height?: string;

  @ApiProperty({
    description: 'Enable responsive design',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  responsive?: boolean;

  @ApiProperty({
    description: 'Custom theme overrides',
    required: false,
  })
  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;
}
