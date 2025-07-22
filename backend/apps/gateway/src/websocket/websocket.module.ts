import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { WebSocketGatewayImpl } from './websocket.gateway';
import { ConnectionService } from './connection.service';
import { WebSocketService } from './websocket.service';

@Module({
  imports: [
    ConfigModule,
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
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        keyPrefix: 'synapseai:ws:',
      }),
    }),
  ],
  providers: [WebSocketGatewayImpl, ConnectionService, WebSocketService],
  exports: [WebSocketService, ConnectionService],
})
export class WebsocketModule {}
