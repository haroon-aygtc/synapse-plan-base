import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsIn,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@shared/enums';

class QuietHoursDto {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @IsString()
  timezone: string;
}

class BatchingDto {
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  @Min(1)
  @Max(100)
  maxBatchSize: number;

  @IsInt()
  @Min(1)
  @Max(1440) // Max 24 hours
  batchWindow: number;
}

class FiltersDto {
  @IsOptional()
  @IsArray()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], { each: true })
  priority?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

class EmailDeliveryDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsIn(['text', 'html'])
  format?: 'text' | 'html';
}

class SmsDeliveryDto {
  @IsOptional()
  @IsString()
  number?: string;
}

class WebhookDeliveryDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  secret?: string;
}

class PushDeliveryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deviceTokens?: string[];
}

class DeliveryDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailDeliveryDto)
  email?: EmailDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmsDeliveryDto)
  sms?: SmsDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookDeliveryDto)
  webhook?: WebhookDeliveryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PushDeliveryDto)
  push?: PushDeliveryDto;
}

class NotificationSettingsDto {
  @IsOptional()
  @IsIn(['immediate', 'hourly', 'daily', 'weekly'])
  frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';

  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BatchingDto)
  batching?: BatchingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FiltersDto)
  filters?: FiltersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryDto)
  delivery?: DeliveryDto;
}

export class CreateNotificationPreferenceDto {
  @IsString()
  eventType: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  settings?: NotificationSettingsDto;
}

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  settings?: NotificationSettingsDto;
}

export class BulkUpdatePreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateNotificationPreferenceDto)
  preferences: {
    eventType: string;
    type: NotificationType;
    isEnabled?: boolean;
    settings?: NotificationSettingsDto;
  }[];
}

export class GetPreferencesQueryDto {
  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
