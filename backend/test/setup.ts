import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-redis-store";

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = "test";
  process.env.DATABASE_NAME = "synapseai_test";
  process.env.REDIS_DB = "15"; // Use separate Redis DB for tests
});

// Helper function to create test module
export const createTestModule = async (
  imports: any[] = [],
  providers: any[] = [],
) => {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [".env.test", ".env"],
      }),
      TypeOrmModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          type: "postgres",
          host: configService.get("DATABASE_HOST", "localhost"),
          port: configService.get("DATABASE_PORT", 5432),
          username: configService.get("DATABASE_USERNAME", "postgres"),
          password: configService.get("DATABASE_PASSWORD", "postgres"),
          database: configService.get("DATABASE_NAME", "synapseai_test"),
          entities: ["libs/database/src/entities/*.entity.ts"],
          synchronize: true, // Only for tests
          dropSchema: true, // Clean database for each test
          logging: false,
        }),
      }),
      CacheModule.registerAsync({
        isGlobal: true,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          store: redisStore,
          host: configService.get("REDIS_HOST", "localhost"),
          port: configService.get("REDIS_PORT", 6379),
          password: configService.get("REDIS_PASSWORD"),
          db: configService.get("REDIS_DB", 15),
          ttl: 300,
        }),
      }),
      ...imports,
    ],
    providers,
  });

  return moduleBuilder.compile();
};

// Clean up after tests
afterAll(async () => {
  // Close database connections
  // This will be handled by the test framework
});
