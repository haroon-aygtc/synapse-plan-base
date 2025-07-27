import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMissingColumns1700000000007 implements MigrationInterface {
  name = 'FixMissingColumns1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add templateId column to notifications table if it doesn't exist
    const hasTemplateId = await queryRunner.hasColumn('notifications', 'templateId');
    if (!hasTemplateId) {
      await queryRunner.query(`
        ALTER TABLE "notifications" 
        ADD COLUMN "templateId" uuid
      `);
      
      await queryRunner.query(`
        ALTER TABLE "notifications" 
        ADD CONSTRAINT "FK_notifications_template" 
        FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL
      `);
    }

    // Add status column to ai_providers table if it doesn't exist
    const hasStatus = await queryRunner.hasColumn('ai_providers', 'status');
    if (!hasStatus) {
      // Create provider status enum
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "provider_status_enum" AS ENUM(
            'active', 'inactive', 'error', 'maintenance'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await queryRunner.query(`
        ALTER TABLE "ai_providers" 
        ADD COLUMN "status" "provider_status_enum" DEFAULT 'inactive'
      `);
    }

    // Create notification_deliveries table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "notificationId" uuid NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "status" "execution_status_enum" NOT NULL DEFAULT 'PENDING',
        "recipient" character varying(500) NOT NULL,
        "deliveryData" jsonb,
        "providerResponse" jsonb,
        "providerId" character varying(100),
        "sentAt" TIMESTAMP WITH TIME ZONE,
        "deliveredAt" TIMESTAMP WITH TIME ZONE,
        "failedAt" TIMESTAMP WITH TIME ZONE,
        "nextRetryAt" TIMESTAMP WITH TIME ZONE,
        "retryCount" integer NOT NULL DEFAULT 0,
        "maxRetries" integer NOT NULL DEFAULT 3,
        "errorMessage" text,
        "errorCode" character varying(100),
        "responseTime" integer,
        "cost" decimal(10,4),
        "currency" character varying(10),
        CONSTRAINT "PK_notification_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_deliveries_notification" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE
      )
    `);

    // Create notification priority enum if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_priority_enum" AS ENUM(
          'LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add missing columns to notifications table
    const notificationColumns = [
      { name: 'type', type: '"notification_type_enum"', default: "'IN_APP'" },
      { name: 'priority', type: '"notification_priority_enum"', default: "'MEDIUM'" },
      { name: 'status', type: '"execution_status_enum"', default: "'PENDING'" },
      { name: 'eventType', type: 'character varying(100)' },
      { name: 'sourceModule', type: 'character varying(100)' },
      { name: 'correlationId', type: 'character varying(255)' },
      { name: 'scheduledFor', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'sentAt', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'readAt', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'retryCount', type: 'integer', default: '0' },
      { name: 'maxRetries', type: 'integer', default: '3' },
      { name: 'errorMessage', type: 'text' },
      { name: 'deliveryConfig', type: 'jsonb' }
    ];

    for (const column of notificationColumns) {
      const hasColumn = await queryRunner.hasColumn('notifications', column.name);
      if (!hasColumn) {
        let query = `ALTER TABLE "notifications" ADD COLUMN "${column.name}" ${column.type}`;
        if (column.default) {
          query += ` DEFAULT ${column.default}`;
        }
        await queryRunner.query(query);
      }
    }

    // Add missing columns to ai_providers table
    const aiProviderColumns = [
      { name: 'routingRules', type: 'jsonb' },
      { name: 'priority', type: 'integer', default: '100' },
      { name: 'costMultiplier', type: 'decimal(10,6)', default: '1.0' },
      { name: 'healthCheck', type: 'jsonb' },
      { name: 'metrics', type: 'jsonb' },
      { name: 'securityConfig', type: 'jsonb' },
      { name: 'performanceConfig', type: 'jsonb' },
      { name: 'userId', type: 'uuid' }
    ];

    for (const column of aiProviderColumns) {
      const hasColumn = await queryRunner.hasColumn('ai_providers', column.name);
      if (!hasColumn) {
        let query = `ALTER TABLE "ai_providers" ADD COLUMN "${column.name}" ${column.type}`;
        if (column.default) {
          query += ` DEFAULT ${column.default}`;
        }
        await queryRunner.query(query);
      }
    }

    // Add foreign key for userId in ai_providers if it doesn't exist
    const hasUserFK = await queryRunner.hasColumn('ai_providers', 'userId');
    if (hasUserFK) {
      try {
        await queryRunner.query(`
          ALTER TABLE "ai_providers" 
          ADD CONSTRAINT "FK_ai_providers_user" 
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
      } catch (error) {
        // Constraint might already exist, ignore error
      }
    }

    // Create indexes for notification_deliveries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_notification_type" 
      ON "notification_deliveries" ("notificationId", "type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_status_created" 
      ON "notification_deliveries" ("status", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_delivered_at" 
      ON "notification_deliveries" ("deliveredAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_next_retry" 
      ON "notification_deliveries" ("nextRetryAt")
    `);

    // Create additional indexes for notifications
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_template_id" 
      ON "notifications" ("templateId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_scheduled_for" 
      ON "notifications" ("scheduledFor")
    `);

    // Create additional indexes for ai_providers
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ai_providers_org_status" 
      ON "ai_providers" ("organizationId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_providers_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_scheduled_for"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_template_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_deliveries_next_retry"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_deliveries_delivered_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_deliveries_status_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_deliveries_notification_type"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_deliveries"`);

    // Remove columns (optional - usually not done in down migrations for safety)
    // await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "templateId"`);
    // await queryRunner.query(`ALTER TABLE "ai_providers" DROP COLUMN IF EXISTS "status"`);
    
    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "provider_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_priority_enum"`);
  }
}