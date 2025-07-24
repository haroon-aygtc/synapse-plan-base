import { IsUUID, IsString, IsOptional } from 'class-validator';

export class DelegateHITLRequestDto {
  @IsUUID()
  delegatedToId: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}
