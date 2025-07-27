import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateToolTemplates1700000000005 implements MigrationInterface {
  name = 'CreateToolTemplates1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tool_templates table
    await queryRunner.query(`
      CREATE TABLE "tool_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "category" character varying(100) NOT NULL,
        "endpoint" character varying(500) NOT NULL,
        "method" character varying(10) NOT NULL DEFAULT 'POST',
        "schema" jsonb NOT NULL,
        "headers" jsonb,
        "authentication" jsonb,
        "tags" text,
        "iconUrl" character varying(500),
        "isActive" boolean NOT NULL DEFAULT true,
        "isPublic" boolean NOT NULL DEFAULT false,
        "templateRating" decimal(3,2) NOT NULL DEFAULT '0',
        "templateRatingCount" integer NOT NULL DEFAULT '0',
        "templateDownloads" integer NOT NULL DEFAULT '0',
        "templateFeatured" boolean NOT NULL DEFAULT false,
        "templateMetadata" jsonb,
        "parentTemplateId" uuid,
        "version" character varying(50) NOT NULL DEFAULT '1.0.0',
        "metadata" jsonb,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_tool_templates" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_tool_templates_category_isPublic" ON "tool_templates" ("category", "isPublic")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tool_templates_organizationId_isActive" ON "tool_templates" ("organizationId", "isActive")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tool_templates_templateRating" ON "tool_templates" ("templateRating")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "tool_templates" ADD CONSTRAINT "FK_tool_templates_organization" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "tool_templates" ADD CONSTRAINT "FK_tool_templates_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "tool_templates" ADD CONSTRAINT "FK_tool_templates_parent" 
      FOREIGN KEY ("parentTemplateId") REFERENCES "tool_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "tool_templates" DROP CONSTRAINT "FK_tool_templates_parent"
    `);

    await queryRunner.query(`
      ALTER TABLE "tool_templates" DROP CONSTRAINT "FK_tool_templates_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "tool_templates" DROP CONSTRAINT "FK_tool_templates_organization"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "IDX_tool_templates_templateRating"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_tool_templates_organizationId_isActive"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_tool_templates_category_isPublic"
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE "tool_templates"
    `);
  }
} 