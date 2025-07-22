import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import * as redisStore from 'cache-manager-redis-store';
import { databaseConfig } from '@database/config';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './session/session.module';
import { AgentModule } from './agent/agent.module';
import { ToolModule } from './tool/tool.module';
import { WorkflowModule } from './workflow/workflow.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { NotificationModule } from './notification/notification.module';
import { BillingModule } from './billing/billing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => databaseConfig,
    }),

    // Redis Cache
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_DB', 0),
        ttl: 300, // 5 minutes default TTL
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get('THROTTLE_TTL', 60),
        limit: configService.get('THROTTLE_LIMIT', 100),
      }),
    }),

    // Event System
    EventEmitterModule.forRoot(),

    // Task Scheduling
    ScheduleModule.forRoot(),

    // Queue System
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_QUEUE_DB', 1),
        },
      }),
    }),

    // Feature Modules
    AuthModule,
    SessionModule,
    AgentModule,
    ToolModule,
    WorkflowModule,
    KnowledgeModule,
    NotificationModule,
    BillingModule,
    AnalyticsModule,
    HealthModule,
    WebsocketModule,
  ],
})
export class GatewayModule {}
