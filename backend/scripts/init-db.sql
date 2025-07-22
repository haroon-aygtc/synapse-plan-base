-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS synapseai;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create indexes for better performance
-- These will be created by TypeORM migrations, but having them here as reference

-- Organizations table indexes
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_slug ON organizations(slug);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_plan ON organizations(plan);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_active ON organizations(is_active);

-- Users table indexes
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_email ON users(organization_id, email);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(is_active);

-- Agents table indexes
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_org_name ON agents(organization_id, name);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_user ON agents(user_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_active ON agents(is_active);

-- Tools table indexes
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_org_name ON tools(organization_id, name);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_user ON tools(user_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_active ON tools(is_active);

-- Workflows table indexes
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_org_name ON workflows(organization_id, name);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_user ON workflows(user_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_active ON workflows(is_active);

-- Execution tables indexes
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_org_created ON agent_executions(organization_id, created_at);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_agent_status ON agent_executions(agent_id, status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_executions_session ON agent_executions(session_id);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_executions_org_created ON tool_executions(organization_id, created_at);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_executions_tool_status ON tool_executions(tool_id, status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_executions_session ON tool_executions(session_id);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_org_created ON workflow_executions(organization_id, created_at);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_workflow_status ON workflow_executions(workflow_id, status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_session ON workflow_executions(session_id);

-- Full-text search indexes for better search performance
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_search ON agents USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_search ON tools USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_search ON workflows USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
