import {
  IsBoolean,
  IsString,
  IsOptional,
  IsArray,
  IsObject,
} from 'class-validator';

export class ResolveHITLRequestDto {
  @IsBoolean()
  approved: boolean;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsObject()
  @IsOptional()
  decisionData?: Record<string, any>;
}
