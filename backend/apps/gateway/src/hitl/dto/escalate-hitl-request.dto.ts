import { IsEnum, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HITLEscalationReason } from '@shared/enums';

export class EscalateHITLRequestDto {
  @ApiProperty({ enum: HITLEscalationReason })
  @IsEnum(HITLEscalationReason)
  reason: HITLEscalationReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  targetLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justification?: string;
}
