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
import { Type } from 'class-transformer';
import {
  HITLRequestType,
  HITLRequestPriority,
  HITLDecisionType,
} from '@shared/enums';

export class CreateHITLRequestDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(HITLRequestType)
  @IsOptional()
  type?: HITLRequestType = HITLRequestType.APPROVAL;

  @IsEnum(HITLRequestPriority)
  @IsOptional()
  priority?: HITLRequestPriority = HITLRequestPriority.MEDIUM;

  @IsEnum(HITLDecisionType)
  @IsOptional()
  decisionType?: HITLDecisionType = HITLDecisionType.SINGLE_APPROVER;

  @IsString()
  sourceType: 'agent' | 'tool' | 'workflow';

  @IsUUID()
  sourceId: string;

  @IsUUID()
  @IsOptional()
  executionId?: string;

  @IsObject()
  @IsOptional()
  executionContext?: Record<string, any>;

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
  timeoutMs?: number = 86400000; // 24 hours

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
  allowDiscussion?: boolean = false;

  @IsBoolean()
  @IsOptional()
  requireExpertConsultation?: boolean = false;

  @IsArray()
  @IsUUID(4, { each: true })
  @IsOptional()
  expertConsultants?: string[];

  @IsObject()
  @IsOptional()
  votingData?: {
    requiredVotes: number;
  };

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
