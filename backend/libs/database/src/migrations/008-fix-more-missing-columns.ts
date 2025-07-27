import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMoreMissingColumns1700000000008 implements MigrationInterface {
  name = 'FixMoreMissingColumns1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add organizationId to notification_deliveries table
    const hasOrgId = await queryRunner.hasColumn('notification_deliveries', 'organizationId');
    if (!hasOrgId) {
      await queryRunner.query(`
        ALTER TABLE "notification_deliveries" 
        ADD COLUMN "organizationId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
      `);
      
      await queryRunner.query(`
        ALTER TABLE "notification_deliveries" 
        ADD CONSTRAINT "FK_notification_deliveries_organization" 
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      `);
    }

    // Add privacySettings to organizations table
    const hasPrivacySettings = await queryRunner.hasColumn('organizations', 'privacySettings');
    if (!hasPrivacySettings) {
      await queryRunner.query(`
        ALTER TABLE "organizations" 
        ADD COLUMN "privacySettings" jsonb DEFAULT '{}'
      `);
    }

    // Update connection_stats table to allow nullable organizationId for system stats
    const connectionStatsOrgColumn = await queryRunner.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'connection_stats' AND column_name = 'organizationId'
    `);
    
    if (connectionStatsOrgColumn.length > 0 && connectionStatsOrgColumn[0].is_nullable === 'NO') {
      await queryRunner.query(`
        ALTER TABLE "connection_stats" 
        ALTER COLUMN "organizationId" DROP NOT NULL
      `);
    }

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_org_id" 
      ON "notification_deliveries" ("organizationId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_organizations_privacy_settings" 
      ON "organizations" USING GIN ("privacySettings")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organizations_privacy_settings"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_deliveries_org_id"`);

    // Revert organizationId to NOT NULL in connection_stats
    await queryRunner.query(`
      ALTER TABLE "connection_stats" 
      ALTER COLUMN "organizationId" SET NOT NULL
    `);

    // Remove columns (optional - usually not done for safety)
    // await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "privacySettings"`);
    // await queryRunner.query(`ALTER TABLE "notification_deliveries" DROP COLUMN IF EXISTS "organizationId"`);
  }
}