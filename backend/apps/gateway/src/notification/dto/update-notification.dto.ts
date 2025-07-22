import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { NotificationPriority, ExecutionStatus } from '@shared/enums';

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class MarkNotificationReadDto {
  @IsOptional()
  @IsBoolean()
  markAllAsRead?: boolean;
}

export class RetryNotificationDto {
  @IsOptional()
  @IsBoolean()
  resetRetryCount?: boolean;

  @IsOptional()
  @IsDateString()
  scheduleRetryFor?: string;
}

export class BulkUpdateNotificationDto {
  @IsString({ each: true })
  notificationIds: string[];

  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @IsOptional()
  @IsBoolean()
  markAsRead?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
