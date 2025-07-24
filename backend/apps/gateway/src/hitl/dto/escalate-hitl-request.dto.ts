import { IsEnum, IsString, IsOptional, IsNumber } from 'class-validator';
import { HITLEscalationReason } from '@shared/enums';

export class EscalateHITLRequestDto {
  @IsEnum(HITLEscalationReason)
  reason: HITLEscalationReason;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  targetLevel?: number;

  @IsString()
  @IsOptional()
  justification?: string;
}
