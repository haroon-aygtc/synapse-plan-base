import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsUUID } from 'class-validator';

export class RenderTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: 'Variables to inject into the template' })
  @IsObject()
  variables: Record<string, any>;
}
