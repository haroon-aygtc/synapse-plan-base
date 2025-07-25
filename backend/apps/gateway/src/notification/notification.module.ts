import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import {
  Notification,
  NotificationTemplate,
  NotificationPreference,
  NotificationDelivery,
  User,
  Organization,
} from '@database/entities';
import { NotificationService } from './notification.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationController } from './notification.controller';
import { WebsocketModule } from '../websocket/websocket.module';
import { PushDeliveryProvider } from './providers/push-delivery.provider';
import { EmailDeliveryProvider } from './providers/email-delivery.provider';
import { SmsDeliveryProvider } from './providers/sms-delivery.provider';
import { WebhookDeliveryProvider } from './providers/webhook-delivery.provider';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      NotificationPreference,
      NotificationDelivery,
      User,
      Organization,
    ]),
    ScheduleModule.forRoot(),
    WebsocketModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationDeliveryService,
    NotificationSchedulerService,
    EmailDeliveryProvider,
    SmsDeliveryProvider,
    WebhookDeliveryProvider,
    PushDeliveryProvider,
  ],
  exports: [NotificationService, NotificationDeliveryService, NotificationSchedulerService],
})
export class NotificationModule {}
