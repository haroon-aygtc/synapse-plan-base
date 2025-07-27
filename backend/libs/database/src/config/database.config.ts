import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as entities from '../entities';
import { InitialSchema1700000000001 } from '../migrations/001-initial-schema';
import { CreateRLSPolicies1700000000002 } from '../migrations/002-create-rls-policies';
import { SeedInitialData1700000000003 } from '../migrations/003-seed-initial-data';
import { FixNotificationSchema1700000000004 } from '../migrations/004-fix-notification-schema';
import { CreateToolTemplates1700000000005 } from '../migrations/005-create-tool-templates';


const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST', 'localhost'),
  port: configService.get('DATABASE_PORT', 5432),
  username: configService.get('DATABASE_USERNAME', 'postgres'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME', 'synapseai'),
  entities: [`${__dirname}/../entities/*.entity{.ts,.js}`],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
});

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'synapseai',
  entities: [
    entities.BaseEntity,
    entities.Organization,
    entities.User,
    entities.Agent,
    entities.AgentExecution,
    entities.AgentTestResult,
    entities.Tool,
    entities.ToolExecution,
    entities.ToolTemplate,
    entities.Workflow,
    entities.WorkflowExecution,
    entities.Session,
    entities.ConnectionStatsEntity,
    entities.MessageTrackingEntity,
    entities.EventLog,
    entities.Subscription,
    entities.Notification,
    entities.NotificationPreference,
    entities.AIProvider,
    entities.AIProviderExecution,
    entities.AIProviderMetrics,
    entities.PromptTemplate,
    entities.TestingSandbox,
    entities.TestScenario,
    entities.TestExecution,
    entities.MockData,
    entities.DebugSession,
    entities.SandboxRun,
    entities.SandboxEvent,
    entities.HITLRequest,
    entities.HITLComment,
    entities.HITLVote,
    entities.Widget,
    entities.WidgetExecution,
    entities.WidgetAnalytics,
    entities.KnowledgeDocument,
    entities.KnowledgeDocumentChunk,
    entities.KnowledgeDocumentVersion,
    entities.KnowledgeSearch,
    entities.KnowledgeSearchFeedback,
    entities.KnowledgeAnalytics,
    entities.APXSession,
    entities.APXExecution,
    entities.APXAnalytics,
    entities.BillingSubscription,
    entities.NotificationDelivery,
    entities.NotificationTemplate,
  ],
  migrations: [InitialSchema1700000000001, CreateRLSPolicies1700000000002, SeedInitialData1700000000003, FixNotificationSchema1700000000004, CreateToolTemplates1700000000005],
  migrationsRun: true, // Run migrations automatically on startup
  synchronize: false, // Disabled - use migrations for schema changes (production best practice)
  logging: process.env.DATABASE_LOGGING === 'true' || false,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,
  extra: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
  },
  // Connection pooling for production
  poolSize: 20,
  // Enable query result caching if Redis is configured
  // Temporarily disabled Redis cache until Redis is available
  // ...(process.env.REDIS_HOST && {
  //   cache: {
  //     duration: 30000, // 30 seconds
  //     type: 'redis',
  //     options: {
  //       host: process.env.REDIS_HOST || 'localhost',
  //       port: parseInt(process.env.REDIS_PORT || '6379', 10),
  //       password: process.env.REDIS_PASSWORD || undefined,
  //       db: parseInt(process.env.REDIS_CACHE_DB || '1', 10),
  //     },
  //   }
  // }),
  // Row Level Security context
  applicationName: 'tempo-ai-platform',
  // Enable detailed error logging in development
  maxQueryExecutionTime: process.env.NODE_ENV === 'development' ? 1000 : 5000,
});