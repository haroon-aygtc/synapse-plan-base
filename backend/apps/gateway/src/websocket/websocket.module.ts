import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { WebSocketGatewayImpl } from './websocket.gateway';
import { ConnectionService } from './connection.service';
import { WebSocketService } from './websocket.service';
import { User, Organization } from '@database/entities';
import { UserService } from '../user.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Organization]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url:
          configService.get('REDIS_URL') ||
          `redis://${configService.get('REDIS_HOST', 'localhost')}:${configService.get('REDIS_PORT', 6379)}`,
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_WS_DB', 2), // Use separate DB for WebSocket data
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        keyPrefix: 'synapseai:ws:',
        // Connection pooling configuration
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        connectTimeout: 10000,
        commandTimeout: 5000,
      }),
    }),
  ],
  providers: [WebSocketGatewayImpl, ConnectionService, WebSocketService, UserService],
  exports: [WebSocketService, ConnectionService],
})
export class WebsocketModule {}
