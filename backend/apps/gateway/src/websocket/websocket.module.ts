import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebSocketGatewayImpl } from './websocket.gateway';
import { ConnectionService } from './connection.service';
import { WebSocketService } from './websocket.service';
import { APXSchemaService } from './apix-schema.service';
import { APXPermissionService } from './apix-permission.service';
import { APXMonitoringService } from './apix-monitoring.service';
import {
  User,
  Organization,
  ConnectionStatsEntity,
  MessageTrackingEntity,
  EventLog,
  Subscription,
} from '@database/entities';
import { UserService } from '../auth/user.service';
import Redis from 'ioredis';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    TypeOrmModule.forFeature([
      User,
      Organization,
      ConnectionStatsEntity,
      MessageTrackingEntity,
      EventLog,
      Subscription,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        if (redisUrl) {
          return new Redis(redisUrl);
        }

        return new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_WS_DB', 2),
          keyPrefix: 'synapseai:ws:',
          connectTimeout: 10000,
          commandTimeout: 5000,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
    WebSocketGatewayImpl,
    ConnectionService,
    WebSocketService,
    APXSchemaService,
    APXPermissionService,
    APXMonitoringService,
    UserService,
  ],
  exports: [
    WebSocketService,
    ConnectionService,
    APXMonitoringService,
    'REDIS_CLIENT',
  ],
})
export class WebsocketModule {}
