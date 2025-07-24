import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  IsBoolean,
  IsNumber,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  HITLRequestType,
  HITLRequestPriority,
  HITLDecisionType,
} from '@shared/enums';

class EscalationLevelDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(10)
  level: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeUsers?: string[];

  @ApiProperty()
  @IsNumber()
  @Min(1)
  timeoutMinutes: number;
}

class EscalationRulesDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  timeoutMinutes: number;

  @ApiProperty({ type: [EscalationLevelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationLevelDto)
  escalationChain: EscalationLevelDto[];

  @ApiProperty()
  @IsBoolean()
  autoEscalate: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxEscalationLevel: number;
}

class VotingDataDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  requiredVotes: number;
}

export class CreateHITLRequestDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: HITLRequestType })
  @IsOptional()
  @IsEnum(HITLRequestType)
  type?: HITLRequestType = HITLRequestType.APPROVAL;

  @ApiPropertyOptional({ enum: HITLRequestPriority })
  @IsOptional()
  @IsEnum(HITLRequestPriority)
  priority?: HITLRequestPriority = HITLRequestPriority.MEDIUM;

  @ApiPropertyOptional({ enum: HITLDecisionType })
  @IsOptional()
  @IsEnum(HITLDecisionType)
  decisionType?: HITLDecisionType = HITLDecisionType.SINGLE_APPROVER;

  @ApiProperty()
  @IsEnum(['agent', 'tool', 'workflow'])
  sourceType: 'agent' | 'tool' | 'workflow';

  @ApiProperty()
  @IsUUID()
  sourceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  executionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  executionContext?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeUsers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(60000) // Minimum 1 minute
  @Max(7 * 24 * 60 * 60 * 1000) // Maximum 7 days
  timeoutMs?: number = 86400000; // 24 hours default

  @ApiPropertyOptional({ type: EscalationRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EscalationRulesDto)
  escalationRules?: EscalationRulesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDiscussion?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireExpertConsultation?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  expertConsultants?: string[];

  @ApiPropertyOptional({ type: VotingDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VotingDataDto)
  votingData?: VotingDataDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}
