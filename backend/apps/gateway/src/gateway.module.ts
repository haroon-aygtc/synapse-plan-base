import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
// import redisStore from 'cache-manager-ioredis';
import { databaseConfig } from '@database/config';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './session/session.module';
import { AgentModule } from './agent/agent.module';
import { PromptTemplateModule } from './prompt-template/prompt-template.module';
import { ToolModule } from './tool/tool.module';
import { WorkflowModule } from './workflow/workflow.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { NotificationModule } from './notification/notification.module';
import { BillingModule } from './billing/billing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HITLModule } from './hitl/hitl.module';
import { MonitoringModule } from '@shared/modules/monitoring.module';

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
      useFactory: (): TypeOrmModuleOptions => databaseConfig(),
    }),

    // Cache - Using memory store for now, can be configured for Redis later
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes default TTL
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [{
          ttl: configService.get('THROTTLE_TTL', 60),
          limit: configService.get('THROTTLE_LIMIT', 100),
        }],
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
    PromptTemplateModule,
    ToolModule,
    WorkflowModule,
    KnowledgeModule,
    NotificationModule,
    BillingModule,
    AnalyticsModule,
    HealthModule,
    WebsocketModule,
    HITLModule,
    MonitoringModule,
  ],
})
export class GatewayModule {}
