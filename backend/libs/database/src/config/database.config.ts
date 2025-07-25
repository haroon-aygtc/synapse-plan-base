import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as entities from '../entities';
import { InitialSchema1700000001 } from '../migrations/001-initial-schema';
import { CreateRLSPolicies1700000002 } from '../migrations/002-create-rls-policies';
import { SeedInitialData1700000003 } from '../migrations/003-seed-initial-data';

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST', 'localhost'),
  port: configService.get('DATABASE_PORT', 5432),
  username: configService.get('DATABASE_USERNAME', 'postgres'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME', 'synapseai'),
  entities: Object.values(entities),
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  ssl:
    configService.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'tempo_ai_platform',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  migrations: [
    InitialSchema1700000001,
    CreateRLSPolicies1700000002,
    SeedInitialData1700000003,
  ],
  migrationsRun: process.env.DATABASE_MIGRATIONS_RUN === 'true',
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true' || false,
  logging: process.env.DATABASE_LOGGING === 'true' || false,
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: false,
  } : false,
  extra: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4_unicode_ci',
  },
  // Connection pooling for production
  poolSize: 20,
  // Enable query result caching
  cache: {
    duration: 30000, // 30 seconds
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_CACHE_DB, 10) || 1,
    },
  },
  // Row Level Security context
  applicationName: 'tempo-ai-platform',
  // Enable detailed error logging in development
  maxQueryExecutionTime: process.env.NODE_ENV === 'development' ? 1000 : 5000,
});