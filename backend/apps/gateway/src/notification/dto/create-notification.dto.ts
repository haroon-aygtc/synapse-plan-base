import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsUUID,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationPriority } from '@shared/enums';

class EmailDeliveryConfigDto {
  @IsArray()
  @IsString({ each: true })
  to: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];

  @IsOptional()
  @IsString()
  replyTo?: string;
}

class SmsDeliveryConfigDto {
  @IsArray()
  @IsString({ each: true })
  to: string[];
}

class WebhookDeliveryConfigDto {
  @IsString()
  url: string;

  @IsString()
  method: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}

class PushDeliveryConfigDto {
  @IsArray()
  @IsString({ each: true })
  tokens: string[];

  @IsOptional()
  @IsInt()
  badge?: number;

  @IsOptional()
  @IsString()
  sound?: string;
}

class DeliveryConfigDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailDeliveryConfigDto)
  email?: EmailDeliveryConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmsDeliveryConfigDto)
  sms?: SmsDeliveryConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookDeliveryConfigDto)
  webhook?: WebhookDeliveryConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PushDeliveryConfigDto)
  push?: PushDeliveryConfigDto;
}

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryConfigDto)
  deliveryConfig?: DeliveryConfigDto;
}

export class CreateBulkNotificationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationDto)
  notifications: CreateNotificationDto[];

  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;

  @IsOptional()
  @IsString()
  batchId?: string;
}

export class CreateNotificationFromTemplateDto {
  @IsUUID()
  templateId: string;

  @IsObject()
  variables: Record<string, any>;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryConfigDto)
  deliveryConfig?: DeliveryConfigDto;
}
