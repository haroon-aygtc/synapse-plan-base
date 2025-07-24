import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VoteHITLRequestDto {
  @ApiProperty({ enum: ['approve', 'reject', 'abstain'] })
  @IsEnum(['approve', 'reject', 'abstain'])
  vote: 'approve' | 'reject' | 'abstain';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
