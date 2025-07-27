import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingTables1700000000006 implements MigrationInterface {
  name = 'AddMissingTables1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification_templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "category" character varying(100) NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "subject" character varying(255) NOT NULL,
        "body" text NOT NULL,
        "htmlBody" text,
        "variables" jsonb,
        "styling" jsonb,
        "deliverySettings" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "isSystem" boolean NOT NULL DEFAULT false,
        "version" integer NOT NULL DEFAULT 1,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        CONSTRAINT "PK_notification_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_templates_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_templates_created_by" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notification_templates_updated_by" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create connection_stats table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "connection_stats" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "totalConnections" integer NOT NULL DEFAULT 0,
        "connectionsByOrg" jsonb NOT NULL DEFAULT '{}',
        "connectionsByRole" jsonb NOT NULL DEFAULT '{}',
        "averageConnectionTime" integer NOT NULL DEFAULT 0,
        "peakConnections" integer NOT NULL DEFAULT 0,
        "messagesPerMinute" integer NOT NULL DEFAULT 0,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_connection_stats" PRIMARY KEY ("id"),
        CONSTRAINT "FK_connection_stats_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for notification_templates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_templates_org_active" 
      ON "notification_templates" ("organizationId", "isActive")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_templates_type_category" 
      ON "notification_templates" ("type", "category")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_templates_name" 
      ON "notification_templates" ("name")
    `);

    // Create indexes for connection_stats
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_connection_stats_org_timestamp" 
      ON "connection_stats" ("organizationId", "timestamp")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_connection_stats_org_timestamp"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_templates_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_templates_type_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_templates_org_active"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "connection_stats"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates"`);
  }
}