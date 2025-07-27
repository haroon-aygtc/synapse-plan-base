import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InitialSchema1700000000001 } from '../migrations/001-initial-schema';
import { CreateRLSPolicies1700000000002 } from '../migrations/002-create-rls-policies';
import { SeedInitialData1700000000003 } from '../migrations/003-seed-initial-data';
import { FixNotificationSchema1700000000004 } from '../migrations/004-fix-notification-schema';
import { CreateToolTemplates1700000000005 } from '../migrations/005-create-tool-templates';
import { AddMissingTables1700000000006 } from '../migrations/006-add-missing-tables';
import { FixMissingColumns1700000000007 } from '../migrations/007-fix-missing-columns';
import { FixMoreMissingColumns1700000000008 } from '../migrations/008-fix-more-missing-columns';

const configService = new ConfigService();

export const MigrationDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST', 'localhost'),
  port: configService.get('DATABASE_PORT', 5432),
  username: configService.get('DATABASE_USERNAME', 'postgres'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME', 'synapseai'),
  entities: [], // Empty entities array for migrations
  migrations: [
    InitialSchema1700000000001,
    CreateRLSPolicies1700000000002,
    SeedInitialData1700000000003,
    FixNotificationSchema1700000000004,
    CreateToolTemplates1700000000005,
    AddMissingTables1700000000006,
    FixMissingColumns1700000000007,
    FixMoreMissingColumns1700000000008
  ],
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
}); 