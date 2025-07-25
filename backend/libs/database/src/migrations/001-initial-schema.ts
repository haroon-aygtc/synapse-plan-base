import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000001 implements MigrationInterface {
  name = 'InitialSchema1700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gin"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Create enums
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM(
        'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "subscription_plan_enum" AS ENUM(
        'FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "execution_status_enum" AS ENUM(
        'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "agent_event_enum" AS ENUM(
        'CREATED', 'UPDATED', 'DELETED', 'EXECUTED', 'TESTED', 'DEPLOYED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "hitl_status_enum" AS ENUM(
        'PENDING', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "hitl_priority_enum" AS ENUM(
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM(
        'INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_channel_enum" AS ENUM(
        'EMAIL', 'SMS', 'PUSH', 'WEBHOOK', 'IN_APP'
      )
    `);

    // Organizations table
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "description" text,
        "website" character varying(255),
        "logo" character varying(255),
        "plan" "subscription_plan_enum" NOT NULL DEFAULT 'FREE',
        "settings" jsonb,
        "quotas" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")
      )
    `);

    // Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "firstName" character varying(100) NOT NULL,
        "lastName" character varying(100) NOT NULL,
        "avatar" character varying(255),
        "role" "user_role_enum" NOT NULL DEFAULT 'DEVELOPER',
        "preferences" jsonb,
        "permissions" jsonb,
        "lastLoginAt" TIMESTAMP WITH TIME ZONE,
        "isActive" boolean NOT NULL DEFAULT true,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "emailVerificationToken" character varying(255),
        "passwordResetToken" character varying(255),
        "passwordResetExpiresAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_org_email" UNIQUE ("organizationId", "email"),
        CONSTRAINT "FK_users_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // AI Providers table
    await queryRunner.query(`
      CREATE TABLE "ai_providers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "type" character varying(100) NOT NULL,
        "config" jsonb NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "isDefault" boolean NOT NULL DEFAULT false,
        "rateLimits" jsonb,
        "costConfig" jsonb,
        "healthStatus" character varying(50) DEFAULT 'UNKNOWN',
        "lastHealthCheck" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_ai_providers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_providers_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // Agents table
    await queryRunner.query(`
      CREATE TABLE "agents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "prompt" text NOT NULL,
        "model" character varying(100) NOT NULL,
        "temperature" decimal(3,2) DEFAULT 0.7,
        "maxTokens" integer DEFAULT 1000,
        "tools" jsonb DEFAULT '[]',
        "config" jsonb DEFAULT '{}',
        "version" integer NOT NULL DEFAULT 1,
        "isActive" boolean NOT NULL DEFAULT true,
        "isPublic" boolean NOT NULL DEFAULT false,
        "tags" text[],
        "metadata" jsonb,
        "performanceMetrics" jsonb,
        CONSTRAINT "PK_agents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_agents_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_agents_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Tools table
    await queryRunner.query(`
      CREATE TABLE "tools" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "type" character varying(100) NOT NULL,
        "config" jsonb NOT NULL,
        "schema" jsonb NOT NULL,
        "code" text,
        "version" integer NOT NULL DEFAULT 1,
        "isActive" boolean NOT NULL DEFAULT true,
        "isPublic" boolean NOT NULL DEFAULT false,
        "tags" text[],
        "metadata" jsonb,
        "performanceMetrics" jsonb,
        CONSTRAINT "PK_tools" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tools_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tools_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Workflows table
    await queryRunner.query(`
      CREATE TABLE "workflows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "definition" jsonb NOT NULL,
        "triggers" jsonb DEFAULT '[]',
        "status" "execution_status_enum" NOT NULL DEFAULT 'PENDING',
        "version" integer NOT NULL DEFAULT 1,
        "isActive" boolean NOT NULL DEFAULT true,
        "isPublic" boolean NOT NULL DEFAULT false,
        "tags" text[],
        "metadata" jsonb,
        "performanceMetrics" jsonb,
        CONSTRAINT "PK_workflows" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workflows_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflows_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Widgets table
    await queryRunner.query(`
      CREATE TABLE "widgets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "type" character varying(100) NOT NULL,
        "config" jsonb NOT NULL,
        "styling" jsonb DEFAULT '{}',
        "behavior" jsonb DEFAULT '{}',
        "agentId" uuid,
        "workflowId" uuid,
        "version" integer NOT NULL DEFAULT 1,
        "isActive" boolean NOT NULL DEFAULT true,
        "isPublic" boolean NOT NULL DEFAULT false,
        "deploymentUrl" character varying(500),
        "embedCode" text,
        "tags" text[],
        "metadata" jsonb,
        "performanceMetrics" jsonb,
        CONSTRAINT "PK_widgets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_widgets_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_widgets_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_widgets_agent" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_widgets_workflow" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE SET NULL
      )
    `);

    // Sessions table
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "sessionToken" character varying(500) NOT NULL,
        "refreshToken" character varying(500),
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ipAddress" character varying(45),
        "userAgent" text,
        "metadata" jsonb,
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sessions_token" UNIQUE ("sessionToken"),
        CONSTRAINT "FK_sessions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Execution tables
    await queryRunner.query(`
      CREATE TABLE "agent_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "agentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "sessionId" uuid,
        "input" jsonb NOT NULL,
        "output" jsonb,
        "status" "execution_status_enum" NOT NULL DEFAULT 'PENDING',
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "duration" integer,
        "tokensUsed" integer,
        "cost" decimal(10,4),
        "error" text,
        "metadata" jsonb,
        CONSTRAINT "PK_agent_executions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_agent_executions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_agent_executions_agent" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_agent_executions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_agent_executions_session" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tool_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "toolId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "sessionId" uuid,
        "input" jsonb NOT NULL,
        "output" jsonb,
        "status" "execution_status_enum" NOT NULL DEFAULT 'PENDING',
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "duration" integer,
        "cost" decimal(10,4),
        "error" text,
        "metadata" jsonb,
        CONSTRAINT "PK_tool_executions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tool_executions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tool_executions_tool" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tool_executions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tool_executions_session" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "workflow_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "workflowId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "sessionId" uuid,
        "input" jsonb NOT NULL,
        "output" jsonb,
        "status" "execution_status_enum" NOT NULL DEFAULT 'PENDING',
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "duration" integer,
        "steps" jsonb DEFAULT '[]',
        "currentStep" integer DEFAULT 0,
        "error" text,
        "metadata" jsonb,
        CONSTRAINT "PK_workflow_executions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workflow_executions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_executions_workflow" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_executions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_executions_session" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL
      )
    `);

    // Knowledge Base tables
    await queryRunner.query(`
      CREATE TABLE "knowledge_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "title" character varying(500) NOT NULL,
        "content" text NOT NULL,
        "type" character varying(100) NOT NULL,
        "source" character varying(500),
        "embedding" vector(1536),
        "metadata" jsonb,
        "tags" text[],
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_knowledge_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_knowledge_documents_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_knowledge_documents_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Prompt Templates table
    await queryRunner.query(`
      CREATE TABLE "prompt_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "template" text NOT NULL,
        "variables" jsonb DEFAULT '[]',
        "category" character varying(100),
        "version" integer NOT NULL DEFAULT 1,
        "isActive" boolean NOT NULL DEFAULT true,
        "isPublic" boolean NOT NULL DEFAULT false,
        "tags" text[],
        "metadata" jsonb,
        CONSTRAINT "PK_prompt_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prompt_templates_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_prompt_templates_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // HITL (Human in the Loop) tables
    await queryRunner.query(`
      CREATE TABLE "hitl_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "requesterId" uuid NOT NULL,
        "assigneeId" uuid,
        "title" character varying(500) NOT NULL,
        "description" text NOT NULL,
        "context" jsonb NOT NULL,
        "status" "hitl_status_enum" NOT NULL DEFAULT 'PENDING',
        "priority" "hitl_priority_enum" NOT NULL DEFAULT 'MEDIUM',
        "dueDate" TIMESTAMP WITH TIME ZONE,
        "resolvedAt" TIMESTAMP WITH TIME ZONE,
        "resolution" text,
        "feedback" jsonb,
        "metadata" jsonb,
        CONSTRAINT "PK_hitl_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hitl_requests_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_hitl_requests_requester" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_hitl_requests_assignee" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "type" "notification_type_enum" NOT NULL DEFAULT 'INFO',
        "channel" "notification_channel_enum" NOT NULL DEFAULT 'IN_APP',
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "data" jsonb,
        "metadata" jsonb,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Analytics and monitoring tables
    await queryRunner.query(`
      CREATE TABLE "widget_analytics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "widgetId" uuid NOT NULL,
        "event" character varying(100) NOT NULL,
        "data" jsonb,
        "sessionId" character varying(255),
        "userId" character varying(255),
        "ipAddress" character varying(45),
        "userAgent" text,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_widget_analytics" PRIMARY KEY ("id"),
        CONSTRAINT "FK_widget_analytics_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_widget_analytics_widget" FOREIGN KEY ("widgetId") REFERENCES "widgets"("id") ON DELETE CASCADE
      )
    `);

    // Testing Sandbox tables
    await queryRunner.query(`
      CREATE TABLE "testing_sandboxes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "config" jsonb NOT NULL,
        "environment" jsonb DEFAULT '{}',
        "status" "execution_status_enum" NOT NULL DEFAULT 'PENDING',
        "isActive" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        CONSTRAINT "PK_testing_sandboxes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_testing_sandboxes_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_testing_sandboxes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "test_scenarios" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "sandboxId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "steps" jsonb NOT NULL,
        "expectedResults" jsonb NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        CONSTRAINT "PK_test_scenarios" PRIMARY KEY ("id"),
        CONSTRAINT "FK_test_scenarios_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_test_scenarios_sandbox" FOREIGN KEY ("sandboxId") REFERENCES "testing_sandboxes"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "test_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "scenarioId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "status" "execution_status_enum" NOT NULL DEFAULT 'PENDING',
        "results" jsonb,
        "logs" text[],
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "duration" integer,
        "metadata" jsonb,
        CONSTRAINT "PK_test_executions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_test_executions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_test_executions_scenario" FOREIGN KEY ("scenarioId") REFERENCES "test_scenarios"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_test_executions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Billing and subscription tables
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "plan" "subscription_plan_enum" NOT NULL,
        "status" character varying(50) NOT NULL,
        "stripeSubscriptionId" character varying(255),
        "stripeCustomerId" character varying(255),
        "currentPeriodStart" TIMESTAMP WITH TIME ZONE,
        "currentPeriodEnd" TIMESTAMP WITH TIME ZONE,
        "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscriptions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    await this.createIndexes(queryRunner);

    // Enable Row Level Security
    await this.enableRLS(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "test_executions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "test_scenarios"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "testing_sandboxes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "widget_analytics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hitl_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prompt_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_executions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tool_executions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_executions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "widgets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tools"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_providers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hitl_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hitl_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agent_event_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "execution_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_plan_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }

  private async createIndexes(queryRunner: QueryRunner): Promise<void> {
    // Organizations indexes
    await queryRunner.query(`CREATE INDEX "idx_organizations_slug" ON "organizations" ("slug")`);
    await queryRunner.query(`CREATE INDEX "idx_organizations_plan" ON "organizations" ("plan")`);
    await queryRunner.query(
      `CREATE INDEX "idx_organizations_active" ON "organizations" ("isActive")`
    );

    // Users indexes
    await queryRunner.query(
      `CREATE INDEX "idx_users_org_email" ON "users" ("organizationId", "email")`
    );
    await queryRunner.query(`CREATE INDEX "idx_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX "idx_users_active" ON "users" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "idx_users_last_login" ON "users" ("lastLoginAt")`);

    // Agents indexes
    await queryRunner.query(
      `CREATE INDEX "idx_agents_org_name" ON "agents" ("organizationId", "name")`
    );
    await queryRunner.query(`CREATE INDEX "idx_agents_user" ON "agents" ("userId")`);
    await queryRunner.query(`CREATE INDEX "idx_agents_active" ON "agents" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "idx_agents_public" ON "agents" ("isPublic")`);

    // Tools indexes
    await queryRunner.query(
      `CREATE INDEX "idx_tools_org_name" ON "tools" ("organizationId", "name")`
    );
    await queryRunner.query(`CREATE INDEX "idx_tools_user" ON "tools" ("userId")`);
    await queryRunner.query(`CREATE INDEX "idx_tools_type" ON "tools" ("type")`);
    await queryRunner.query(`CREATE INDEX "idx_tools_active" ON "tools" ("isActive")`);

    // Workflows indexes
    await queryRunner.query(
      `CREATE INDEX "idx_workflows_org_name" ON "workflows" ("organizationId", "name")`
    );
    await queryRunner.query(`CREATE INDEX "idx_workflows_user" ON "workflows" ("userId")`);
    await queryRunner.query(`CREATE INDEX "idx_workflows_status" ON "workflows" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_workflows_active" ON "workflows" ("isActive")`);

    // Execution indexes for analytics
    await queryRunner.query(
      `CREATE INDEX "idx_agent_executions_org_created" ON "agent_executions" ("organizationId", "createdAt" DESC)`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_agent_executions_agent_status" ON "agent_executions" ("agentId", "status")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_agent_executions_session" ON "agent_executions" ("sessionId")`
    );

    await queryRunner.query(
      `CREATE INDEX "idx_tool_executions_org_created" ON "tool_executions" ("organizationId", "createdAt" DESC)`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tool_executions_tool_status" ON "tool_executions" ("toolId", "status")`
    );

    await queryRunner.query(
      `CREATE INDEX "idx_workflow_executions_org_created" ON "workflow_executions" ("organizationId", "createdAt" DESC)`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workflow_executions_workflow_status" ON "workflow_executions" ("workflowId", "status")`
    );

    // Full-text search indexes
    await queryRunner.query(
      `CREATE INDEX "idx_agents_search" ON "agents" USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')))`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tools_search" ON "tools" USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')))`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workflows_search" ON "workflows" USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')))`
    );

    // Session indexes
    await queryRunner.query(`CREATE INDEX "idx_sessions_user_id" ON "sessions" ("userId")`);
    await queryRunner.query(`CREATE INDEX "idx_sessions_expires_at" ON "sessions" ("expiresAt")`);
    await queryRunner.query(`CREATE INDEX "idx_sessions_token" ON "sessions" ("sessionToken")`);

    // Notification indexes
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_created" ON "notifications" ("userId", "createdAt" DESC)`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_read_status" ON "notifications" ("isRead", "createdAt" DESC)`
    );

    // Analytics indexes
    await queryRunner.query(
      `CREATE INDEX "idx_widget_analytics_widget_timestamp" ON "widget_analytics" ("widgetId", "timestamp" DESC)`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_widget_analytics_event_timestamp" ON "widget_analytics" ("event", "timestamp" DESC)`
    );
  }

  private async enableRLS(queryRunner: QueryRunner): Promise<void> {
    // Enable RLS on all tenant-scoped tables
    const tables = [
      'organizations',
      'users',
      'agents',
      'tools',
      'workflows',
      'widgets',
      'agent_executions',
      'tool_executions',
      'workflow_executions',
      'sessions',
      'notifications',
      'hitl_requests',
      'prompt_templates',
      'knowledge_documents',
      'widget_analytics',
      'testing_sandboxes',
      'test_scenarios',
      'test_executions',
      'subscriptions',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    }
  }
}
