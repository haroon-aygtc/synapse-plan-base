import {
  IsOptional,
  IsDateString,
  IsString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  HITLRequestType,
  HITLRequestStatus,
  HITLRequestPriority,
} from '@shared/enums';

export class HITLAnalyticsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: HITLRequestType })
  @IsOptional()
  @IsEnum(HITLRequestType)
  type?: HITLRequestType;

  @ApiPropertyOptional({ enum: HITLRequestStatus })
  @IsOptional()
  @IsEnum(HITLRequestStatus)
  status?: HITLRequestStatus;

  @ApiPropertyOptional({ enum: HITLRequestPriority })
  @IsOptional()
  @IsEnum(HITLRequestPriority)
  priority?: HITLRequestPriority;

  @ApiPropertyOptional({ enum: ['agent', 'tool', 'workflow'] })
  @IsOptional()
  @IsEnum(['agent', 'tool', 'workflow'])
  sourceType?: 'agent' | 'tool' | 'workflow';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}
