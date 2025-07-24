import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsDateString,
} from 'class-validator';
import {
  HITLRequestType,
  HITLRequestStatus,
  HITLRequestPriority,
  HITLDecisionType,
} from '@shared/enums';

export class UpdateHITLRequestDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(HITLRequestType)
  @IsOptional()
  type?: HITLRequestType;

  @IsEnum(HITLRequestStatus)
  @IsOptional()
  status?: HITLRequestStatus;

  @IsEnum(HITLRequestPriority)
  @IsOptional()
  priority?: HITLRequestPriority;

  @IsEnum(HITLDecisionType)
  @IsOptional()
  decisionType?: HITLDecisionType;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assigneeRoles?: string[];

  @IsArray()
  @IsUUID(4, { each: true })
  @IsOptional()
  assigneeUsers?: string[];

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsNumber()
  @IsOptional()
  timeoutMs?: number;

  @IsObject()
  @IsOptional()
  escalationRules?: {
    enabled: boolean;
    timeoutMinutes: number;
    escalationChain: Array<{
      level: number;
      assigneeRoles?: string[];
      assigneeUsers?: string[];
      timeoutMinutes: number;
    }>;
    autoEscalate: boolean;
    maxEscalationLevel: number;
  };

  @IsBoolean()
  @IsOptional()
  allowDiscussion?: boolean;

  @IsBoolean()
  @IsOptional()
  requireExpertConsultation?: boolean;

  @IsArray()
  @IsUUID(4, { each: true })
  @IsOptional()
  expertConsultants?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  category?: string;
}
