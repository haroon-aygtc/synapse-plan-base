import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixNotificationSchema1700000000004 implements MigrationInterface {
  name = 'FixNotificationSchema1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old channel column if it exists
    const hasChannelColumn = await queryRunner.hasColumn('notification_preferences', 'channel');
    if (hasChannelColumn) {
      await queryRunner.query(`ALTER TABLE "notification_preferences" DROP COLUMN "channel"`);
    }

    // Drop the old NotificationChannel enum type if it exists
    const hasNotificationChannelType = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'NotificationChannel'
      );
    `);
    
    if (hasNotificationChannelType[0].exists) {
      await queryRunner.query(`DROP TYPE "NotificationChannel" CASCADE`);
    }

    // Drop and recreate the notification_preferences table with the correct structure
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preferences"`);
    
    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "eventType" character varying(100) NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "isEnabled" boolean NOT NULL DEFAULT true,
        "settings" jsonb,
        "userId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_preferences_user_org" 
      ON "notification_preferences" ("userId", "organizationId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_preferences_event_enabled" 
      ON "notification_preferences" ("eventType", "isEnabled")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_notification_preferences_unique" 
      ON "notification_preferences" ("userId", "organizationId", "eventType", "type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the old structure if needed for rollback
    await queryRunner.query(`
      CREATE TYPE "NotificationChannel" AS ENUM ('email', 'sms', 'push', 'webhook', 'in_app')
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_preferences" 
      ADD COLUMN "channel" "NotificationChannel"
    `);

    // Drop the new indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_preferences_user_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_preferences_event_enabled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_preferences_unique"`);
  }
} 