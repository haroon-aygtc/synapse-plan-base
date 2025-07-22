import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@shared/enums';

class TemplateVariableDto {
  @IsString()
  name: string;

  @IsIn(['string', 'number', 'boolean', 'date', 'object'])
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';

  @IsBoolean()
  required: boolean;

  @IsOptional()
  defaultValue?: any;

  @IsOptional()
  @IsString()
  description?: string;
}

class TemplateStylingDto {
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  fontSize?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  headerImage?: string;

  @IsOptional()
  @IsString()
  footerText?: string;
}

class EmailDeliverySettingsDto {
  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsString()
  fromEmail?: string;

  @IsOptional()
  @IsString()
  replyTo?: string;

  @IsOptional()
  @IsIn(['high', 'normal', 'low'])
  priority?: 'high' | 'normal' | 'low';
}

class SmsDeliverySettingsDto {
  @IsOptional()
  @IsString()
  fromNumber?: string;
}

class RetryPolicyDto {
  @IsInt()
  @Min(0)
  maxRetries: number;

  @IsInt()
  @Min(1000)
  retryDelay: number;

  @IsInt()
  @Min(1)
  backoffMultiplier: number;
}

class WebhookDeliverySettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1000)
  timeout?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RetryPolicyDto)
  retryPolicy?: RetryPolicyDto;
}

class PushDeliverySettingsDto {
  @IsOptional()
  @IsInt()
  badge?: number;

  @IsOptional()
  @IsString()
  sound?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

class TemplateDeliverySettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailDeliverySettingsDto)
  email?: EmailDeliverySettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmsDeliverySettingsDto)
  sms?: SmsDeliverySettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookDeliverySettingsDto)
  webhook?: WebhookDeliverySettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PushDeliverySettingsDto)
  push?: PushDeliverySettingsDto;
}

export class CreateNotificationTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables?: TemplateVariableDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateStylingDto)
  styling?: TemplateStylingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateDeliverySettingsDto)
  deliverySettings?: TemplateDeliverySettingsDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables?: TemplateVariableDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateStylingDto)
  styling?: TemplateStylingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateDeliverySettingsDto)
  deliverySettings?: TemplateDeliverySettingsDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TestNotificationTemplateDto {
  @IsObject()
  variables: Record<string, any>;

  @IsOptional()
  @IsString()
  testRecipient?: string;
}
