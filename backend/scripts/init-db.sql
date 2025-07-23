-- Create database if it doesn't exist
-- Note: CREATE DATABASE IF NOT EXISTS is MySQL syntax, PostgreSQL uses different approach
-- This will be handled by the application or deployment scripts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for better performance
-- These will be created by TypeORM migrations, but having them here as reference

-- Multi-tenant indexes for performance
-- Organizations table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_plan ON organizations(plan);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_active ON organizations(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_updated_at ON organizations(updated_at);

-- Users table indexes (multi-tenant optimized)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_email ON users(organization_id, email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_role ON users(organization_id, role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- Agents table indexes (tenant-scoped)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_org_name ON agents(organization_id, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_user ON agents(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_active ON agents(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_org_active ON agents(organization_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_created_at ON agents(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_updated_at ON agents(updated_at);

-- Tools table indexes (tenant-scoped)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_org_name ON tools(organization_id, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_user ON tools(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_active ON tools(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_org_active ON tools(organization_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_type ON tools(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_created_at ON tools(created_at);

-- Workflows table indexes (tenant-scoped)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_org_name ON workflows(organization_id, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_active ON workflows(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_org_active ON workflows(organization_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);

-- Execution tables indexes (optimized for analytics and monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_org_created ON agent_executions(organization_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_agent_status ON agent_executions(agent_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_session ON agent_executions(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_status_created ON agent_executions(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_user_created ON agent_executions(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_executions_org_created ON tool_executions(organization_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_executions_tool_status ON tool_executions(tool_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_executions_session ON tool_executions(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_executions_status_created ON tool_executions(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_executions_user_created ON tool_executions(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_org_created ON workflow_executions(organization_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_workflow_status ON workflow_executions(workflow_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_session ON workflow_executions(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_status_created ON workflow_executions(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_user_created ON workflow_executions(user_id, created_at DESC);

-- Full-text search indexes for better search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_search ON agents USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_search ON tools USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_search ON workflows USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Session and caching indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_org_id ON sessions(organization_id);

-- Notification indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_org_created ON notifications(organization_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read_status ON notifications(is_read, created_at DESC);

-- Billing and usage indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_records_org_date ON usage_records(organization_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_records_resource_date ON usage_records(resource_type, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_records_org_period ON billing_records(organization_id, billing_period DESC);

-- Performance monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_service_timestamp ON performance_metrics(service_name, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_service_timestamp ON error_logs(service_name, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_timestamp ON audit_logs(organization_id, timestamp DESC);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_org_user_active ON agents(organization_id, user_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_org_user_active ON tools(organization_id, user_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_org_user_active ON workflows(organization_id, user_id, is_active);

-- Partial indexes for active records only (better performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_agents_org ON agents(organization_id, created_at DESC) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_tools_org ON tools(organization_id, created_at DESC) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_workflows_org ON workflows(organization_id, created_at DESC) WHERE is_active = true;

-- Row Level Security (RLS) setup for multi-tenancy
-- Enable RLS on all tenant-scoped tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (examples - actual policies will be created by migrations)
-- CREATE POLICY tenant_isolation_users ON users FOR ALL TO authenticated_user USING (organization_id = current_setting('app.current_organization_id')::uuid);
-- CREATE POLICY tenant_isolation_agents ON agents FOR ALL TO authenticated_user USING (organization_id = current_setting('app.current_organization_id')::uuid);
-- CREATE POLICY tenant_isolation_tools ON tools FOR ALL TO authenticated_user USING (organization_id = current_setting('app.current_organization_id')::uuid);
-- CREATE POLICY tenant_isolation_workflows ON workflows FOR ALL TO authenticated_user USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Database maintenance and optimization
-- Auto-vacuum settings for high-traffic tables
ALTER TABLE agent_executions SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE tool_executions SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE workflow_executions SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE sessions SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE performance_metrics SET (autovacuum_vacuum_scale_factor = 0.05);

-- Statistics collection for query optimization
ALTER TABLE agents ALTER COLUMN organization_id SET STATISTICS 1000;
ALTER TABLE tools ALTER COLUMN organization_id SET STATISTICS 1000;
ALTER TABLE workflows ALTER COLUMN organization_id SET STATISTICS 1000;
ALTER TABLE agent_executions ALTER COLUMN organization_id SET STATISTICS 1000;
ALTER TABLE tool_executions ALTER COLUMN organization_id SET STATISTICS 1000;
ALTER TABLE workflow_executions ALTER COLUMN organization_id SET STATISTICS 1000;
