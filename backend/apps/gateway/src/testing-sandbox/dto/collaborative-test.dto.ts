import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CollaborativeTestType {
  PAIR_TESTING = 'pair_testing',
  GROUP_TESTING = 'group_testing',
  CODE_REVIEW = 'code_review',
  LIVE_DEBUGGING = 'live_debugging',
}

export enum ParticipantRole {
  OWNER = 'owner',
  COLLABORATOR = 'collaborator',
  OBSERVER = 'observer',
}

export class ParticipantDto {
  @ApiProperty({ description: 'Participant user ID' })
  @IsString()
  @Expose()
  userId: string;

  @ApiProperty({
    enum: ParticipantRole,
    description: 'Participant role in the session',
  })
  @IsEnum(ParticipantRole)
  @Expose()
  role: ParticipantRole;

  @ApiPropertyOptional({ description: 'Participant permissions' })
  @IsOptional()
  @IsArray()
  @Expose()
  permissions?: string[];

  @ApiProperty({ description: 'Whether participant is currently active' })
  @IsBoolean()
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Participant join timestamp' })
  @IsOptional()
  @Expose()
  joinedAt?: Date;
}

export class CollaborativeConfigurationDto {
  @ApiProperty({ description: 'Maximum number of participants' })
  @IsNumber()
  @Expose()
  maxParticipants: number;

  @ApiProperty({ description: 'Allow screen sharing' })
  @IsBoolean()
  @Expose()
  allowScreenSharing: boolean;

  @ApiProperty({ description: 'Allow voice chat' })
  @IsBoolean()
  @Expose()
  allowVoiceChat: boolean;

  @ApiProperty({ description: 'Allow text chat' })
  @IsBoolean()
  @Expose()
  allowTextChat: boolean;

  @ApiProperty({ description: 'Enable real-time cursor sharing' })
  @IsBoolean()
  @Expose()
  realtimeCursorSharing: boolean;

  @ApiProperty({ description: 'Enable collaborative editing' })
  @IsBoolean()
  @Expose()
  collaborativeEditing: boolean;

  @ApiProperty({ description: 'Session timeout in milliseconds' })
  @IsNumber()
  @Expose()
  sessionTimeout: number;

  @ApiPropertyOptional({ description: 'Additional configuration settings' })
  @IsOptional()
  @IsObject()
  @Expose()
  additionalSettings?: Record<string, any>;
}

export class CreateCollaborativeTestDto {
  @ApiProperty({ description: 'Collaborative test session name' })
  @IsString()
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Session description' })
  @IsOptional()
  @IsString()
  @Expose()
  description?: string;

  @ApiProperty({
    enum: CollaborativeTestType,
    description: 'Type of collaborative test',
  })
  @IsEnum(CollaborativeTestType)
  @Expose()
  testType: CollaborativeTestType;

  @ApiProperty({
    type: [String],
    description: 'List of participant user IDs',
  })
  @IsArray()
  @IsString({ each: true })
  @Expose()
  participants: string[];

  @ApiProperty({
    type: CollaborativeConfigurationDto,
    description: 'Collaborative session configuration',
  })
  @ValidateNested()
  @Type(() => CollaborativeConfigurationDto)
  @Expose()
  configuration: CollaborativeConfigurationDto;

  @ApiPropertyOptional({
    description: 'Test data or scenario to collaborate on',
  })
  @IsOptional()
  @IsObject()
  @Expose()
  testData?: any;

  @ApiPropertyOptional({ description: 'Scheduled start time' })
  @IsOptional()
  @Expose()
  scheduledStartTime?: Date;
}

export class CollaborativeTestDto extends CreateCollaborativeTestDto {
  @ApiProperty({ description: 'Collaborative test session ID' })
  @IsString()
  @Expose()
  id: string;

  @ApiProperty({ description: 'Sandbox ID' })
  @IsString()
  @Expose()
  sandboxId: string;

  @ApiProperty({ description: 'Session creator user ID' })
  @IsString()
  @Expose()
  createdBy: string;

  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  @Expose()
  organizationId: string;

  @ApiProperty({ description: 'Session status' })
  @IsString()
  @Expose()
  status: string;

  @ApiProperty({
    type: [ParticipantDto],
    description: 'List of session participants',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  @Expose()
  participantDetails: ParticipantDto[];

  @ApiProperty({ description: 'Session creation timestamp' })
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Session start timestamp' })
  @IsOptional()
  @Expose()
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Session end timestamp' })
  @IsOptional()
  @Expose()
  endedAt?: Date;

  @ApiPropertyOptional({ description: 'Current session state' })
  @IsOptional()
  @IsObject()
  @Expose()
  currentState?: any;
}

export class UpdateCollaborativeTestDto {
  @ApiPropertyOptional({ description: 'Updated session name' })
  @IsOptional()
  @IsString()
  @Expose()
  name?: string;

  @ApiPropertyOptional({ description: 'Updated session description' })
  @IsOptional()
  @IsString()
  @Expose()
  description?: string;

  @ApiPropertyOptional({
    type: CollaborativeConfigurationDto,
    description: 'Updated configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CollaborativeConfigurationDto)
  @Expose()
  configuration?: CollaborativeConfigurationDto;

  @ApiPropertyOptional({ description: 'Updated session status' })
  @IsOptional()
  @IsString()
  @Expose()
  status?: string;

  @ApiPropertyOptional({
    type: [ParticipantDto],
    description: 'Updated participant list',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  @Expose()
  participantDetails?: ParticipantDto[];
}

export class CollaborativeActionDto {
  @ApiProperty({ description: 'Collaborative test session ID' })
  @IsString()
  @Expose()
  sessionId: string;

  @ApiProperty({
    enum: [
      'join',
      'leave',
      'share_screen',
      'stop_share',
      'mute',
      'unmute',
      'chat_message',
    ],
    description: 'Action type',
  })
  @IsEnum([
    'join',
    'leave',
    'share_screen',
    'stop_share',
    'mute',
    'unmute',
    'chat_message',
  ])
  @Expose()
  action:
    | 'join'
    | 'leave'
    | 'share_screen'
    | 'stop_share'
    | 'mute'
    | 'unmute'
    | 'chat_message';

  @ApiPropertyOptional({ description: 'Action payload data' })
  @IsOptional()
  @IsObject()
  @Expose()
  payload?: any;

  @ApiProperty({ description: 'User performing the action' })
  @IsString()
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Action timestamp' })
  @Expose()
  timestamp: Date;
}

export class ChatMessageDto {
  @ApiProperty({ description: 'Message ID' })
  @IsString()
  @Expose()
  id: string;

  @ApiProperty({ description: 'Sender user ID' })
  @IsString()
  @Expose()
  senderId: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @Expose()
  content: string;

  @ApiProperty({
    enum: ['text', 'code', 'file', 'image'],
    description: 'Message type',
  })
  @IsEnum(['text', 'code', 'file', 'image'])
  @Expose()
  messageType: 'text' | 'code' | 'file' | 'image';

  @ApiProperty({ description: 'Message timestamp' })
  @Expose()
  timestamp: Date;

  @ApiPropertyOptional({ description: 'Message metadata' })
  @IsOptional()
  @IsObject()
  @Expose()
  metadata?: Record<string, any>;
}

export class CollaborativeTestResponseDto {
  @ApiProperty({ description: 'Collaborative test session ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Session name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Session description' })
  @Expose()
  description?: string;

  @ApiProperty({
    enum: CollaborativeTestType,
    description: 'Type of collaborative test',
  })
  @Expose()
  testType: CollaborativeTestType;

  @ApiProperty({ description: 'Sandbox ID' })
  @Expose()
  sandboxId: string;

  @ApiProperty({ description: 'Session creator' })
  @Expose()
  createdBy: string;

  @ApiProperty({ description: 'Organization ID' })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: 'Session status' })
  @Expose()
  status: string;

  @ApiProperty({
    type: [ParticipantDto],
    description: 'Session participants',
  })
  @Type(() => ParticipantDto)
  @Expose()
  participantDetails: ParticipantDto[];

  @ApiProperty({
    type: CollaborativeConfigurationDto,
    description: 'Session configuration',
  })
  @Type(() => CollaborativeConfigurationDto)
  @Expose()
  configuration: CollaborativeConfigurationDto;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Start timestamp' })
  @Expose()
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'End timestamp' })
  @Expose()
  endedAt?: Date;

  @ApiPropertyOptional({ description: 'Current session state' })
  @Expose()
  currentState?: any;

  @ApiPropertyOptional({
    type: [ChatMessageDto],
    description: 'Chat messages',
  })
  @Type(() => ChatMessageDto)
  @Expose()
  chatMessages?: ChatMessageDto[];
}
