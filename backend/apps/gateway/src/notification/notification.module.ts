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
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      NotificationPreference,
      NotificationDelivery,
      User,
      Organization,
    ]),
    ScheduleModule.forRoot(),
    WebSocketModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationDeliveryService,
    NotificationSchedulerService,
  ],
  exports: [
    NotificationService,
    NotificationDeliveryService,
    NotificationSchedulerService,
  ],
})
export class NotificationModule {}
