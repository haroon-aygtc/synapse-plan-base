import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsString,
  IsNumber,
} from 'class-validator';
import {
  HITLRequestStatus,
  HITLRequestType,
  HITLRequestPriority,
} from '@shared/enums';

export class HITLAnalyticsQueryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(HITLRequestType)
  @IsOptional()
  type?: HITLRequestType;

  @IsEnum(HITLRequestStatus)
  @IsOptional()
  status?: HITLRequestStatus;

  @IsEnum(HITLRequestPriority)
  @IsOptional()
  priority?: HITLRequestPriority;

  @IsString()
  @IsOptional()
  sourceType?: 'agent' | 'tool' | 'workflow';

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  limit?: number = 50;
}
