import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CommentHITLRequestDto {
  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }>;

  @IsUUID()
  @IsOptional()
  parentCommentId?: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean = false;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
