import { MigrationInterface, QueryRunner } from 'typeorm';

// Define enums locally to avoid import issues
enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

enum HITLStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
  CANCELLED = 'CANCELLED',
}

enum HITLPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SYSTEM = 'SYSTEM',
}

enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
  IN_APP = 'IN_APP',
}

export class InitialSchema1700000000001 implements MigrationInterface {
  name = 'InitialSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create extensions with IF NOT EXISTS
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gin"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Create enums with IF NOT EXISTS
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role_enum" AS ENUM(
          'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "subscription_plan_enum" AS ENUM(
          'FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "execution_status_enum" AS ENUM(
          'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "agent_event_enum" AS ENUM(
          'CREATED', 'UPDATED', 'DELETED', 'EXECUTED', 'TESTED', 'DEPLOYED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "hitl_status_enum" AS ENUM(
          'PENDING', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CANCELLED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "hitl_priority_enum" AS ENUM(
          'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_type_enum" AS ENUM(
          'INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_channel_enum" AS ENUM(
          'EMAIL', 'SMS', 'PUSH', 'WEBHOOK', 'IN_APP'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Organizations table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
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

    // Users table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
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

    // AI Providers table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_providers" (
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

    // Agents table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agents" (
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

    // Tools table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tools" (
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

    // Workflows table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflows" (
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

    // Widgets table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "widgets" (
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

    // Sessions table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
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

    // Agent Executions table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "agentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "sessionId" uuid,
        "status" "execution_status_enum" NOT NULL DEFAULT 'PENDING',
        "input" jsonb NOT NULL,
        "output" jsonb,
        "error" text,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "duration" integer,
        "tokensUsed" integer,
        "cost" decimal(10,6),
        "metadata" jsonb,
        CONSTRAINT "PK_agent_executions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_agent_executions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_agent_executions_agent" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_agent_executions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_agent_executions_session" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL
      )
    `);

    // Tool Executions table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tool_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "toolId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "agentExecutionId" uuid,
        "status" "execution_status_enum" NOT NULL DEFAULT 'PENDING',
        "input" jsonb NOT NULL,
        "output" jsonb,
        "error" text,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "duration" integer,
        "cost" decimal(10,6),
        "metadata" jsonb,
        CONSTRAINT "PK_tool_executions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tool_executions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tool_executions_tool" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tool_executions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tool_executions_agent_execution" FOREIGN KEY ("agentExecutionId") REFERENCES "agent_executions"("id") ON DELETE SET NULL
      )
    `);

    // Workflow Executions table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "workflowId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "status" "execution_status_enum" NOT NULL DEFAULT 'PENDING',
        "input" jsonb NOT NULL,
        "output" jsonb,
        "error" text,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "duration" integer,
        "steps" jsonb,
        "metadata" jsonb,
        CONSTRAINT "PK_workflow_executions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workflow_executions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_executions_workflow" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_executions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Notifications table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "channel" "notification_channel_enum" NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "sentAt" TIMESTAMP WITH TIME ZONE,
        "deliveredAt" TIMESTAMP WITH TIME ZONE,
        "status" character varying(50) DEFAULT 'PENDING',
        "metadata" jsonb,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Knowledge Base tables with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_documents" (
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
        "embedding" text,
        "metadata" jsonb,
        "tags" text[],
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_knowledge_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_knowledge_documents_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_knowledge_documents_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Prompt Templates table with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prompt_templates" (
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

    // HITL (Human in the Loop) tables with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hitl_requests" (
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

    // Testing Sandbox tables with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "testing_sandboxes" (
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
      CREATE TABLE IF NOT EXISTS "test_scenarios" (
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
      CREATE TABLE IF NOT EXISTS "test_executions" (
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

    // Billing and subscription tables with IF NOT EXISTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
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
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
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
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prompt_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hitl_requests"`);

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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_slug" ON "organizations" ("slug")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_plan" ON "organizations" ("plan")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_organizations_active" ON "organizations" ("isActive")`
    );

    // Users indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_org_email" ON "users" ("organizationId", "email")`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_active" ON "users" ("isActive")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_last_login" ON "users" ("lastLoginAt")`);

    // Agents indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_agents_org_name" ON "agents" ("organizationId", "name")`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_agents_user" ON "agents" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_agents_active" ON "agents" ("isActive")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_agents_public" ON "agents" ("isPublic")`);

    // Tools indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tools_org_name" ON "tools" ("organizationId", "name")`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tools_user" ON "tools" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tools_type" ON "tools" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tools_active" ON "tools" ("isActive")`);

    // Workflows indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_workflows_org_name" ON "workflows" ("organizationId", "name")`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_workflows_user" ON "workflows" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_workflows_status" ON "workflows" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_workflows_active" ON "workflows" ("isActive")`);

    // Widgets indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_widgets_org_name" ON "widgets" ("organizationId", "name")`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_widgets_user" ON "widgets" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_widgets_type" ON "widgets" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_widgets_active" ON "widgets" ("isActive")`);

    // Sessions indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sessions_user" ON "sessions" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sessions_expires" ON "sessions" ("expiresAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sessions_org" ON "sessions" ("organizationId")`);

    // Executions indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_agent_executions_agent" ON "agent_executions" ("agentId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_agent_executions_user" ON "agent_executions" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_agent_executions_status" ON "agent_executions" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_agent_executions_created" ON "agent_executions" ("createdAt")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tool_executions_tool" ON "tool_executions" ("toolId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tool_executions_user" ON "tool_executions" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tool_executions_status" ON "tool_executions" ("status")`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_workflow_executions_workflow" ON "workflow_executions" ("workflowId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_workflow_executions_user" ON "workflow_executions" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_workflow_executions_status" ON "workflow_executions" ("status")`
    );

    // Notifications indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications" ("type")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_created" ON "notifications" ("createdAt")`
    );

    // Knowledge documents indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_knowledge_documents_org" ON "knowledge_documents" ("organizationId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_knowledge_documents_user" ON "knowledge_documents" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_knowledge_documents_type" ON "knowledge_documents" ("type")`
    );

    // Prompt templates indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_prompt_templates_org" ON "prompt_templates" ("organizationId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_prompt_templates_user" ON "prompt_templates" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_prompt_templates_category" ON "prompt_templates" ("category")`
    );

    // HITL indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hitl_requests_org" ON "hitl_requests" ("organizationId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hitl_requests_requester" ON "hitl_requests" ("requesterId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hitl_requests_assignee" ON "hitl_requests" ("assigneeId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hitl_requests_status" ON "hitl_requests" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hitl_requests_priority" ON "hitl_requests" ("priority")`
    );

    // Testing sandbox indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_testing_sandboxes_org" ON "testing_sandboxes" ("organizationId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_testing_sandboxes_user" ON "testing_sandboxes" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_testing_sandboxes_status" ON "testing_sandboxes" ("status")`
    );

    // Subscriptions indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_subscriptions_org" ON "subscriptions" ("organizationId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_subscriptions_plan" ON "subscriptions" ("plan")`
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
