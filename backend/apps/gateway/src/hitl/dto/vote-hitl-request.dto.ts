import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';

export class VoteHITLRequestDto {
  @IsString()
  @IsIn(['approve', 'reject', 'abstain'])
  vote: 'approve' | 'reject' | 'abstain';

  @IsString()
  @IsOptional()
  reason?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
