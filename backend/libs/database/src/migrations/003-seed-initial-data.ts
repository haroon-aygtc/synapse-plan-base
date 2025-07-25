import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedInitialData1700000003 implements MigrationInterface {
  name = 'SeedInitialData1700000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create default organization
    await queryRunner.query(`
      INSERT INTO "organizations" (
        "id", "organizationId", "name", "slug", "description", 
        "plan", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        uuid_generate_v4(),
        uuid_generate_v4(),
        'Default Organization',
        'default-org',
        'Default organization for initial setup',
        'FREE',
        true,
        NOW(),
        NOW()
      ) ON CONFLICT (slug) DO NOTHING
    `);

    // Create system admin user
    await queryRunner.query(`
      INSERT INTO "users" (
        "id", "organizationId", "email", "passwordHash", 
        "firstName", "lastName", "role", "isActive", 
        "emailVerified", "createdAt", "updatedAt"
      ) 
      SELECT 
        uuid_generate_v4(),
        o."id",
        'admin@system.local',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/hL.LBHyuu', -- 'admin123'
        'System',
        'Administrator',
        'SUPER_ADMIN',
        true,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      WHERE o."slug" = 'default-org'
      ON CONFLICT (email) DO NOTHING
    `);

    // Create default AI providers
    await queryRunner.query(`
      INSERT INTO "ai_providers" (
        "id", "organizationId", "name", "type", "config", 
        "isActive", "isDefault", "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        'OpenAI GPT-4',
        'openai',
        '{"model": "gpt-4", "apiKey": "", "baseURL": "https://api.openai.com/v1"}',
        false,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      WHERE o."slug" = 'default-org'
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "ai_providers" (
        "id", "organizationId", "name", "type", "config", 
        "isActive", "isDefault", "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        'Anthropic Claude',
        'anthropic',
        '{"model": "claude-3-sonnet-20240229", "apiKey": "", "baseURL": "https://api.anthropic.com"}',
        false,
        false,
        NOW(),
        NOW()
      FROM "organizations" o 
      WHERE o."slug" = 'default-org'
      ON CONFLICT DO NOTHING
    `);

    // Create sample prompt templates
    await queryRunner.query(`
      INSERT INTO "prompt_templates" (
        "id", "organizationId", "userId", "name", "description", 
        "template", "variables", "category", "isActive", "isPublic",
        "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Customer Support Assistant',
        'A helpful customer support agent template',
        'You are a helpful customer support assistant for {{company_name}}. 
        
Your role is to:
- Provide accurate information about our products and services
- Help resolve customer issues professionally
- Escalate complex problems when necessary
- Maintain a friendly and helpful tone

Customer Query: {{customer_query}}

Please provide a helpful response.',
        '[{"name": "company_name", "type": "string", "required": true}, {"name": "customer_query", "type": "string", "required": true}]',
        'Customer Support',
        true,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "prompt_templates" (
        "id", "organizationId", "userId", "name", "description", 
        "template", "variables", "category", "isActive", "isPublic",
        "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Code Review Assistant',
        'An AI assistant for code review and suggestions',
        'You are an expert code reviewer. Please review the following code and provide constructive feedback.

Programming Language: {{language}}
Code to Review:
```{{language}}
{{code}}
```

Please provide:
1. Overall code quality assessment
2. Potential bugs or issues
3. Performance improvements
4. Best practice recommendations
5. Security considerations (if applicable)

Focus on being constructive and educational in your feedback.',
        '[{"name": "language", "type": "string", "required": true}, {"name": "code", "type": "text", "required": true}]',
        'Development',
        true,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "prompt_templates" (
        "id", "organizationId", "userId", "name", "description", 
        "template", "variables", "category", "isActive", "isPublic",
        "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Data Analysis Assistant',
        'An AI assistant for data analysis and insights',
        'You are a data analysis expert. Please analyze the provided data and generate insights.

Dataset Description: {{dataset_description}}
Analysis Goal: {{analysis_goal}}

Data:
{{data}}

Please provide:
1. Data summary and key statistics
2. Notable patterns or trends
3. Insights and recommendations
4. Potential data quality issues
5. Suggestions for further analysis

Present your findings in a clear, structured format with actionable insights.',
        '[{"name": "dataset_description", "type": "string", "required": true}, {"name": "analysis_goal", "type": "string", "required": true}, {"name": "data", "type": "text", "required": true}]',
        'Analytics',
        true,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    // Create sample tools
    await queryRunner.query(`
      INSERT INTO "tools" (
        "id", "organizationId", "userId", "name", "description", 
        "type", "config", "schema", "isActive", "isPublic",
        "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Web Search',
        'Search the web for current information',
        'web_search',
        '{"provider": "serp_api", "max_results": 10}',
        '{"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}, "num_results": {"type": "integer", "description": "Number of results to return", "default": 5}}, "required": ["query"]}',
        true,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "tools" (
        "id", "organizationId", "userId", "name", "description", 
        "type", "config", "schema", "isActive", "isPublic",
        "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Calculator',
        'Perform mathematical calculations',
        'calculator',
        '{"precision": 10}',
        '{"type": "object", "properties": {"expression": {"type": "string", "description": "Mathematical expression to evaluate"}}, "required": ["expression"]}',
        true,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "tools" (
        "id", "organizationId", "userId", "name", "description", 
        "type", "config", "schema", "isActive", "isPublic",
        "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Email Sender',
        'Send emails via SMTP',
        'email',
        '{"smtp_host": "", "smtp_port": 587, "use_tls": true}',
        '{"type": "object", "properties": {"to": {"type": "string", "description": "Recipient email address"}, "subject": {"type": "string", "description": "Email subject"}, "body": {"type": "string", "description": "Email body"}}, "required": ["to", "subject", "body"]}',
        false,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    // Create sample agents
    await queryRunner.query(`
      INSERT INTO "agents" (
        "id", "organizationId", "userId", "name", "description", 
        "prompt", "model", "temperature", "maxTokens", "tools",
        "isActive", "isPublic", "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Research Assistant',
        'An AI agent that helps with research tasks using web search',
        'You are a helpful research assistant. You can search the web for current information and provide comprehensive, well-sourced answers to research questions. Always cite your sources and provide multiple perspectives when relevant.',
        'gpt-4',
        0.7,
        2000,
        '[{"name": "web_search", "description": "Search the web for information"}]',
        true,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "agents" (
        "id", "organizationId", "userId", "name", "description", 
        "prompt", "model", "temperature", "maxTokens", "tools",
        "isActive", "isPublic", "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Math Tutor',
        'An AI agent that helps with mathematical problems and explanations',
        'You are a patient and knowledgeable math tutor. Help students understand mathematical concepts by breaking down problems step-by-step, providing clear explanations, and encouraging learning. Use the calculator tool when needed for complex calculations.',
        'gpt-4',
        0.5,
        1500,
        '[{"name": "calculator", "description": "Perform mathematical calculations"}]',
        true,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    // Create sample workflows
    await queryRunner.query(`
      INSERT INTO "workflows" (
        "id", "organizationId", "userId", "name", "description", 
        "definition", "triggers", "status", "isActive", "isPublic",
        "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Customer Inquiry Processing',
        'Automated workflow for processing customer inquiries',
        '{
          "steps": [
            {
              "id": "classify",
              "type": "agent",
              "name": "Classify Inquiry",
              "config": {
                "prompt": "Classify this customer inquiry into one of: technical_support, billing, general_question, complaint",
                "model": "gpt-3.5-turbo"
              }
            },
            {
              "id": "route",
              "type": "conditional",
              "name": "Route Based on Classification",
              "conditions": [
                {
                  "if": "classification == technical_support",
                  "then": "technical_agent"
                },
                {
                  "if": "classification == billing",
                  "then": "billing_agent"
                },
                {
                  "else": "general_agent"
                }
              ]
            },
            {
              "id": "respond",
              "type": "agent",
              "name": "Generate Response",
              "config": {
                "prompt": "Generate a helpful response to this customer inquiry",
                "model": "gpt-4"
              }
            }
          ]
        }',
        '[{"type": "webhook", "config": {"endpoint": "/webhook/customer-inquiry"}}]',
        'PENDING',
        true,
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    // Create sample testing sandbox
    await queryRunner.query(`
      INSERT INTO "testing_sandboxes" (
        "id", "organizationId", "userId", "name", "description", 
        "config", "environment", "status", "isActive",
        "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Default Testing Environment',
        'Default sandbox for testing agents and workflows',
        '{
          "timeout": 30000,
          "memory_limit": "512MB",
          "cpu_limit": "1000m",
          "network_access": true,
          "allowed_domains": ["api.openai.com", "api.anthropic.com"]
        }',
        '{
          "NODE_ENV": "test",
          "LOG_LEVEL": "debug"
        }',
        'PENDING',
        true,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    // Create notification preferences for admin user
    await queryRunner.query(`
      INSERT INTO "notifications" (
        "id", "organizationId", "userId", "title", "message", 
        "type", "channel", "isRead", "createdAt", "updatedAt"
      )
      SELECT 
        uuid_generate_v4(),
        o."id",
        u."id",
        'Welcome to the Platform',
        'Welcome to your AI agent platform! Your system has been initialized with sample data including agents, tools, and workflows. You can start building and deploying your AI solutions right away.',
        'INFO',
        'IN_APP',
        false,
        NOW(),
        NOW()
      FROM "organizations" o 
      CROSS JOIN "users" u
      WHERE o."slug" = 'default-org' AND u."email" = 'admin@system.local'
      ON CONFLICT DO NOTHING
    `);

    // Update statistics for better query planning
    await queryRunner.query(`ANALYZE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Clean up seed data
    await queryRunner.query(`DELETE FROM "notifications" WHERE "title" = 'Welcome to the Platform'`);
    await queryRunner.query(`DELETE FROM "testing_sandboxes" WHERE "name" = 'Default Testing Environment'`);
    await queryRunner.query(`DELETE FROM "workflows" WHERE "name" = 'Customer Inquiry Processing'`);
    await queryRunner.query(`DELETE FROM "agents" WHERE "name" IN ('Research Assistant', 'Math Tutor')`);
    await queryRunner.query(`DELETE FROM "tools" WHERE "name" IN ('Web Search', 'Calculator', 'Email Sender')`);
    await queryRunner.query(`DELETE FROM "prompt_templates" WHERE "name" IN ('Customer Support Assistant', 'Code Review Assistant', 'Data Analysis Assistant')`);
    await queryRunner.query(`DELETE FROM "ai_providers" WHERE "name" IN ('OpenAI GPT-4', 'Anthropic Claude')`);
    await queryRunner.query(`DELETE FROM "users" WHERE "email" = 'admin@system.local'`);
    await queryRunner.query(`DELETE FROM "organizations" WHERE "slug" = 'default-org'`);
  }
}