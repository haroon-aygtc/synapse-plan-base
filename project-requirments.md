
PROJECT SCOPE:
Build a production-ready SaaS platform where users can create AI agents, build tools, manage hybrid workflows, handle approvals, organize knowledge, generate widgets, monitor everything, and administer organizations - all through one unified, multi-tenant system.

CORE INFRASTRUCTURE REQUIREMENTS:

**APIX Real-Time Engine:**
- Single WebSocket gateway handling ALL platform events
- Event streaming for: agents, tools, hybrids, sessions, approvals, knowledge, widgets, analytics, billing, notifications
- Real-time state synchronization across all modules
- Event replay and persistence for reliability
- Cross-module event routing and pub/sub system

**Multi-Tenant Architecture:**
- Organization-scoped data isolation for ALL modules
- Tenant-aware database queries with automatic filtering
- Resource quotas and billing enforcement at runtime
- Cross-organization security boundaries
- Tenant-specific customization and branding

**Authentication + RBAC System:**
- JWT with organization-scoped permissions
- Role hierarchy: SUPER_ADMIN, ORG_ADMIN, DEVELOPER, VIEWER
- Feature-based permissions for all modules
- API key management for external integrations
- SSO integration framework

**Session + Memory Management:**
- Redis-based unified session storage for ALL modules
- Cross-module session sharing and context preservation
- Memory limits and intelligent truncation
- Session analytics and performance monitoring
- Real-time session synchronization

**Billing + Quota System:**
- Usage tracking for agents, tools, providers, storage, API calls
- Runtime quota enforcement with hard stops
- Billing meter integration for all resource consumption
- Plan-based feature gating (Free, Pro, Enterprise)
- Cost allocation and budget alerts

**Notification Infrastructure:**
- Multi-channel notifications (email, SMS, webhook, push)
- Event-driven notification triggers from all modules
- Notification templates and customization
- Delivery tracking and failure handling
- Notification preferences per user/organization

**Universal Analytics System:**
- Event collection from ALL modules and user interactions
- Real-time metrics aggregation and dashboards
- Usage patterns, performance metrics, error tracking
- Business intelligence and predictive analytics
- Data export and custom reporting

COMPLETE DATABASE SCHEMA:
Create tables for: Organizations, Users, Roles, Sessions, Agents, Tools, Hybrids, Providers, HITLRequests, Documents, Widgets, Analytics, Sandboxes, Notifications, Billing, Quotas, Templates - with proper relationships and constraints.

UNIFIED API STRUCTURE:
- /api/v1/auth/* - Authentication and authorization
- /api/v1/agents/* - Agent management and execution
- /api/v1/tools/* - Tool creation and execution  
- /api/v1/hybrids/* - Tool-Agent hybrid workflows
- /api/v1/sessions/* - Session and memory management
- /api/v1/hitl/* - Human-in-the-loop workflows
- /api/v1/knowledge/* - Document and RAG system
- /api/v1/widgets/* - Widget generation and embedding
- /api/v1/analytics/* - Metrics and reporting
- /api/v1/admin/* - Organization and user management
- /api/v1/billing/* - Usage and subscription management
- /api/v1/sdk/* - Universal SDK endpoints

PRODUCTION INFRASTRUCTURE:
- PostgreSQL with proper indexing and performance optimization
- Redis clustering for high availability
- Message queue for async processing
- File storage for documents and assets
- CDN for global content delivery
- Monitoring and alerting systems
- Backup and disaster recovery

STRICT REQUIREMENTS:
- True multi-tenancy with organization isolation
- Real-time everything via APIX WebSocket protocol
- Production-ready authentication and security
- Actual billing integration with usage enforcement
- Complete audit logging and compliance
- Zero mocks, placeholders, or simulated behavior

BUILD THE COMPLETE FOUNDATION that supports all SynapseAI capabilities in one unified, production-ready platform.
```


🤖 **PROMPT 2: Agent Builder + Prompt Template System**

```
You are adding the Agent Builder and centralized Prompt Template System to the existing SynapseAI platform foundation. These systems enable AI agent creation with reusable prompt templates and memory management.

BUILDS UPON: SynapseAI foundation with APIX, authentication, sessions, billing, and notification infrastructure

AGENT BUILDER REQUIREMENTS:
- Visual drag-and-drop agent configuration interface
- Agent execution with session memory and context preservation
- Real-time agent testing with live AI provider responses
- Agent versioning, rollback, and A/B testing capabilities
- Integration with billing system for usage tracking and quota enforcement

PROMPT TEMPLATE SYSTEM REQUIREMENTS:
- Centralized template library shared across all agents
- Template versioning and inheritance
- Variable injection with type validation
- Template marketplace with sharing and collaboration
- Prompt optimization and performance analytics

INTEGRATION WITH EXISTING INFRASTRUCTURE:
- Uses existing APIX for real-time agent execution streaming
- Integrates with existing session management for conversation memory
- Connects to existing billing system for usage metering
- Uses existing notification system for agent alerts
- Feeds data to existing analytics for performance tracking

AGENT EXECUTION FLOW:
User creates agent → Agent loads prompt template → Execution creates session → Uses existing provider management → Results tracked in billing → Events streamed via APIX → Analytics updated → Notifications sent if needed

TEMPLATE SHARING:
- Organization template libraries with access controls
- Public template marketplace with ratings and reviews
- Template performance metrics and optimization suggestions
- Version control with branch management
- Template compliance and safety validation

BILLING INTEGRATION:
- Agent execution costs tracked per organization
- Quota enforcement with graceful degradation
- Usage forecasting and budget alerts
- Plan-based agent limits and feature restrictions

APIX EVENTS:
- agent_created, agent_updated, agent_executed
- template_created, template_shared, template_optimized
- agent_quota_exceeded, agent_execution_failed
- Real-time streaming of agent responses and thinking process

NO DUPLICATION:
- Use existing authentication and organization scoping
- Use existing APIX infrastructure for real-time communication
- Use existing session management for agent memory
- Use existing billing and quota systems

BUILD AGENT BUILDER and PROMPT TEMPLATE SYSTEM as core features of the unified SynapseAI platform.
```

## ⚙️ **PROMPT 3: Tool Manager + Tool-Agent Hybrid System**

```
You are adding the Tool Manager and Tool-Agent Hybrid System to the existing SynapseAI platform. These systems enable API tool creation and hybrid workflows combining tools with agent intelligence.

BUILDS UPON: SynapseAI foundation + Agent Builder + Prompt Template System

TOOL MANAGER REQUIREMENTS:
- Visual tool builder with schema definition and API integration
- Tool execution with retry logic, timeout handling, and error recovery
- Tool testing harness with real external API validation
- Tool marketplace with sharing, ratings, and monetization
- Integration with existing billing system for tool usage tracking

TOOL-AGENT HYBRID SYSTEM REQUIREMENTS:
- Visual workflow builder combining agents and tools
- Conditional logic trees with decision points
- Dynamic parameter mapping between tools and agent context
- Hybrid execution with real-time coordination
- Fallback strategies and error handling

INTEGRATION WITH EXISTING SYSTEMS:
- Agents can invoke tools during execution via existing session system
- Tools can trigger agent reasoning for complex decisions
- Hybrid workflows use existing APIX for real-time coordination
- All executions tracked in existing billing and analytics systems
- Uses existing notification system for workflow alerts

HYBRID EXECUTION FLOW:
User creates hybrid workflow → Agent reasoning begins → Agent decides to use tool → Tool execution with parameter binding → Results fed back to agent → Agent continues reasoning → Final response → All tracked in existing systems

TOOL ECOSYSTEM:
- Pre-built tool library (email, database, API, file processing)
- Custom tool creation with code sandboxing
- Tool chaining and pipeline creation
- Tool performance optimization and caching
- Tool security validation and compliance

BILLING INTEGRATION:
- Tool execution costs per API call/computation
- Hybrid workflow cost calculation and optimization
- Quota enforcement for tool usage and hybrid executions
- Cost allocation between tool usage and agent reasoning

APIX EVENTS:
- tool_created, tool_executed, tool_chained
- hybrid_started, hybrid_step_completed, hybrid_finished
- tool_quota_exceeded, hybrid_execution_failed
- Real-time streaming of hybrid workflow progress

SECURITY AND SANDBOXING:
- Secure tool execution environment with resource limits
- API credential management and encryption
- Tool output validation and sanitization
- Cross-tool data isolation and security

NO DUPLICATION:
- Use existing agent execution engine for hybrid workflows
- Use existing session management for hybrid state
- Use existing billing and quota enforcement
- Use existing APIX for real-time coordination

BUILD TOOL MANAGER and HYBRID SYSTEM as integrated components of the unified platform.
```

## 🔄 **PROMPT 4: Provider Management + Universal SDK**

```
You are adding Provider Management and Universal SDK to the existing SynapseAI platform. These systems provide AI orchestration and unified API access for all platform capabilities.

BUILDS UPON: SynapseAI foundation + Agent Builder + Tool Manager + Hybrid System

PROVIDER MANAGEMENT REQUIREMENTS:
- Multi-AI provider integration (OpenAI, Claude, Gemini, Mistral, Groq, custom)
- Smart provider routing based on cost, performance, capabilities, availability
- Automatic failover with circuit breaker patterns
- Provider cost optimization and budget management
- Provider performance analytics and A/B testing

UNIVERSAL SDK REQUIREMENTS:
- Single SDK wrapping all platform capabilities
- TypeScript/JavaScript, Python, and REST API clients
- Authentication and organization scoping built-in
- Real-time WebSocket connection management
- Error handling and retry logic across all operations

INTEGRATION WITH EXISTING SYSTEMS:
- Serves Agent Builder for AI completions and reasoning
- Serves Tool Manager for AI-assisted tool configuration
- Serves Hybrid System for intelligent workflow orchestration
- Integrates with existing billing for provider cost tracking
- Uses existing analytics for provider performance monitoring

PROVIDER SELECTION ALGORITHM:
- Multi-factor scoring: cost, latency, reliability, capabilities
- Machine learning for performance prediction
- User preference and organizational policy enforcement
- Real-time provider health monitoring
- Geographic routing for compliance and performance

SDK CAPABILITIES:
- Agent creation, execution, and management
- Tool building, testing, and deployment
- Hybrid workflow design and execution
- Session and memory management
- HITL workflow integration
- Knowledge base operations
- Widget generation and embedding
- Analytics and reporting
- Admin and billing operations

BILLING INTEGRATION:
- Provider cost allocation and tracking per organization
- Usage-based billing with real-time metering
- Cost optimization recommendations
- Budget alerts and quota enforcement
- Multi-provider cost comparison and analysis

APIX INTEGRATION:
- Provider events: selected, switched, failed, optimized
- SDK events: connection, authentication, rate_limited
- Real-time provider performance metrics
- SDK usage analytics and error tracking

DEVELOPER EXPERIENCE:
- Comprehensive documentation with examples
- Interactive SDK playground and testing
- Code generation for common workflows
- Community examples and templates
- Developer onboarding and tutorials

NO DUPLICATION:
- Use existing APIX for real-time provider events
- Use existing billing system for cost tracking
- Use existing authentication for SDK security
- Use existing analytics for SDK usage metrics

BUILD PROVIDER MANAGEMENT and UNIVERSAL SDK as the orchestration layer for the entire platform.
```

## 👥 **PROMPT 5: HITL Workflows + Knowledge Base + Notification System**

```
You are adding HITL (Human-in-the-Loop) Workflows, Knowledge Base with RAG, and comprehensive Notification System to the existing SynapseAI platform.

BUILDS UPON: SynapseAI foundation + Agent Builder + Tool Manager + Hybrid System + Provider Management + Universal SDK

HITL WORKFLOW REQUIREMENTS:
- Approval workflows for agent actions, tool executions, and hybrid decisions
- Real-time notification and escalation system
- Role-based approval routing with smart assignment
- Approval history, audit trails, and compliance reporting
- Integration with all existing execution systems

KNOWLEDGE BASE + RAG REQUIREMENTS:
- Multi-format document processing (PDF, DOCX, TXT, URLs, databases)
- Vector search with semantic retrieval and ranking
- Knowledge integration with agent conversations and tool executions
- Document versioning, access control, and collaboration
- Knowledge analytics and usage optimization

NOTIFICATION SYSTEM REQUIREMENTS:
- Multi-channel delivery (email, SMS, webhook, push, Slack, Teams)
- Event-driven triggers from all platform modules
- Notification templates with customization and branding
- Delivery tracking, failure handling, and retry logic
- Notification preferences and subscription management

INTEGRATION WITH EXISTING SYSTEMS:
- Agents trigger HITL requests during execution via existing session system
- Tools require approval through existing workflow engine
- Knowledge base injects context into existing agent conversations
- All events feed into existing analytics and billing systems
- Uses existing APIX for real-time notification delivery

HITL EXECUTION FLOW:
Agent/Tool/Hybrid execution → Check approval rules → Create HITL request → Notify assignee via notification system → Human approval → Resume execution → Track in analytics → Bill for approval time

KNOWLEDGE INTEGRATION FLOW:
Agent conversation → Search knowledge base → Inject relevant documents → Continue reasoning with context → Track knowledge usage in analytics → Bill for search operations

ADVANCED HITL FEATURES:
- Collaborative decision making with team voting
- Expert consultation and advice seeking
- Escalation rules with timeout handling
- Approval delegation and substitute assignment
- Workflow templates and automation

KNOWLEDGE BASE FEATURES:
- Intelligent document chunking and embedding
- Multi-language support and translation
- Knowledge graph construction and navigation
- Document summarization and key extraction
- Source citation and provenance tracking

NOTIFICATION FEATURES:
- Smart notification batching and scheduling
- Urgency-based delivery prioritization
- Rich notifications with interactive actions
- Notification analytics and engagement tracking
- GDPR compliance and privacy controls

BILLING INTEGRATION:
- HITL approval time and complexity billing
- Knowledge base storage and search costs
- Notification delivery charges
- Usage quotas and plan-based restrictions

APIX EVENTS:
- hitl_request_created, hitl_approved, hitl_escalated
- knowledge_searched, document_indexed, citation_added
- notification_sent, notification_delivered, notification_failed

NO DUPLICATION:
- Use existing authentication for approval and knowledge access
- Use existing session system for HITL and knowledge context
- Use existing billing for all usage tracking
- Use existing APIX for real-time event streaming

BUILD HITL, KNOWLEDGE BASE, and NOTIFICATION systems as integrated enhancement layers for the platform.
```

## 🎨 **PROMPT 6: Widget Generator + Analytics Dashboard + Builder & Sandbox**

```
You are adding Widget Generator, comprehensive Analytics Dashboard, and Builder & Sandbox testing environment to the existing SynapseAI platform.

BUILDS UPON: Complete SynapseAI platform with all previous systems

WIDGET GENERATOR REQUIREMENTS:
- Convert agents, tools, and hybrids into embeddable widgets
- Customizable themes, branding, and responsive design
- Multiple embed formats (JavaScript, iframe, WordPress, Shopify plugins)
- Widget analytics with conversion tracking and user behavior
- White-label customization for enterprise clients

ANALYTICS DASHBOARD REQUIREMENTS:
- Real-time metrics from ALL platform modules and user interactions
- Agent performance, tool usage, hybrid workflow efficiency
- Provider cost analysis and optimization recommendations
- User engagement, session analytics, and conversion funnels
- Business intelligence with predictive analytics and forecasting

BUILDER & SANDBOX REQUIREMENTS:
- Secure testing environment for all platform capabilities
- Real-time debugging with step-by-step execution traces
- Performance monitoring and optimization recommendations
- Collaborative testing with sharing and version control
- Integration testing with external services and APIs

INTEGRATION WITH EXISTING SYSTEMS:
- Widgets execute using existing agent/tool/hybrid engines
- Analytics aggregates data from existing billing, session, and execution systems
- Sandbox tests real functionality using existing provider and knowledge systems
- All testing tracked in existing analytics and billing
- Uses existing APIX for real-time testing and widget events

WIDGET EXECUTION FLOW:
Widget embedded on external site → Creates session in existing system → Executes agent/tool/hybrid → Uses existing billing and quotas → Streams via existing APIX → Tracks in existing analytics

ANALYTICS DATA SOURCES:
- Agent executions, tool calls, hybrid workflows
- Provider costs, performance, and reliability metrics
- Session activity, user engagement, conversion rates
- HITL approval times, knowledge base usage
- Widget interactions, billing events, notification delivery

SANDBOX TESTING CAPABILITIES:
- Test agents with mock and real data scenarios
- Tool execution testing with external API validation
- Hybrid workflow debugging with step-by-step traces
- Load testing and performance benchmarking
- Security testing and vulnerability scanning

ADVANCED WIDGET FEATURES:
- Voice interface and accessibility support
- Multi-language localization and cultural adaptation
- Progressive web app capabilities
- Offline functionality with sync capabilities
- Custom CSS and JavaScript injection

ADVANCED ANALYTICS FEATURES:
- Machine learning insights and anomaly detection
- Custom dashboard creation and sharing
- Automated reporting and alert generation
- Data export and API access for external tools
- Compliance reporting and audit trails

SANDBOX COLLABORATION:
- Team testing environments with role-based access
- Test scenario sharing and template library
- Automated regression testing and CI/CD integration
- Test result comparison and performance tracking
- Documentation generation and knowledge sharing

BILLING INTEGRATION:
- Widget usage billing for embedded executions
- Analytics storage and processing costs
- Sandbox resource usage and testing time
- Plan-based feature restrictions and quotas

APIX EVENTS:
- widget_created, widget_embedded, widget_executed
- analytics_updated, dashboard_viewed, report_generated
- sandbox_created, test_executed, debug_session_started

NO DUPLICATION:
- Use existing execution engines for widget functionality
- Use existing data sources for analytics aggregation
- Use existing infrastructure for sandbox testing
- Use existing billing and authentication systems

BUILD WIDGET GENERATOR, ANALYTICS DASHBOARD, and BUILDER & SANDBOX as the final user-facing layers of the platform.
```

## 🛡️ **PROMPT 7: Admin Panel + Billing System + Platform Completion**

```
You are completing the SynapseAI platform by adding the comprehensive Admin Panel, advanced Billing System, and final platform integration. This creates the complete enterprise-ready SaaS platform.

BUILDS UPON: Complete SynapseAI platform with all previous systems

ADMIN PANEL REQUIREMENTS:
- Organization management with multi-level hierarchies
- User administration with advanced role and permission management
- System monitoring with health checks and performance metrics
- Global settings and configuration management
- Impersonation and debugging capabilities for support

ADVANCED BILLING SYSTEM REQUIREMENTS:
- Usage-based billing with real-time metering for all platform features
- Subscription management with plan upgrades and downgrades
- Invoice generation, payment processing, and dunning management
- Cost allocation and chargeback reporting per department/team
- Revenue recognition and financial reporting compliance

PLATFORM COMPLETION REQUIREMENTS:
- Complete integration testing across all 17 modules
- Performance optimization and scalability enhancements
- Security hardening and compliance certification readiness
- Documentation and knowledge base for administrators
- Enterprise features and white-label customization

INTEGRATION WITH ALL EXISTING SYSTEMS:
- Admin panel manages users, roles, and permissions for all modules
- Billing system tracks usage from agents, tools, hybrids, providers, knowledge, widgets, sandbox
- All administrative actions logged in existing audit system
- Uses existing APIX for real-time admin notifications and system events
- Integrates with existing analytics for business intelligence

ADVANCED ADMIN FEATURES:
- Bulk operations for user and organization management
- Advanced analytics with drill-down capabilities
- System health monitoring with predictive maintenance
- Custom branding and white-label configuration
- API rate limiting and abuse prevention

COMPREHENSIVE BILLING FEATURES:
- Granular usage tracking per feature and resource
- Dynamic pricing with volume discounts and enterprise contracts
- Multi-currency support and international tax compliance
- Usage forecasting and capacity planning
- Automated billing reconciliation and dispute resolution

ENTERPRISE FEATURES:
- SSO integration with SAML, OIDC, and Active Directory
- Advanced compliance with SOC 2, GDPR, HIPAA readiness
- Data residency and regional deployment options
- 24/7 monitoring and support integrations
- Disaster recovery and business continuity planning

SYSTEM INTEGRATION:
- All modules report health status to admin dashboard
- Billing system enforces quotas across all platform features
- Admin actions trigger notifications via existing notification system
- All usage data flows into existing analytics for business insights
- Complete audit trail for compliance and security

BILLING METERING POINTS:
- Agent executions (by complexity and duration)
- Tool calls (by type and external API costs)
- Hybrid workflow complexity and execution time
- Provider usage and AI model costs
- Knowledge base storage and search operations
- Widget executions and user interactions
- Sandbox testing time and resource usage
- HITL approval processing time
- Notification delivery across all channels

APIX EVENTS:
- admin_action_performed, system_health_changed, quota_exceeded
- billing_meter_updated, invoice_generated, payment_processed
- platform_alert, compliance_check, security_event

PLATFORM SCALABILITY:
- Horizontal scaling capabilities for all modules
- Database sharding and replication strategies
- CDN integration for global performance
- Load balancing and auto-scaling configuration
- Performance monitoring and optimization tools

NO DUPLICATION:
- Use existing authentication and session systems
- Use existing APIX for all real-time events
- Use existing analytics for all billing and admin metrics
- Use existing notification system for admin alerts

