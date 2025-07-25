import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRLSPolicies1700000002 implements MigrationInterface {
  name = 'CreateRLSPolicies1700000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create RLS policies for multi-tenant isolation

    // Organizations - users can only see their own organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_organizations" ON "organizations"
      FOR ALL TO authenticated_user
      USING ("id" = current_setting('app.current_organization_id')::uuid)
    `);

    // Users - can only see users in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_users" ON "users"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Agents - can only see agents in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_agents" ON "agents"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Tools - can only see tools in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_tools" ON "tools"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Workflows - can only see workflows in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_workflows" ON "workflows"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Widgets - can only see widgets in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_widgets" ON "widgets"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Agent Executions - can only see executions in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_agent_executions" ON "agent_executions"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Tool Executions - can only see executions in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_tool_executions" ON "tool_executions"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Workflow Executions - can only see executions in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_workflow_executions" ON "workflow_executions"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Sessions - can only see sessions in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_sessions" ON "sessions"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Notifications - can only see notifications in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_notifications" ON "notifications"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // HITL Requests - can only see requests in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_hitl_requests" ON "hitl_requests"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Prompt Templates - can only see templates in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_prompt_templates" ON "prompt_templates"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Knowledge Documents - can only see documents in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_knowledge_documents" ON "knowledge_documents"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Widget Analytics - can only see analytics in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_widget_analytics" ON "widget_analytics"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Testing Sandboxes - can only see sandboxes in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_testing_sandboxes" ON "testing_sandboxes"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Test Scenarios - can only see scenarios in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_test_scenarios" ON "test_scenarios"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Test Executions - can only see executions in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_test_executions" ON "test_executions"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Subscriptions - can only see subscriptions in their organization
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_subscriptions" ON "subscriptions"
      FOR ALL TO authenticated_user
      USING ("organizationId" = current_setting('app.current_organization_id')::uuid)
    `);

    // Create role-based policies for additional security

    // Admin-only policies for sensitive operations
    await queryRunner.query(`
      CREATE POLICY "admin_only_user_management" ON "users"
      FOR INSERT TO authenticated_user
      WITH CHECK (
        current_setting('app.current_user_role') IN ('SUPER_ADMIN', 'ADMIN') OR
        "id" = current_setting('app.current_user_id')::uuid
      )
    `);

    await queryRunner.query(`
      CREATE POLICY "admin_only_organization_management" ON "organizations"
      FOR UPDATE TO authenticated_user
      USING (current_setting('app.current_user_role') IN ('SUPER_ADMIN', 'ADMIN'))
    `);

    // Manager and above can manage agents, tools, workflows
    await queryRunner.query(`
      CREATE POLICY "manager_agent_management" ON "agents"
      FOR INSERT TO authenticated_user
      WITH CHECK (
        current_setting('app.current_user_role') IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEVELOPER') AND
        "organizationId" = current_setting('app.current_organization_id')::uuid
      )
    `);

    await queryRunner.query(`
      CREATE POLICY "manager_tool_management" ON "tools"
      FOR INSERT TO authenticated_user
      WITH CHECK (
        current_setting('app.current_user_role') IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEVELOPER') AND
        "organizationId" = current_setting('app.current_organization_id')::uuid
      )
    `);

    await queryRunner.query(`
      CREATE POLICY "manager_workflow_management" ON "workflows"
      FOR INSERT TO authenticated_user
      WITH CHECK (
        current_setting('app.current_user_role') IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEVELOPER') AND
        "organizationId" = current_setting('app.current_organization_id')::uuid
      )
    `);

    // Users can only modify their own resources (unless admin/manager)
    await queryRunner.query(`
      CREATE POLICY "owner_or_admin_agent_modification" ON "agents"
      FOR UPDATE TO authenticated_user
      USING (
        "userId" = current_setting('app.current_user_id')::uuid OR
        current_setting('app.current_user_role') IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
      )
    `);

    await queryRunner.query(`
      CREATE POLICY "owner_or_admin_tool_modification" ON "tools"
      FOR UPDATE TO authenticated_user
      USING (
        "userId" = current_setting('app.current_user_id')::uuid OR
        current_setting('app.current_user_role') IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
      )
    `);

    await queryRunner.query(`
      CREATE POLICY "owner_or_admin_workflow_modification" ON "workflows"
      FOR UPDATE TO authenticated_user
      USING (
        "userId" = current_setting('app.current_user_id')::uuid OR
        current_setting('app.current_user_role') IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
      )
    `);

    // Create database roles for different access levels
    await queryRunner.query(`CREATE ROLE authenticated_user`);
    await queryRunner.query(`CREATE ROLE anonymous_user`);
    await queryRunner.query(`CREATE ROLE service_role`);

    // Grant appropriate permissions
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO authenticated_user`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO anonymous_user`);
    await queryRunner.query(`GRANT ALL ON SCHEMA public TO service_role`);

    // Grant table permissions to authenticated users
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
      'ai_providers',
    ];

    for (const table of tables) {
      await queryRunner.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON "${table}" TO authenticated_user`
      );
      await queryRunner.query(`GRANT ALL ON "${table}" TO service_role`);
    }

    // Grant sequence permissions
    await queryRunner.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated_user`);
    await queryRunner.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all policies
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
      await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation_${table}" ON "${table}"`);
    }

    // Drop role-based policies
    await queryRunner.query(`DROP POLICY IF EXISTS "admin_only_user_management" ON "users"`);
    await queryRunner.query(
      `DROP POLICY IF EXISTS "admin_only_organization_management" ON "organizations"`
    );
    await queryRunner.query(`DROP POLICY IF EXISTS "manager_agent_management" ON "agents"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "manager_tool_management" ON "tools"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "manager_workflow_management" ON "workflows"`);
    await queryRunner.query(
      `DROP POLICY IF EXISTS "owner_or_admin_agent_modification" ON "agents"`
    );
    await queryRunner.query(`DROP POLICY IF EXISTS "owner_or_admin_tool_modification" ON "tools"`);
    await queryRunner.query(
      `DROP POLICY IF EXISTS "owner_or_admin_workflow_modification" ON "workflows"`
    );

    // Drop roles
    await queryRunner.query(`DROP ROLE IF EXISTS authenticated_user`);
    await queryRunner.query(`DROP ROLE IF EXISTS anonymous_user`);
    await queryRunner.query(`DROP ROLE IF EXISTS service_role`);
  }
}
