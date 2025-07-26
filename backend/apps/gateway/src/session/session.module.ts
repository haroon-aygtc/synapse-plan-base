import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { Session, User, Organization } from '@database/entities';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { SessionMiddleware } from './session.middleware';
import { SessionEventHandler } from './session-event.handler';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Session, User, Organization]),
    // CacheModule is imported globally in GatewayModule
    EventEmitterModule,
    ScheduleModule,
  ],
  controllers: [SessionController],
  providers: [SessionService, SessionMiddleware, SessionEventHandler],
  exports: [SessionService, SessionMiddleware],
})
export class SessionModule {}
