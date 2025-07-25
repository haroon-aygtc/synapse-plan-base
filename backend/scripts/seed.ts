import { DataSource } from 'typeorm';
import { AppDataSource } from '../libs/database/src/config/database.config';
import { Organization } from '../libs/database/src/entities/organization.entity';
import { User } from '../libs/database/src/entities/user.entity';
import { Agent } from '../libs/database/src/entities/agent.entity';
import { Tool } from '../libs/database/src/entities/tool.entity';
import { Workflow } from '../libs/database/src/entities/workflow.entity';
import { PromptTemplate } from '../libs/database/src/entities/prompt-template.entity';
import { UserRole, SubscriptionPlan } from '../libs/shared/src/interfaces';
import * as bcrypt from 'bcryptjs';

class DatabaseSeeder {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = AppDataSource;
  }

  async initialize(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        console.log('✅ Database connection established');
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async seed(): Promise<void> {
    console.log('🌱 Starting database seeding...');

    try {
      // Clear existing data in development
      if (process.env.NODE_ENV === 'development') {
        await this.clearDatabase();
      }

      // Create organizations
      const organizations = await this.createOrganizations();
      console.log(`✅ Created ${organizations.length} organizations`);

      // Create users
      const users = await this.createUsers(organizations);
      console.log(`✅ Created ${users.length} users`);

      // Create prompt templates
      const promptTemplates = await this.createPromptTemplates(
        organizations,
        users,
      );
      console.log(`✅ Created ${promptTemplates.length} prompt templates`);

      // Create agents
      const agents = await this.createAgents(
        organizations,
        users,
        promptTemplates,
      );
      console.log(`✅ Created ${agents.length} agents`);

      // Create tools
      const tools = await this.createTools(organizations, users);
      console.log(`✅ Created ${tools.length} tools`);

      // Create workflows
      const workflows = await this.createWorkflows(
        organizations,
        users,
        agents,
        tools,
      );
      console.log(`✅ Created ${workflows.length} workflows`);

      console.log('🎉 Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async clearDatabase(): Promise<void> {
    console.log('🧹 Clearing existing data...');

    const entities = [
      'workflow_executions',
      'workflows',
      'tool_executions',
      'tools',
      'agent_test_results',
      'agent_executions',
      'agents',
      'prompt_templates',
      'apix_executions',
      'apix_sessions',
      'sessions',
      'users',
      'organizations',
    ];

    for (const entity of entities) {
      try {
        await this.dataSource.query(
          `TRUNCATE TABLE ${entity} RESTART IDENTITY CASCADE`,
        );
      } catch (error) {
        console.warn(`⚠️ Could not truncate ${entity}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async createOrganizations(): Promise<Organization[]> {
    const organizationRepo = this.dataSource.getRepository(Organization);

    const organizationsData = [
      {
        name: 'SynapseAI Demo Corp',
        slug: 'synapseai-demo',
        description:
          'Demo organization for SynapseAI platform showcasing enterprise AI capabilities',
        website: 'https://demo.synapseai.com',
        plan: SubscriptionPlan.ENTERPRISE,
        settings: {
          theme: 'dark',
          timezone: 'UTC',
          notifications: {
            email: true,
            slack: true,
            webhook: true,
          },
          security: {
            mfaRequired: true,
            sessionTimeout: 3600,
            ipWhitelist: [],
          },
        },
        quotas: {
          agents: 100,
          tools: 200,
          workflows: 50,
          executions: 10000,
          storage: 10737418240, // 10GB
        },
        isActive: true,
      },
      {
        name: 'TechStart Solutions',
        slug: 'techstart-solutions',
        description:
          'Startup focused on AI-powered customer service automation',
        website: 'https://techstart.io',
        plan: SubscriptionPlan.PROFESSIONAL,
        settings: {
          theme: 'light',
          timezone: 'America/New_York',
          notifications: {
            email: true,
            slack: false,
            webhook: false,
          },
        },
        quotas: {
          agents: 25,
          tools: 50,
          workflows: 15,
          executions: 2500,
          storage: 2147483648, // 2GB
        },
        isActive: true,
      },
      {
        name: 'Global Enterprises Inc',
        slug: 'global-enterprises',
        description:
          'Large enterprise leveraging AI for business process automation',
        website: 'https://globalenterprises.com',
        plan: SubscriptionPlan.ENTERPRISE,
        settings: {
          theme: 'auto',
          timezone: 'Europe/London',
          notifications: {
            email: true,
            slack: true,
            webhook: true,
          },
          security: {
            mfaRequired: true,
            sessionTimeout: 1800,
            ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
          },
        },
        quotas: {
          agents: 500,
          tools: 1000,
          workflows: 200,
          executions: 50000,
          storage: 53687091200, // 50GB
        },
        isActive: true,
      },
    ];

    const organizations: Organization[] = [];
    for (const orgData of organizationsData) {
      const organization = organizationRepo.create(orgData);
      const savedOrg = await organizationRepo.save(organization);
      organizations.push(savedOrg);
    }

    return organizations;
  }

  private async createUsers(organizations: Organization[]): Promise<User[]> {
    const userRepo = this.dataSource.getRepository(User);
    const saltRounds = 12;

    const usersData = [
      // SynapseAI Demo Corp users
      {
        email: 'admin@synapseai-demo.com',
        password: 'SecureAdmin123!',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: UserRole.ORG_ADMIN,
        organizationId: organizations[0].id,
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            desktop: true,
          },
          dashboard: {
            layout: 'grid',
            widgets: ['agents', 'tools', 'workflows', 'analytics'],
          },
        },
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'developer@synapseai-demo.com',
        password: 'DevSecure456!',
        firstName: 'Michael',
        lastName: 'Chen',
        role: UserRole.DEVELOPER,
        organizationId: organizations[0].id,
        preferences: {
          theme: 'dark',
          language: 'en',
          codeEditor: {
            theme: 'monokai',
            fontSize: 14,
            tabSize: 2,
          },
        },
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'analyst@synapseai-demo.com',
        password: 'AnalystPass789!',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        role: UserRole.VIEWER,
        organizationId: organizations[0].id,
        preferences: {
          theme: 'light',
          language: 'en',
          dashboard: {
            layout: 'list',
            widgets: ['analytics', 'reports'],
          },
        },
        isActive: true,
        emailVerified: true,
      },
      // TechStart Solutions users
      {
        email: 'founder@techstart.io',
        password: 'FounderSecure123!',
        firstName: 'David',
        lastName: 'Kim',
        role: UserRole.ORG_ADMIN,
        organizationId: organizations[1].id,
        preferences: {
          theme: 'light',
          language: 'en',
        },
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'dev@techstart.io',
        password: 'TechDev456!',
        firstName: 'Lisa',
        lastName: 'Wang',
        role: UserRole.DEVELOPER,
        organizationId: organizations[1].id,
        preferences: {
          theme: 'auto',
          language: 'en',
        },
        isActive: true,
        emailVerified: true,
      },
      // Global Enterprises users
      {
        email: 'it.admin@globalenterprises.com',
        password: 'GlobalAdmin789!',
        firstName: 'Robert',
        lastName: 'Thompson',
        role: UserRole.ORG_ADMIN,
        organizationId: organizations[2].id,
        preferences: {
          theme: 'dark',
          language: 'en',
          security: {
            sessionTimeout: 1800,
          },
        },
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'ai.engineer@globalenterprises.com',
        password: 'AIEngineer123!',
        firstName: 'Maria',
        lastName: 'Garcia',
        role: UserRole.DEVELOPER,
        organizationId: organizations[2].id,
        preferences: {
          theme: 'dark',
          language: 'en',
        },
        isActive: true,
        emailVerified: true,
      },
    ];

    const users: User[] = [];
    for (const userData of usersData) {
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      const user = userRepo.create({
        ...userData,
        passwordHash: hashedPassword,
      });
      delete (user as any).password; // Remove plain password
      const savedUser = await userRepo.save(user);
      users.push(savedUser);
    }

    return users;
  }

  private async createPromptTemplates(
    organizations: Organization[],
    users: User[],
  ): Promise<PromptTemplate[]> {
    const templateRepo = this.dataSource.getRepository(PromptTemplate);

    const templatesData = [
      {
        name: 'Customer Service Assistant',
        description:
          'Professional customer service agent template with empathy and problem-solving focus',
        content: `You are a professional customer service assistant for {{company_name}}. Your role is to:

1. Greet customers warmly and professionally
2. Listen actively to their concerns
3. Provide accurate information about products/services
4. Resolve issues efficiently and empathetically
5. Escalate complex issues when necessary

Key Guidelines:
- Always maintain a helpful and patient tone
- Ask clarifying questions when needed
- Provide step-by-step solutions
- Thank customers for their patience
- End conversations with satisfaction confirmation

Company Context:
- Company: {{company_name}}
- Industry: {{industry}}
- Support Hours: {{support_hours}}
- Escalation Contact: {{escalation_contact}}

Remember: Customer satisfaction is our top priority. Always go the extra mile to help.`,
        category: 'customer-service',
        version: '1.0.0',
        variables: [
          {
            name: 'company_name',
            type: 'string',
            description: 'Name of the company',
            required: true,
            defaultValue: 'Your Company',
          },
          {
            name: 'industry',
            type: 'string',
            description: 'Industry or business sector',
            required: false,
            defaultValue: 'Technology',
          },
          {
            name: 'support_hours',
            type: 'string',
            description: 'Customer support operating hours',
            required: false,
            defaultValue: '9 AM - 6 PM EST',
          },
          {
            name: 'escalation_contact',
            type: 'string',
            description: 'Contact for escalating complex issues',
            required: false,
            defaultValue: 'supervisor@company.com',
          },
        ],
        tags: ['customer-service', 'support', 'professional', 'empathy'],
        isPublic: true,
        isActive: true,
        rating: 4.8,
        ratingCount: 156,
        usageCount: 1247,
        organizationId: organizations[0].id,
        userId: users[0].id,
      },
      {
        name: 'Sales Qualification Agent',
        description:
          'Lead qualification and sales discovery template for B2B sales teams',
        content: `You are a skilled sales qualification specialist. Your mission is to identify high-quality leads and gather essential information for the sales team.

Qualification Framework (BANT):
- Budget: Does the prospect have budget allocated?
- Authority: Are you speaking with a decision-maker?
- Need: Is there a clear business need for our solution?
- Timeline: What's their implementation timeline?

Conversation Flow:
1. Warm introduction and rapport building
2. Discover current challenges and pain points
3. Understand their current solution/process
4. Assess budget and decision-making process
5. Determine timeline and next steps
6. Schedule appropriate follow-up

Key Questions to Ask:
- "What challenges are you currently facing with {{problem_area}}?"
- "How are you handling {{process}} today?"
- "Who else would be involved in evaluating a solution like this?"
- "What's driving the urgency to solve this now?"
- "What would success look like for you?"

Product Context:
- Solution: {{product_name}}
- Key Benefits: {{key_benefits}}
- Target Market: {{target_market}}
- Pricing Range: {{pricing_range}}

Always be consultative, not pushy. Focus on understanding their needs first.`,
        category: 'sales',
        version: '1.2.0',
        variables: [
          {
            name: 'product_name',
            type: 'string',
            description: 'Name of the product or solution',
            required: true,
            defaultValue: 'Our Solution',
          },
          {
            name: 'problem_area',
            type: 'string',
            description: 'Main problem area the product solves',
            required: true,
            defaultValue: 'business operations',
          },
          {
            name: 'key_benefits',
            type: 'string',
            description: 'Primary benefits of the solution',
            required: false,
            defaultValue: 'increased efficiency, cost savings, better insights',
          },
          {
            name: 'target_market',
            type: 'string',
            description: 'Target market or customer segment',
            required: false,
            defaultValue: 'mid-market companies',
          },
          {
            name: 'pricing_range',
            type: 'string',
            description: 'General pricing range or model',
            required: false,
            defaultValue: 'competitive enterprise pricing',
          },
        ],
        tags: ['sales', 'qualification', 'b2b', 'lead-generation'],
        isPublic: true,
        isActive: true,
        rating: 4.6,
        ratingCount: 89,
        usageCount: 567,
        organizationId: organizations[0].id,
        userId: users[1].id,
      },
      {
        name: 'Technical Documentation Assistant',
        description:
          'AI assistant specialized in creating clear, comprehensive technical documentation',
        content: `You are a technical documentation specialist with expertise in creating clear, comprehensive, and user-friendly documentation.

Documentation Principles:
1. Clarity: Use simple, precise language
2. Structure: Organize information logically
3. Completeness: Cover all necessary details
4. Accessibility: Make it easy for different skill levels
5. Maintainability: Create documentation that's easy to update

Documentation Types:
- API Documentation
- User Guides
- Installation Instructions
- Troubleshooting Guides
- Code Comments
- Architecture Overviews

Structure Template:
1. Overview/Introduction
2. Prerequisites
3. Step-by-step instructions
4. Examples and code snippets
5. Common issues and solutions
6. Additional resources

Project Context:
- Project: {{project_name}}
- Technology Stack: {{tech_stack}}
- Target Audience: {{audience_level}}
- Documentation Type: {{doc_type}}

Best Practices:
- Use active voice
- Include practical examples
- Add visual aids when helpful
- Test all instructions
- Keep it updated and relevant

Always prioritize user experience and clarity over technical jargon.`,
        category: 'technical-writing',
        version: '1.0.0',
        variables: [
          {
            name: 'project_name',
            type: 'string',
            description: 'Name of the project or system',
            required: true,
            defaultValue: 'Project Name',
          },
          {
            name: 'tech_stack',
            type: 'string',
            description: 'Technologies and frameworks used',
            required: false,
            defaultValue: 'JavaScript, Node.js, React',
          },
          {
            name: 'audience_level',
            type: 'string',
            description: 'Technical level of the target audience',
            required: false,
            defaultValue: 'intermediate developers',
            validation: {
              enum: ['beginner', 'intermediate', 'advanced', 'mixed'],
            },
          },
          {
            name: 'doc_type',
            type: 'string',
            description: 'Type of documentation being created',
            required: false,
            defaultValue: 'user guide',
            validation: {
              enum: [
                'api-docs',
                'user-guide',
                'installation',
                'troubleshooting',
                'architecture',
              ],
            },
          },
        ],
        tags: ['technical-writing', 'documentation', 'developer-tools'],
        isPublic: true,
        isActive: true,
        rating: 4.7,
        ratingCount: 234,
        usageCount: 892,
        organizationId: organizations[0].id,
        userId: users[1].id,
      },
      {
        name: 'Data Analysis Assistant',
        description:
          'Specialized assistant for data analysis, insights generation, and reporting',
        content: `You are a data analysis expert specializing in extracting insights from data and creating actionable reports.

Analysis Approach:
1. Data Understanding
   - Examine data structure and quality
   - Identify key variables and relationships
   - Note any limitations or biases

2. Exploratory Analysis
   - Generate descriptive statistics
   - Identify patterns and trends
   - Detect outliers and anomalies

3. Deep Dive Analysis
   - Apply appropriate statistical methods
   - Create meaningful visualizations
   - Test hypotheses and validate findings

4. Insight Generation
   - Translate findings into business insights
   - Identify actionable recommendations
   - Quantify impact and opportunities

5. Reporting
   - Create clear, executive-friendly summaries
   - Support conclusions with evidence
   - Provide next steps and recommendations

Analysis Context:
- Dataset: {{dataset_name}}
- Business Objective: {{business_objective}}
- Key Metrics: {{key_metrics}}
- Stakeholder Audience: {{audience}}
- Analysis Type: {{analysis_type}}

Tools and Methods:
- Statistical analysis
- Trend analysis
- Correlation analysis
- Segmentation
- Forecasting
- A/B testing

Always focus on actionable insights that drive business value.`,
        category: 'data-analysis',
        version: '1.1.0',
        variables: [
          {
            name: 'dataset_name',
            type: 'string',
            description: 'Name or description of the dataset',
            required: true,
            defaultValue: 'Customer Data',
          },
          {
            name: 'business_objective',
            type: 'string',
            description: 'Primary business objective for the analysis',
            required: true,
            defaultValue: 'improve customer retention',
          },
          {
            name: 'key_metrics',
            type: 'string',
            description: 'Key metrics to focus on',
            required: false,
            defaultValue:
              'conversion rate, customer lifetime value, churn rate',
          },
          {
            name: 'audience',
            type: 'string',
            description: 'Target audience for the analysis results',
            required: false,
            defaultValue: 'executive team',
            validation: {
              enum: [
                'executive team',
                'marketing team',
                'product team',
                'technical team',
                'mixed',
              ],
            },
          },
          {
            name: 'analysis_type',
            type: 'string',
            description: 'Type of analysis to perform',
            required: false,
            defaultValue: 'descriptive',
            validation: {
              enum: ['descriptive', 'diagnostic', 'predictive', 'prescriptive'],
            },
          },
        ],
        tags: [
          'data-analysis',
          'business-intelligence',
          'reporting',
          'insights',
        ],
        isPublic: true,
        isActive: true,
        rating: 4.9,
        ratingCount: 178,
        usageCount: 1456,
        organizationId: organizations[1].id,
        userId: users[3].id,
      },
    ];

    const templates: PromptTemplate[] = [];
    for (const templateData of templatesData) {
      const template = templateRepo.create(templateData);
      const savedTemplate = await templateRepo.save(template);
      templates.push(savedTemplate);
    }

    return templates;
  }

  private async createAgents(
    organizations: Organization[],
    users: User[],
    promptTemplates: PromptTemplate[],
  ): Promise<Agent[]> {
    const agentRepo = this.dataSource.getRepository(Agent);

    const agentsData = [
      {
        name: 'Customer Support Pro',
        description:
          'Advanced customer support agent with multi-language capabilities and sentiment analysis',
        prompt:
          'You are a professional customer support agent for SynapseAI Demo Corp. Provide helpful, empathetic, and efficient support to customers.',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        tools: ['sentiment-analysis', 'knowledge-search', 'ticket-creation'],
        knowledgeSources: ['product-docs', 'faq', 'troubleshooting-guide'],
        settings: {
          language: 'auto-detect',
          escalationThreshold: 0.8,
          responseStyle: 'professional-friendly',
          maxConversationLength: 50,
        },
        metadata: {
          department: 'customer-service',
          priority: 'high',
          tags: ['support', 'multilingual', 'sentiment-aware'],
        },
        isActive: true,
        version: '2.1.0',
        promptTemplateId: promptTemplates[0].id,
        testingConfig: {
          testScenarios: [
            'product-inquiry',
            'billing-issue',
            'technical-problem',
            'feature-request',
          ],
          successCriteria: {
            responseTime: 5000,
            satisfactionScore: 4.5,
            resolutionRate: 0.85,
          },
        },
        performanceMetrics: {
          successRate: 0.94,
          averageResponseTime: 2300,
          totalExecutions: 15847,
          errorRate: 0.06,
          lastUpdated: new Date(),
        },
        organizationId: organizations[0].id,
        userId: users[0].id,
      },
      {
        name: 'Sales Qualifier Bot',
        description:
          'Intelligent lead qualification agent with CRM integration and scoring capabilities',
        prompt:
          'You are a sales qualification specialist. Your goal is to identify high-quality leads through strategic questioning and assessment.',
        model: 'gpt-4',
        temperature: 0.6,
        maxTokens: 1800,
        tools: ['crm-integration', 'lead-scoring', 'calendar-booking'],
        knowledgeSources: [
          'product-catalog',
          'pricing-guide',
          'competitor-analysis',
        ],
        settings: {
          qualificationFramework: 'BANT',
          leadScoringThreshold: 75,
          autoBookingEnabled: true,
          followUpDelay: 24,
        },
        metadata: {
          department: 'sales',
          priority: 'high',
          tags: ['qualification', 'b2b', 'lead-generation'],
        },
        isActive: true,
        version: '1.8.0',
        promptTemplateId: promptTemplates[1].id,
        testingConfig: {
          testScenarios: [
            'qualified-lead',
            'unqualified-lead',
            'information-seeker',
            'competitor-research',
          ],
          successCriteria: {
            qualificationAccuracy: 0.88,
            conversionRate: 0.32,
            averageCallDuration: 900,
          },
        },
        performanceMetrics: {
          successRate: 0.89,
          averageResponseTime: 1800,
          totalExecutions: 8934,
          errorRate: 0.11,
          lastUpdated: new Date(),
        },
        organizationId: organizations[0].id,
        userId: users[1].id,
      },
      {
        name: 'Technical Writer AI',
        description:
          'Specialized documentation assistant for creating technical content and API documentation',
        prompt:
          'You are a technical writing expert. Create clear, comprehensive documentation that helps developers and users understand complex technical concepts.',
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 3000,
        tools: ['code-analysis', 'diagram-generation', 'version-control'],
        knowledgeSources: ['code-repository', 'api-specs', 'style-guide'],
        settings: {
          writingStyle: 'technical-clear',
          codeExamples: true,
          diagramGeneration: true,
          versionTracking: true,
        },
        metadata: {
          department: 'engineering',
          priority: 'medium',
          tags: ['documentation', 'technical-writing', 'developer-tools'],
        },
        isActive: true,
        version: '1.5.0',
        promptTemplateId: promptTemplates[2].id,
        testingConfig: {
          testScenarios: [
            'api-documentation',
            'user-guide',
            'installation-guide',
            'troubleshooting-doc',
          ],
          successCriteria: {
            readabilityScore: 8.5,
            completenessScore: 0.92,
            accuracyScore: 0.96,
          },
        },
        performanceMetrics: {
          successRate: 0.96,
          averageResponseTime: 4200,
          totalExecutions: 3456,
          errorRate: 0.04,
          lastUpdated: new Date(),
        },
        organizationId: organizations[0].id,
        userId: users[1].id,
      },
      {
        name: 'Data Insights Analyst',
        description:
          'Advanced data analysis agent with statistical modeling and visualization capabilities',
        prompt:
          'You are a data analysis expert. Extract meaningful insights from data and present them in clear, actionable formats for business stakeholders.',
        model: 'gpt-4',
        temperature: 0.4,
        maxTokens: 2500,
        tools: [
          'data-visualization',
          'statistical-analysis',
          'report-generation',
        ],
        knowledgeSources: [
          'data-dictionary',
          'business-metrics',
          'industry-benchmarks',
        ],
        settings: {
          analysisDepth: 'comprehensive',
          visualizationStyle: 'executive-friendly',
          statisticalSignificance: 0.05,
          reportFormat: 'interactive',
        },
        metadata: {
          department: 'analytics',
          priority: 'high',
          tags: ['data-analysis', 'business-intelligence', 'reporting'],
        },
        isActive: true,
        version: '2.0.0',
        promptTemplateId: promptTemplates[3].id,
        testingConfig: {
          testScenarios: [
            'sales-performance-analysis',
            'customer-behavior-study',
            'market-trend-analysis',
            'operational-efficiency-review',
          ],
          successCriteria: {
            insightQuality: 4.6,
            actionabilityScore: 0.88,
            accuracyRate: 0.94,
          },
        },
        performanceMetrics: {
          successRate: 0.92,
          averageResponseTime: 5800,
          totalExecutions: 2187,
          errorRate: 0.08,
          lastUpdated: new Date(),
        },
        organizationId: organizations[1].id,
        userId: users[3].id,
      },
      {
        name: 'Enterprise Process Optimizer',
        description:
          'Business process analysis and optimization agent for large-scale operations',
        prompt:
          'You are a business process optimization expert. Analyze workflows, identify inefficiencies, and recommend improvements for enterprise operations.',
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2200,
        tools: [
          'process-mapping',
          'efficiency-analysis',
          'workflow-automation',
        ],
        knowledgeSources: [
          'process-documentation',
          'best-practices',
          'compliance-requirements',
        ],
        settings: {
          optimizationFocus: 'efficiency-cost',
          complianceCheck: true,
          automationRecommendations: true,
          riskAssessment: true,
        },
        metadata: {
          department: 'operations',
          priority: 'high',
          tags: ['process-optimization', 'enterprise', 'automation'],
        },
        isActive: true,
        version: '1.3.0',
        testingConfig: {
          testScenarios: [
            'supply-chain-optimization',
            'hr-process-improvement',
            'financial-workflow-analysis',
            'compliance-review',
          ],
          successCriteria: {
            efficiencyGain: 0.25,
            costReduction: 0.15,
            complianceScore: 0.98,
          },
        },
        performanceMetrics: {
          successRate: 0.88,
          averageResponseTime: 6200,
          totalExecutions: 1456,
          errorRate: 0.12,
          lastUpdated: new Date(),
        },
        organizationId: organizations[2].id,
        userId: users[5].id,
      },
    ];

    const agents: Agent[] = [];
    for (const agentData of agentsData) {
      const agent = agentRepo.create(agentData);
      const savedAgent = await agentRepo.save(agent);
      agents.push(savedAgent);
    }

    return agents;
  }

  private async createTools(
    organizations: Organization[],
    users: User[],
  ): Promise<Tool[]> {
    const toolRepo = this.dataSource.getRepository(Tool);

    const toolsData = [
      {
        name: 'Slack Notification Sender',
        description:
          'Send notifications and messages to Slack channels and users',
        schema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Slack channel or user to send message to',
              required: true,
            },
            message: {
              type: 'string',
              description: 'Message content to send',
              required: true,
            },
            attachments: {
              type: 'array',
              description: 'Optional message attachments',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  text: { type: 'string' },
                  color: { type: 'string' },
                },
              },
            },
            priority: {
              type: 'string',
              enum: ['low', 'normal', 'high', 'urgent'],
              default: 'normal',
            },
          },
        },
        endpoint: 'https://hooks.slack.com/services/webhook',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {{slack_token}}',
        },
        authentication: {
          type: 'bearer',
          tokenField: 'slack_token',
          required: true,
        },
        settings: {
          timeout: 10000,
          retryAttempts: 3,
          retryDelay: 1000,
          rateLimitPerMinute: 60,
        },
        metadata: {
          category: 'communication',
          provider: 'slack',
          version: '1.2.0',
          tags: ['messaging', 'notifications', 'team-communication'],
        },
        isActive: true,
        organizationId: organizations[0].id,
        userId: users[0].id,
      },
      {
        name: 'Email Campaign Sender',
        description: 'Send personalized email campaigns through SendGrid API',
        schema: {
          type: 'object',
          properties: {
            to: {
              type: 'array',
              description: 'List of recipient email addresses',
              items: { type: 'string', format: 'email' },
              required: true,
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
              required: true,
            },
            htmlContent: {
              type: 'string',
              description: 'HTML email content',
              required: true,
            },
            textContent: {
              type: 'string',
              description: 'Plain text email content',
            },
            templateId: {
              type: 'string',
              description: 'SendGrid template ID',
            },
            personalizations: {
              type: 'array',
              description: 'Personalization data for each recipient',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  substitutions: { type: 'object' },
                },
              },
            },
          },
        },
        endpoint: 'https://api.sendgrid.com/v3/mail/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {{sendgrid_api_key}}',
        },
        authentication: {
          type: 'api_key',
          keyField: 'sendgrid_api_key',
          required: true,
        },
        settings: {
          timeout: 15000,
          retryAttempts: 2,
          retryDelay: 2000,
          rateLimitPerMinute: 100,
        },
        metadata: {
          category: 'email-marketing',
          provider: 'sendgrid',
          version: '2.1.0',
          tags: ['email', 'marketing', 'campaigns', 'personalization'],
        },
        isActive: true,
        organizationId: organizations[0].id,
        userId: users[1].id,
      },
      {
        name: 'CRM Contact Manager',
        description: 'Manage contacts and leads in Salesforce CRM',
        schema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['create', 'update', 'get', 'search'],
              description: 'Action to perform',
              required: true,
            },
            objectType: {
              type: 'string',
              enum: ['Contact', 'Lead', 'Account', 'Opportunity'],
              description: 'Salesforce object type',
              required: true,
            },
            data: {
              type: 'object',
              description: 'Object data for create/update operations',
              properties: {
                FirstName: { type: 'string' },
                LastName: { type: 'string' },
                Email: { type: 'string', format: 'email' },
                Phone: { type: 'string' },
                Company: { type: 'string' },
                Title: { type: 'string' },
                LeadSource: { type: 'string' },
                Status: { type: 'string' },
              },
            },
            searchCriteria: {
              type: 'object',
              description: 'Search criteria for search operations',
            },
            recordId: {
              type: 'string',
              description: 'Salesforce record ID for get/update operations',
            },
          },
        },
        endpoint:
          'https://{{instance}}.salesforce.com/services/data/v58.0/sobjects',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {{salesforce_access_token}}',
        },
        authentication: {
          type: 'oauth2',
          tokenField: 'salesforce_access_token',
          refreshTokenField: 'salesforce_refresh_token',
          required: true,
        },
        settings: {
          timeout: 20000,
          retryAttempts: 3,
          retryDelay: 1500,
          rateLimitPerMinute: 200,
          instanceUrl: '{{instance}}.salesforce.com',
        },
        metadata: {
          category: 'crm',
          provider: 'salesforce',
          version: '1.8.0',
          tags: ['crm', 'contacts', 'leads', 'sales-automation'],
        },
        isActive: true,
        organizationId: organizations[0].id,
        userId: users[1].id,
      },
      {
        name: 'Database Query Executor',
        description:
          'Execute SQL queries against PostgreSQL database with safety checks',
        schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute',
              required: true,
            },
            parameters: {
              type: 'array',
              description: 'Query parameters for prepared statements',
              items: { type: 'string' },
            },
            queryType: {
              type: 'string',
              enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
              description: 'Type of SQL operation',
              required: true,
            },
            maxRows: {
              type: 'integer',
              description: 'Maximum number of rows to return',
              default: 1000,
              minimum: 1,
              maximum: 10000,
            },
            timeout: {
              type: 'integer',
              description: 'Query timeout in milliseconds',
              default: 30000,
              minimum: 1000,
              maximum: 300000,
            },
          },
        },
        endpoint: 'https://api.internal.com/database/execute',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {{database_api_token}}',
          'X-Database-Name': '{{database_name}}',
        },
        authentication: {
          type: 'api_key',
          keyField: 'database_api_token',
          required: true,
        },
        settings: {
          timeout: 60000,
          retryAttempts: 1,
          retryDelay: 0,
          rateLimitPerMinute: 30,
          safetyChecks: true,
          readOnlyMode: false,
        },
        metadata: {
          category: 'database',
          provider: 'postgresql',
          version: '1.0.0',
          tags: ['database', 'sql', 'data-access', 'analytics'],
          securityLevel: 'high',
        },
        isActive: true,
        organizationId: organizations[1].id,
        userId: users[3].id,
      },
      {
        name: 'Document Generator',
        description: 'Generate PDF documents from templates using data inputs',
        schema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'string',
              description: 'Document template identifier',
              required: true,
            },
            data: {
              type: 'object',
              description: 'Data to populate in the template',
              required: true,
            },
            format: {
              type: 'string',
              enum: ['pdf', 'docx', 'html'],
              description: 'Output document format',
              default: 'pdf',
            },
            options: {
              type: 'object',
              description: 'Document generation options',
              properties: {
                pageSize: {
                  type: 'string',
                  enum: ['A4', 'Letter', 'Legal'],
                  default: 'A4',
                },
                orientation: {
                  type: 'string',
                  enum: ['portrait', 'landscape'],
                  default: 'portrait',
                },
                margins: {
                  type: 'object',
                  properties: {
                    top: { type: 'number', default: 20 },
                    right: { type: 'number', default: 20 },
                    bottom: { type: 'number', default: 20 },
                    left: { type: 'number', default: 20 },
                  },
                },
                watermark: {
                  type: 'string',
                  description: 'Watermark text',
                },
              },
            },
          },
        },
        endpoint: 'https://api.documentgen.com/v2/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {{docgen_api_key}}',
        },
        authentication: {
          type: 'api_key',
          keyField: 'docgen_api_key',
          required: true,
        },
        settings: {
          timeout: 45000,
          retryAttempts: 2,
          retryDelay: 3000,
          rateLimitPerMinute: 20,
          maxFileSize: 52428800, // 50MB
        },
        metadata: {
          category: 'document-processing',
          provider: 'custom',
          version: '2.0.0',
          tags: ['documents', 'pdf', 'templates', 'automation'],
        },
        isActive: true,
        organizationId: organizations[2].id,
        userId: users[5].id,
      },
      {
        name: 'Calendar Scheduler',
        description:
          'Schedule meetings and manage calendar events via Google Calendar API',
        schema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['create', 'update', 'delete', 'get', 'list'],
              description: 'Calendar action to perform',
              required: true,
            },
            calendarId: {
              type: 'string',
              description: 'Google Calendar ID',
              default: 'primary',
            },
            event: {
              type: 'object',
              description: 'Event details for create/update operations',
              properties: {
                summary: {
                  type: 'string',
                  description: 'Event title',
                  required: true,
                },
                description: {
                  type: 'string',
                  description: 'Event description',
                },
                start: {
                  type: 'object',
                  properties: {
                    dateTime: { type: 'string', format: 'date-time' },
                    timeZone: { type: 'string', default: 'UTC' },
                  },
                  required: true,
                },
                end: {
                  type: 'object',
                  properties: {
                    dateTime: { type: 'string', format: 'date-time' },
                    timeZone: { type: 'string', default: 'UTC' },
                  },
                  required: true,
                },
                attendees: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', format: 'email' },
                      displayName: { type: 'string' },
                      optional: { type: 'boolean', default: false },
                    },
                  },
                },
                location: {
                  type: 'string',
                  description: 'Meeting location or video link',
                },
                reminders: {
                  type: 'object',
                  properties: {
                    useDefault: { type: 'boolean', default: true },
                    overrides: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          method: { type: 'string', enum: ['email', 'popup'] },
                          minutes: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            eventId: {
              type: 'string',
              description: 'Event ID for update/delete/get operations',
            },
            timeMin: {
              type: 'string',
              format: 'date-time',
              description: 'Start time for list operations',
            },
            timeMax: {
              type: 'string',
              format: 'date-time',
              description: 'End time for list operations',
            },
          },
        },
        endpoint: 'https://www.googleapis.com/calendar/v3/calendars',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {{google_access_token}}',
        },
        authentication: {
          type: 'oauth2',
          tokenField: 'google_access_token',
          refreshTokenField: 'google_refresh_token',
          scope: 'https://www.googleapis.com/auth/calendar',
          required: true,
        },
        settings: {
          timeout: 15000,
          retryAttempts: 3,
          retryDelay: 1000,
          rateLimitPerMinute: 100,
          defaultTimeZone: 'UTC',
        },
        metadata: {
          category: 'productivity',
          provider: 'google',
          version: '1.5.0',
          tags: ['calendar', 'scheduling', 'meetings', 'productivity'],
        },
        isActive: true,
        organizationId: organizations[2].id,
        userId: users[6].id,
      },
    ];

    const tools: Tool[] = [];
    for (const toolData of toolsData) {
      const tool = toolRepo.create(toolData);
      const savedTool = await toolRepo.save(tool);
      tools.push(savedTool);
    }

    return tools;
  }

  private async createWorkflows(
    organizations: Organization[],
    users: User[],
    agents: Agent[],
    tools: Tool[],
  ): Promise<Workflow[]> {
    const workflowRepo = this.dataSource.getRepository(Workflow);

    const workflowsData = [
      {
        name: 'Customer Onboarding Automation',
        description:
          'Automated workflow for new customer onboarding with personalized welcome sequence',
        definition: {
          version: '1.0',
          nodes: [
            {
              id: 'start',
              type: 'trigger',
              name: 'New Customer Signup',
              config: {
                triggerType: 'webhook',
                endpoint: '/webhooks/customer-signup',
              },
              position: { x: 100, y: 100 },
            },
            {
              id: 'validate-data',
              type: 'condition',
              name: 'Validate Customer Data',
              config: {
                conditions: [
                  {
                    field: 'email',
                    operator: 'isValidEmail',
                    value: true,
                  },
                  {
                    field: 'company',
                    operator: 'isNotEmpty',
                    value: true,
                  },
                ],
                logic: 'AND',
              },
              position: { x: 300, y: 100 },
            },
            {
              id: 'create-crm-contact',
              type: 'tool',
              name: 'Create CRM Contact',
              config: {
                toolId: tools.find((t) => t.name === 'CRM Contact Manager')?.id,
                parameters: {
                  action: 'create',
                  objectType: 'Contact',
                  data: {
                    FirstName: '{{customer.firstName}}',
                    LastName: '{{customer.lastName}}',
                    Email: '{{customer.email}}',
                    Company: '{{customer.company}}',
                    LeadSource: 'Website Signup',
                  },
                },
              },
              position: { x: 500, y: 50 },
            },
            {
              id: 'send-welcome-email',
              type: 'tool',
              name: 'Send Welcome Email',
              config: {
                toolId: tools.find((t) => t.name === 'Email Campaign Sender')
                  ?.id,
                parameters: {
                  to: ['{{customer.email}}'],
                  subject: 'Welcome to {{company.name}}!',
                  templateId: 'welcome-template',
                  personalizations: [
                    {
                      email: '{{customer.email}}',
                      substitutions: {
                        firstName: '{{customer.firstName}}',
                        company: '{{customer.company}}',
                      },
                    },
                  ],
                },
              },
              position: { x: 500, y: 150 },
            },
            {
              id: 'schedule-onboarding-call',
              type: 'tool',
              name: 'Schedule Onboarding Call',
              config: {
                toolId: tools.find((t) => t.name === 'Calendar Scheduler')?.id,
                parameters: {
                  action: 'create',
                  event: {
                    summary: 'Onboarding Call - {{customer.company}}',
                    description:
                      'Welcome call for new customer {{customer.firstName}} {{customer.lastName}}',
                    start: {
                      dateTime: '{{scheduledTime}}',
                      timeZone: '{{customer.timezone}}',
                    },
                    end: {
                      dateTime: '{{scheduledEndTime}}',
                      timeZone: '{{customer.timezone}}',
                    },
                    attendees: [
                      {
                        email: '{{customer.email}}',
                        displayName:
                          '{{customer.firstName}} {{customer.lastName}}',
                      },
                      {
                        email: 'onboarding@company.com',
                        displayName: 'Onboarding Team',
                      },
                    ],
                  },
                },
              },
              position: { x: 700, y: 100 },
            },
            {
              id: 'notify-team',
              type: 'tool',
              name: 'Notify Sales Team',
              config: {
                toolId: tools.find(
                  (t) => t.name === 'Slack Notification Sender',
                )?.id,
                parameters: {
                  channel: '#sales-team',
                  message:
                    '🎉 New customer onboarded: {{customer.firstName}} {{customer.lastName}} from {{customer.company}}',
                  attachments: [
                    {
                      title: 'Customer Details',
                      text: 'Email: {{customer.email}}\nCompany: {{customer.company}}\nPlan: {{customer.plan}}',
                      color: 'good',
                    },
                  ],
                  priority: 'normal',
                },
              },
              position: { x: 900, y: 100 },
            },
            {
              id: 'error-handler',
              type: 'condition',
              name: 'Handle Validation Error',
              config: {
                errorHandling: true,
                actions: [
                  {
                    type: 'log',
                    message:
                      'Customer data validation failed: {{error.message}}',
                  },
                  {
                    type: 'notify',
                    channel: '#support-team',
                    message:
                      '⚠️ Customer signup validation failed for {{customer.email}}',
                  },
                ],
              },
              position: { x: 300, y: 250 },
            },
          ],
          edges: [
            { from: 'start', to: 'validate-data' },
            {
              from: 'validate-data',
              to: 'create-crm-contact',
              condition: 'success',
            },
            {
              from: 'validate-data',
              to: 'error-handler',
              condition: 'failure',
            },
            { from: 'create-crm-contact', to: 'send-welcome-email' },
            { from: 'send-welcome-email', to: 'schedule-onboarding-call' },
            { from: 'schedule-onboarding-call', to: 'notify-team' },
          ],
        },
        version: '1.2.0',
        settings: {
          timeout: 300000, // 5 minutes
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 5000,
            exponentialBackoff: true,
          },
          errorHandling: {
            continueOnError: false,
            notifyOnError: true,
            errorChannel: '#workflow-errors',
          },
          scheduling: {
            enabled: true,
            timezone: 'UTC',
          },
        },
        metadata: {
          category: 'customer-onboarding',
          priority: 'high',
          tags: ['onboarding', 'automation', 'customer-success'],
          estimatedDuration: 180000, // 3 minutes
          successRate: 0.94,
        },
        isActive: true,
        organizationId: organizations[0].id,
        userId: users[0].id,
      },
      {
        name: 'Lead Qualification Pipeline',
        description:
          'Automated lead qualification and routing workflow with AI-powered scoring',
        definition: {
          version: '1.0',
          nodes: [
            {
              id: 'lead-trigger',
              type: 'trigger',
              name: 'New Lead Captured',
              config: {
                triggerType: 'form_submission',
                source: 'website_contact_form',
              },
              position: { x: 100, y: 100 },
            },
            {
              id: 'ai-qualification',
              type: 'agent',
              name: 'AI Lead Qualification',
              config: {
                agentId: agents.find((a) => a.name === 'Sales Qualifier Bot')
                  ?.id,
                parameters: {
                  leadData: '{{trigger.formData}}',
                  qualificationFramework: 'BANT',
                  scoringCriteria: {
                    budget: 0.3,
                    authority: 0.25,
                    need: 0.25,
                    timeline: 0.2,
                  },
                },
              },
              position: { x: 300, y: 100 },
            },
            {
              id: 'score-evaluation',
              type: 'condition',
              name: 'Evaluate Lead Score',
              config: {
                conditions: [
                  {
                    field: 'qualificationScore',
                    operator: 'greaterThan',
                    value: 75,
                  },
                ],
              },
              position: { x: 500, y: 100 },
            },
            {
              id: 'high-value-path',
              type: 'parallel',
              name: 'High-Value Lead Processing',
              config: {
                branches: [
                  {
                    name: 'crm-creation',
                    nodes: ['create-opportunity', 'assign-sales-rep'],
                  },
                  {
                    name: 'immediate-followup',
                    nodes: ['schedule-demo', 'send-priority-alert'],
                  },
                ],
              },
              position: { x: 700, y: 50 },
            },
            {
              id: 'create-opportunity',
              type: 'tool',
              name: 'Create Sales Opportunity',
              config: {
                toolId: tools.find((t) => t.name === 'CRM Contact Manager')?.id,
                parameters: {
                  action: 'create',
                  objectType: 'Opportunity',
                  data: {
                    Name: '{{lead.company}} - {{lead.product_interest}}',
                    StageName: 'Qualification',
                    Amount: '{{ai_qualification.estimated_value}}',
                    CloseDate: '{{ai_qualification.timeline}}',
                    LeadSource: '{{lead.source}}',
                    Description: '{{ai_qualification.summary}}',
                  },
                },
              },
              position: { x: 900, y: 20 },
            },
            {
              id: 'schedule-demo',
              type: 'tool',
              name: 'Schedule Product Demo',
              config: {
                toolId: tools.find((t) => t.name === 'Calendar Scheduler')?.id,
                parameters: {
                  action: 'create',
                  event: {
                    summary: 'Product Demo - {{lead.company}}',
                    description:
                      'Product demonstration for {{lead.firstName}} {{lead.lastName}}\n\nLead Score: {{qualificationScore}}\nInterest: {{lead.product_interest}}',
                    start: {
                      dateTime: '{{suggested_demo_time}}',
                      timeZone: '{{lead.timezone}}',
                    },
                    end: {
                      dateTime: '{{suggested_demo_end_time}}',
                      timeZone: '{{lead.timezone}}',
                    },
                    attendees: [
                      {
                        email: '{{lead.email}}',
                        displayName: '{{lead.firstName}} {{lead.lastName}}',
                      },
                      {
                        email: '{{assigned_sales_rep.email}}',
                        displayName: '{{assigned_sales_rep.name}}',
                      },
                    ],
                  },
                },
              },
              position: { x: 900, y: 80 },
            },
            {
              id: 'send-priority-alert',
              type: 'tool',
              name: 'Alert Sales Team',
              config: {
                toolId: tools.find(
                  (t) => t.name === 'Slack Notification Sender',
                )?.id,
                parameters: {
                  channel: '#sales-alerts',
                  message:
                    '🔥 HIGH-VALUE LEAD ALERT 🔥\n\n**{{lead.firstName}} {{lead.lastName}}** from **{{lead.company}}**\n\n📊 **Score:** {{qualificationScore}}/100\n💰 **Est. Value:** ${{ai_qualification.estimated_value}}\n⏰ **Timeline:** {{ai_qualification.timeline}}\n\n**Next Steps:** Demo scheduled for {{demo_date}}',
                  priority: 'high',
                },
              },
              position: { x: 900, y: 140 },
            },
            {
              id: 'medium-value-path',
              type: 'sequence',
              name: 'Medium-Value Lead Nurturing',
              config: {
                condition: {
                  field: 'qualificationScore',
                  operator: 'between',
                  value: [40, 74],
                },
              },
              position: { x: 700, y: 150 },
            },
            {
              id: 'nurture-sequence',
              type: 'tool',
              name: 'Start Nurture Campaign',
              config: {
                toolId: tools.find((t) => t.name === 'Email Campaign Sender')
                  ?.id,
                parameters: {
                  to: ['{{lead.email}}'],
                  subject: 'Thanks for your interest in {{product_name}}',
                  templateId: 'nurture-sequence-1',
                  personalizations: [
                    {
                      email: '{{lead.email}}',
                      substitutions: {
                        firstName: '{{lead.firstName}}',
                        company: '{{lead.company}}',
                        interest: '{{lead.product_interest}}',
                      },
                    },
                  ],
                },
              },
              position: { x: 900, y: 200 },
            },
            {
              id: 'low-value-path',
              type: 'tool',
              name: 'Add to Newsletter',
              config: {
                toolId: tools.find((t) => t.name === 'CRM Contact Manager')?.id,
                parameters: {
                  action: 'create',
                  objectType: 'Contact',
                  data: {
                    FirstName: '{{lead.firstName}}',
                    LastName: '{{lead.lastName}}',
                    Email: '{{lead.email}}',
                    Company: '{{lead.company}}',
                    LeadSource: '{{lead.source}}',
                    Status: 'Newsletter Subscriber',
                  },
                },
              },
              position: { x: 700, y: 250 },
            },
          ],
          edges: [
            { from: 'lead-trigger', to: 'ai-qualification' },
            { from: 'ai-qualification', to: 'score-evaluation' },
            {
              from: 'score-evaluation',
              to: 'high-value-path',
              condition: 'score >= 75',
            },
            {
              from: 'score-evaluation',
              to: 'medium-value-path',
              condition: 'score >= 40 && score < 75',
            },
            {
              from: 'score-evaluation',
              to: 'low-value-path',
              condition: 'score < 40',
            },
            { from: 'high-value-path', to: 'create-opportunity' },
            { from: 'high-value-path', to: 'schedule-demo' },
            { from: 'high-value-path', to: 'send-priority-alert' },
            { from: 'medium-value-path', to: 'nurture-sequence' },
          ],
        },
        version: '2.1.0',
        settings: {
          timeout: 600000, // 10 minutes
          retryPolicy: {
            maxRetries: 2,
            retryDelay: 10000,
            exponentialBackoff: true,
          },
          errorHandling: {
            continueOnError: true,
            notifyOnError: true,
            errorChannel: '#sales-ops',
          },
          aiSettings: {
            model: 'gpt-4',
            temperature: 0.3,
            maxTokens: 1500,
          },
        },
        metadata: {
          category: 'sales-automation',
          priority: 'critical',
          tags: ['lead-qualification', 'sales-automation', 'ai-scoring'],
          estimatedDuration: 240000, // 4 minutes
          successRate: 0.91,
        },
        isActive: true,
        organizationId: organizations[0].id,
        userId: users[1].id,
      },
      {
        name: 'Customer Support Escalation',
        description:
          'Intelligent customer support ticket routing and escalation workflow',
        definition: {
          version: '1.0',
          nodes: [
            {
              id: 'ticket-created',
              type: 'trigger',
              name: 'Support Ticket Created',
              config: {
                triggerType: 'webhook',
                endpoint: '/webhooks/support-ticket',
              },
              position: { x: 100, y: 100 },
            },
            {
              id: 'ai-triage',
              type: 'agent',
              name: 'AI Ticket Triage',
              config: {
                agentId: agents.find((a) => a.name === 'Customer Support Pro')
                  ?.id,
                parameters: {
                  ticketContent: '{{ticket.description}}',
                  customerHistory: '{{customer.history}}',
                  urgencyFactors: {
                    customerTier: '{{customer.tier}}',
                    issueType: '{{ticket.category}}',
                    businessImpact: '{{ticket.business_impact}}',
                  },
                },
              },
              position: { x: 300, y: 100 },
            },
            {
              id: 'priority-routing',
              type: 'condition',
              name: 'Route by Priority',
              config: {
                conditions: [
                  {
                    field: 'priority',
                    operator: 'equals',
                    value: 'critical',
                  },
                  {
                    field: 'priority',
                    operator: 'equals',
                    value: 'high',
                  },
                  {
                    field: 'priority',
                    operator: 'equals',
                    value: 'medium',
                  },
                ],
              },
              position: { x: 500, y: 100 },
            },
            {
              id: 'critical-escalation',
              type: 'parallel',
              name: 'Critical Issue Handling',
              config: {
                branches: [
                  {
                    name: 'immediate-notification',
                    nodes: ['notify-on-call', 'alert-management'],
                  },
                  {
                    name: 'customer-communication',
                    nodes: ['send-acknowledgment', 'schedule-callback'],
                  },
                ],
              },
              position: { x: 700, y: 50 },
            },
            {
              id: 'notify-on-call',
              type: 'tool',
              name: 'Alert On-Call Engineer',
              config: {
                toolId: tools.find(
                  (t) => t.name === 'Slack Notification Sender',
                )?.id,
                parameters: {
                  channel: '@oncall-engineer',
                  message:
                    '🚨 CRITICAL SUPPORT TICKET 🚨\n\n**Ticket #{{ticket.id}}**\n**Customer:** {{customer.name}} ({{customer.tier}})\n**Issue:** {{ticket.summary}}\n**Impact:** {{ticket.business_impact}}\n\n**Action Required:** Immediate response needed\n**SLA:** 15 minutes',
                  priority: 'urgent',
                },
              },
              position: { x: 900, y: 20 },
            },
            {
              id: 'send-acknowledgment',
              type: 'tool',
              name: 'Send Customer Acknowledgment',
              config: {
                toolId: tools.find((t) => t.name === 'Email Campaign Sender')
                  ?.id,
                parameters: {
                  to: ['{{customer.email}}'],
                  subject:
                    "We're on it! Ticket #{{ticket.id}} - {{ticket.summary}}",
                  templateId: 'critical-acknowledgment',
                  personalizations: [
                    {
                      email: '{{customer.email}}',
                      substitutions: {
                        customerName: '{{customer.name}}',
                        ticketId: '{{ticket.id}}',
                        estimatedResolution:
                          '{{ai_triage.estimated_resolution}}',
                        engineerName: '{{assigned_engineer.name}}',
                      },
                    },
                  ],
                },
              },
              position: { x: 900, y: 80 },
            },
            {
              id: 'high-priority-assignment',
              type: 'tool',
              name: 'Assign to Senior Agent',
              config: {
                toolId: tools.find((t) => t.name === 'CRM Contact Manager')?.id,
                parameters: {
                  action: 'update',
                  objectType: 'Case',
                  recordId: '{{ticket.id}}',
                  data: {
                    OwnerId: '{{senior_agent.id}}',
                    Priority: 'High',
                    Status: 'In Progress',
                    Description:
                      '{{ai_triage.analysis}}\n\nAI Recommendations:\n{{ai_triage.recommendations}}',
                  },
                },
              },
              position: { x: 700, y: 150 },
            },
            {
              id: 'standard-assignment',
              type: 'tool',
              name: 'Assign to Available Agent',
              config: {
                toolId: tools.find((t) => t.name === 'CRM Contact Manager')?.id,
                parameters: {
                  action: 'update',
                  objectType: 'Case',
                  recordId: '{{ticket.id}}',
                  data: {
                    OwnerId: '{{available_agent.id}}',
                    Priority: 'Medium',
                    Status: 'New',
                    Description: '{{ai_triage.analysis}}',
                  },
                },
              },
              position: { x: 700, y: 200 },
            },
            {
              id: 'auto-resolution-attempt',
              type: 'agent',
              name: 'Attempt Auto-Resolution',
              config: {
                agentId: agents.find((a) => a.name === 'Customer Support Pro')
                  ?.id,
                parameters: {
                  ticketContent: '{{ticket.description}}',
                  knowledgeBase: 'support-kb',
                  resolutionAttempt: true,
                  customerContext: '{{customer.profile}}',
                },
              },
              position: { x: 700, y: 250 },
            },
            {
              id: 'resolution-check',
              type: 'condition',
              name: 'Check Auto-Resolution',
              config: {
                conditions: [
                  {
                    field: 'auto_resolution.confidence',
                    operator: 'greaterThan',
                    value: 0.85,
                  },
                  {
                    field: 'auto_resolution.customer_satisfaction_predicted',
                    operator: 'greaterThan',
                    value: 4.0,
                  },
                ],
                logic: 'AND',
              },
              position: { x: 900, y: 250 },
            },
            {
              id: 'send-resolution',
              type: 'tool',
              name: 'Send Resolution to Customer',
              config: {
                toolId: tools.find((t) => t.name === 'Email Campaign Sender')
                  ?.id,
                parameters: {
                  to: ['{{customer.email}}'],
                  subject:
                    'Resolution for Ticket #{{ticket.id}} - {{ticket.summary}}',
                  templateId: 'auto-resolution',
                  personalizations: [
                    {
                      email: '{{customer.email}}',
                      substitutions: {
                        customerName: '{{customer.name}}',
                        ticketId: '{{ticket.id}}',
                        resolution: '{{auto_resolution.solution}}',
                        additionalResources: '{{auto_resolution.resources}}',
                      },
                    },
                  ],
                },
              },
              position: { x: 1100, y: 220 },
            },
          ],
          edges: [
            { from: 'ticket-created', to: 'ai-triage' },
            { from: 'ai-triage', to: 'priority-routing' },
            {
              from: 'priority-routing',
              to: 'critical-escalation',
              condition: 'priority == "critical"',
            },
            {
              from: 'priority-routing',
              to: 'high-priority-assignment',
              condition: 'priority == "high"',
            },
            {
              from: 'priority-routing',
              to: 'standard-assignment',
              condition: 'priority == "medium"',
            },
            {
              from: 'priority-routing',
              to: 'auto-resolution-attempt',
              condition: 'priority == "low"',
            },
            { from: 'critical-escalation', to: 'notify-on-call' },
            { from: 'critical-escalation', to: 'send-acknowledgment' },
            { from: 'auto-resolution-attempt', to: 'resolution-check' },
            {
              from: 'resolution-check',
              to: 'send-resolution',
              condition: 'confidence >= 0.85',
            },
            {
              from: 'resolution-check',
              to: 'standard-assignment',
              condition: 'confidence < 0.85',
            },
          ],
        },
        version: '1.4.0',
        settings: {
          timeout: 900000, // 15 minutes
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 5000,
            exponentialBackoff: true,
          },
          slaSettings: {
            critical: 900000, // 15 minutes
            high: 3600000, // 1 hour
            medium: 14400000, // 4 hours
            low: 86400000, // 24 hours
          },
          escalationRules: {
            autoEscalateAfter: 7200000, // 2 hours
            escalationLevels: ['agent', 'senior-agent', 'team-lead', 'manager'],
          },
        },
        metadata: {
          category: 'customer-support',
          priority: 'critical',
          tags: ['support-automation', 'escalation', 'ai-triage'],
          estimatedDuration: 300000, // 5 minutes
          successRate: 0.96,
        },
        isActive: true,
        organizationId: organizations[1].id,
        userId: users[3].id,
      },
    ];

    const workflows: Workflow[] = [];
    for (const workflowData of workflowsData) {
      const workflow = workflowRepo.create(workflowData);
      const savedWorkflow = await workflowRepo.save(workflow);
      workflows.push(savedWorkflow);
    }

    return workflows;
  }

  async destroy(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

// Main execution function
async function main(): Promise<void> {
  const seeder = new DatabaseSeeder();

  try {
    await seeder.initialize();
    await seeder.seed();
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Organizations: 3');
    console.log('- Users: 7');
    console.log('- Prompt Templates: 4');
    console.log('- Agents: 5');
    console.log('- Tools: 6');
    console.log('- Workflows: 3');
    console.log('\n✨ Your SynapseAI platform is ready for testing!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await seeder.destroy();
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default DatabaseSeeder;
