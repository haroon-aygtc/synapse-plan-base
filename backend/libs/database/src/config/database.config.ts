import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as entities from '../entities';

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST', 'localhost'),
  port: configService.get('DATABASE_PORT', 5432),
  username: configService.get('DATABASE_USERNAME', 'postgres'),
  password: configService.get('DATABASE_PASSWORD', 'postgres'),
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

export const databaseConfig = {
  type: 'postgres' as const,
  host: configService.get('DATABASE_HOST', 'localhost'),
  port: configService.get('DATABASE_PORT', 5432),
  username: configService.get('DATABASE_USERNAME', 'postgres'),
  password: configService.get('DATABASE_PASSWORD', 'postgres'),
  database: configService.get('DATABASE_NAME', 'synapseai'),
  entities: Object.values(entities),
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  ssl:
    configService.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
  retryAttempts: 3,
  retryDelay: 3000,
  autoLoadEntities: true,
};
