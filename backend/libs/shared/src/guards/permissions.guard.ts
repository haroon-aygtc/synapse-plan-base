import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@shared/interfaces';

// Define platform permissions
export enum Permission {
  // Agent permissions
  AGENT_CREATE = 'agent:create',
  AGENT_READ = 'agent:read',
  AGENT_UPDATE = 'agent:update',
  AGENT_DELETE = 'agent:delete',
  AGENT_EXECUTE = 'agent:execute',
  AGENT_TEST = 'agent:test',
  AGENT_BATCH_TEST = 'agent:batch_test',
  AGENT_VERSION = 'agent:version',
  AGENT_STATISTICS = 'agent:statistics',
  AGENT_STREAM = 'agent:stream',

  // Tool permissions
  TOOL_CREATE = 'tool:create',
  TOOL_READ = 'tool:read',
  TOOL_UPDATE = 'tool:update',
  TOOL_DELETE = 'tool:delete',
  TOOL_EXECUTE = 'tool:execute',
  TOOL_TEST = 'tool:test',
  TOOL_VALIDATE_SCHEMA = 'tool:validate_schema',
  TOOL_SEARCH = 'tool:search',
  TOOL_CATEGORIES = 'tool:categories',
  TOOL_ANALYTICS = 'tool:analytics',
  TOOL_EXECUTIONS = 'tool:executions',

  // Workflow permissions
  WORKFLOW_CREATE = 'workflow:create',
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_UPDATE = 'workflow:update',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_EXECUTE = 'workflow:execute',
  WORKFLOW_TEST = 'workflow:test',
  WORKFLOW_VALIDATE = 'workflow:validate',
  WORKFLOW_CLONE = 'workflow:clone',
  WORKFLOW_EXPORT = 'workflow:export',
  WORKFLOW_IMPORT = 'workflow:import',
  WORKFLOW_CANCEL = 'workflow:cancel',
  WORKFLOW_PAUSE = 'workflow:pause',
  WORKFLOW_RESUME = 'workflow:resume',
  WORKFLOW_APPROVE = 'workflow:approve',
  WORKFLOW_ANALYTICS = 'workflow:analytics',
  WORKFLOW_EXECUTIONS = 'workflow:executions',

  // Knowledge permissions
  KNOWLEDGE_CREATE = 'knowledge:create',
  KNOWLEDGE_READ = 'knowledge:read',
  KNOWLEDGE_UPDATE = 'knowledge:update',
  KNOWLEDGE_DELETE = 'knowledge:delete',
  KNOWLEDGE_SEARCH = 'knowledge:search',
  KNOWLEDGE_UPLOAD = 'knowledge:upload',
  KNOWLEDGE_BULK_UPLOAD = 'knowledge:bulk_upload',
  KNOWLEDGE_REPROCESS = 'knowledge:reprocess',
  KNOWLEDGE_STATUS = 'knowledge:status',
  KNOWLEDGE_SIMILAR = 'knowledge:similar',
  KNOWLEDGE_ANALYTICS = 'knowledge:analytics',
  KNOWLEDGE_COLLECTIONS = 'knowledge:collections',
  KNOWLEDGE_SEARCH_HISTORY = 'knowledge:search_history',

  // AI Provider permissions
  AI_PROVIDER_CREATE = 'ai_provider:create',
  AI_PROVIDER_READ = 'ai_provider:read',
  AI_PROVIDER_UPDATE = 'ai_provider:update',
  AI_PROVIDER_DELETE = 'ai_provider:delete',
  AI_PROVIDER_TEST = 'ai_provider:test',
  AI_PROVIDER_HEALTH = 'ai_provider:health',
  AI_PROVIDER_COSTS = 'ai_provider:costs',
  AI_PROVIDER_ROUTING = 'ai_provider:routing',
  AI_PROVIDER_USAGE_STATS = 'ai_provider:usage_stats',
  AI_PROVIDER_OPTIMIZATION = 'ai_provider:optimization',
  AI_PROVIDER_ROTATE_KEY = 'ai_provider:rotate_key',
  AI_PROVIDER_METRICS = 'ai_provider:metrics',
  AI_PROVIDER_BULK_CONFIGURE = 'ai_provider:bulk_configure',

  // Billing permissions
  BILLING_READ = 'billing:read',
  BILLING_USAGE = 'billing:usage',
  BILLING_STATS = 'billing:stats',
  BILLING_SUBSCRIPTION_CREATE = 'billing:subscription_create',
  BILLING_SUBSCRIPTION_UPDATE = 'billing:subscription_update',
  BILLING_SUBSCRIPTION_CANCEL = 'billing:subscription_cancel',
  BILLING_INVOICES = 'billing:invoices',
  BILLING_PLANS = 'billing:plans',

  // Notification permissions
  NOTIFICATION_CREATE = 'notification:create',
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATION_UPDATE = 'notification:update',
  NOTIFICATION_DELETE = 'notification:delete',
  NOTIFICATION_MARK_READ = 'notification:mark_read',
  NOTIFICATION_STATS = 'notification:stats',
  NOTIFICATION_TEMPLATE_CREATE = 'notification:template_create',
  NOTIFICATION_TEMPLATE_READ = 'notification:template_read',
  NOTIFICATION_TEMPLATE_UPDATE = 'notification:template_update',
  NOTIFICATION_PREFERENCE_CREATE = 'notification:preference_create',
  NOTIFICATION_PREFERENCE_READ = 'notification:preference_read',
  NOTIFICATION_PREFERENCE_UPDATE = 'notification:preference_update',
  NOTIFICATION_ADMIN_STATS = 'notification:admin_stats',
  NOTIFICATION_ADMIN_BATCHING = 'notification:admin_batching',
  NOTIFICATION_TEST = 'notification:test',

  // Session permissions
  SESSION_CREATE = 'session:create',
  SESSION_READ = 'session:read',
  SESSION_UPDATE = 'session:update',
  SESSION_DELETE = 'session:delete',
  SESSION_EXTEND = 'session:extend',
  SESSION_CONTEXT = 'session:context',
  SESSION_PROPAGATE = 'session:propagate',
  SESSION_RECOVER = 'session:recover',
  SESSION_ANALYTICS = 'session:analytics',
  SESSION_DESTROY_ALL = 'session:destroy_all',

  // Prompt Template permissions
  PROMPT_TEMPLATE_CREATE = 'prompt_template:create',
  PROMPT_TEMPLATE_READ = 'prompt_template:read',
  PROMPT_TEMPLATE_UPDATE = 'prompt_template:update',
  PROMPT_TEMPLATE_DELETE = 'prompt_template:delete',
  PROMPT_TEMPLATE_VERSION = 'prompt_template:version',
  PROMPT_TEMPLATE_RENDER = 'prompt_template:render',
  PROMPT_TEMPLATE_RATE = 'prompt_template:rate',

  // AI Assistant permissions
  AI_ASSISTANT_GENERATE_CONFIG = 'ai_assistant:generate_config',
  AI_ASSISTANT_ANALYZE_AGENT = 'ai_assistant:analyze_agent',
  AI_ASSISTANT_PROMPT_SUGGESTIONS = 'ai_assistant:prompt_suggestions',
  AI_ASSISTANT_OPTIMIZE_PROMPT = 'ai_assistant:optimize_prompt',
  AI_ASSISTANT_GENERATE_TESTS = 'ai_assistant:generate_tests',
  AI_ASSISTANT_EXPLAIN_AGENT = 'ai_assistant:explain_agent',
  AI_ASSISTANT_PERSONALITY_PROFILE = 'ai_assistant:personality_profile',

  // User management permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_INVITE = 'user:invite',
  USER_ACTIVATE = 'user:activate',
  USER_DEACTIVATE = 'user:deactivate',
  USER_VERIFY_EMAIL = 'user:verify_email',
  USER_RESET_PASSWORD = 'user:reset_password',
  USER_UPDATE_LAST_LOGIN = 'user:update_last_login',

  // Organization permissions
  ORG_READ = 'org:read',
  ORG_UPDATE = 'org:update',
  ORG_DELETE = 'org:delete',
  ORG_SETTINGS = 'org:settings',
  ORG_BILLING = 'org:billing',
  ORG_MEMBERS = 'org:members',
  ORG_INVITE_USERS = 'org:invite_users',
  ORG_REMOVE_USERS = 'org:remove_users',

  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_DASHBOARD = 'analytics:dashboard',
  ANALYTICS_DETAILED = 'analytics:detailed',
  ANALYTICS_PERFORMANCE = 'analytics:performance',
  ANALYTICS_COSTS = 'analytics:costs',
  ANALYTICS_ENGAGEMENT = 'analytics:engagement',
  ANALYTICS_TRENDS = 'analytics:trends',

  // Widget permissions
  WIDGET_CREATE = 'widget:create',
  WIDGET_READ = 'widget:read',
  WIDGET_UPDATE = 'widget:update',
  WIDGET_DELETE = 'widget:delete',
  WIDGET_DEPLOY = 'widget:deploy',
  WIDGET_CUSTOMIZE = 'widget:customize',
  WIDGET_ANALYTICS = 'widget:analytics',
  WIDGET_MARKETPLACE = 'widget:marketplace',

  // HITL (Human-in-the-Loop) permissions
  HITL_CREATE = 'hitl:create',
  HITL_READ = 'hitl:read',
  HITL_UPDATE = 'hitl:update',
  HITL_DELETE = 'hitl:delete',
  HITL_APPROVE = 'hitl:approve',
  HITL_REJECT = 'hitl:reject',
  HITL_ESCALATE = 'hitl:escalate',
  HITL_DELEGATE = 'hitl:delegate',
  HITL_ANALYTICS = 'hitl:analytics',

  // Testing Sandbox permissions
  SANDBOX_CREATE = 'sandbox:create',
  SANDBOX_READ = 'sandbox:read',
  SANDBOX_UPDATE = 'sandbox:update',
  SANDBOX_DELETE = 'sandbox:delete',
  SANDBOX_EXECUTE = 'sandbox:execute',
  SANDBOX_DEBUG = 'sandbox:debug',
  SANDBOX_PERFORMANCE = 'sandbox:performance',
  SANDBOX_SHARE = 'sandbox:share',

  // WebSocket/APIX permissions
  WEBSOCKET_CONNECT = 'websocket:connect',
  WEBSOCKET_SUBSCRIBE = 'websocket:subscribe',
  WEBSOCKET_PUBLISH = 'websocket:publish',
  WEBSOCKET_ADMIN = 'websocket:admin',

  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MONITOR = 'system:monitor',
  SYSTEM_HEALTH = 'system:health',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_RESTORE = 'system:restore',
  SYSTEM_MAINTENANCE = 'system:maintenance',
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userPermissions = this.getUserPermissions(user.role, user.permissions);
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }

  private getUserPermissions(role: UserRole, customPermissions?: string[]): string[] {
    const rolePermissions = {
      [UserRole.VIEWER]: [
        // Agent permissions
        Permission.AGENT_READ,
        Permission.AGENT_EXECUTE,
        Permission.AGENT_STREAM,

        // Tool permissions
        Permission.TOOL_READ,
        Permission.TOOL_EXECUTE,
        Permission.TOOL_SEARCH,
        Permission.TOOL_CATEGORIES,

        // Workflow permissions
        Permission.WORKFLOW_READ,
        Permission.WORKFLOW_EXECUTE,
        Permission.WORKFLOW_EXPORT,

        // Knowledge permissions
        Permission.KNOWLEDGE_READ,
        Permission.KNOWLEDGE_SEARCH,
        Permission.KNOWLEDGE_STATUS,
        Permission.KNOWLEDGE_SIMILAR,
        Permission.KNOWLEDGE_SEARCH_HISTORY,

        // AI Provider permissions
        Permission.AI_PROVIDER_READ,

        // Billing permissions
        Permission.BILLING_READ,
        Permission.BILLING_USAGE,
        Permission.BILLING_INVOICES,
        Permission.BILLING_PLANS,

        // Notification permissions
        Permission.NOTIFICATION_READ,
        Permission.NOTIFICATION_MARK_READ,
        Permission.NOTIFICATION_PREFERENCE_READ,

        // Session permissions
        Permission.SESSION_READ,
        Permission.SESSION_CONTEXT,

        // Prompt Template permissions
        Permission.PROMPT_TEMPLATE_READ,
        Permission.PROMPT_TEMPLATE_RENDER,
        Permission.PROMPT_TEMPLATE_RATE,

        // AI Assistant permissions
        Permission.AI_ASSISTANT_EXPLAIN_AGENT,

        // Analytics permissions
        Permission.ANALYTICS_READ,
        Permission.ANALYTICS_DASHBOARD,

        // WebSocket permissions
        Permission.WEBSOCKET_CONNECT,
        Permission.WEBSOCKET_SUBSCRIBE,
      ],
      [UserRole.DEVELOPER]: [
        // All viewer permissions
        ...this.getUserPermissions(UserRole.VIEWER),

        // Agent permissions
        Permission.AGENT_CREATE,
        Permission.AGENT_UPDATE,
        Permission.AGENT_TEST,
        Permission.AGENT_BATCH_TEST,
        Permission.AGENT_VERSION,
        Permission.AGENT_STATISTICS,

        // Tool permissions
        Permission.TOOL_CREATE,
        Permission.TOOL_UPDATE,
        Permission.TOOL_TEST,
        Permission.TOOL_VALIDATE_SCHEMA,
        Permission.TOOL_ANALYTICS,
        Permission.TOOL_EXECUTIONS,

        // Workflow permissions
        Permission.WORKFLOW_CREATE,
        Permission.WORKFLOW_UPDATE,
        Permission.WORKFLOW_TEST,
        Permission.WORKFLOW_VALIDATE,
        Permission.WORKFLOW_CLONE,
        Permission.WORKFLOW_IMPORT,
        Permission.WORKFLOW_CANCEL,
        Permission.WORKFLOW_PAUSE,
        Permission.WORKFLOW_RESUME,
        Permission.WORKFLOW_ANALYTICS,
        Permission.WORKFLOW_EXECUTIONS,

        // Knowledge permissions
        Permission.KNOWLEDGE_CREATE,
        Permission.KNOWLEDGE_UPDATE,
        Permission.KNOWLEDGE_UPLOAD,
        Permission.KNOWLEDGE_BULK_UPLOAD,
        Permission.KNOWLEDGE_REPROCESS,
        Permission.KNOWLEDGE_ANALYTICS,
        Permission.KNOWLEDGE_COLLECTIONS,

        // AI Provider permissions
        Permission.AI_PROVIDER_TEST,
        Permission.AI_PROVIDER_HEALTH,
        Permission.AI_PROVIDER_COSTS,
        Permission.AI_PROVIDER_USAGE_STATS,
        Permission.AI_PROVIDER_METRICS,

        // Notification permissions
        Permission.NOTIFICATION_CREATE,
        Permission.NOTIFICATION_UPDATE,
        Permission.NOTIFICATION_STATS,
        Permission.NOTIFICATION_PREFERENCE_CREATE,
        Permission.NOTIFICATION_PREFERENCE_UPDATE,
        Permission.NOTIFICATION_TEST,

        // Session permissions
        Permission.SESSION_CREATE,
        Permission.SESSION_UPDATE,
        Permission.SESSION_EXTEND,
        Permission.SESSION_PROPAGATE,
        Permission.SESSION_RECOVER,

        // Prompt Template permissions
        Permission.PROMPT_TEMPLATE_CREATE,
        Permission.PROMPT_TEMPLATE_UPDATE,
        Permission.PROMPT_TEMPLATE_VERSION,

        // AI Assistant permissions
        Permission.AI_ASSISTANT_GENERATE_CONFIG,
        Permission.AI_ASSISTANT_ANALYZE_AGENT,
        Permission.AI_ASSISTANT_PROMPT_SUGGESTIONS,
        Permission.AI_ASSISTANT_OPTIMIZE_PROMPT,
        Permission.AI_ASSISTANT_GENERATE_TESTS,
        Permission.AI_ASSISTANT_PERSONALITY_PROFILE,

        // Analytics permissions
        Permission.ANALYTICS_DETAILED,
        Permission.ANALYTICS_PERFORMANCE,
        Permission.ANALYTICS_TRENDS,

        // Widget permissions
        Permission.WIDGET_CREATE,
        Permission.WIDGET_READ,
        Permission.WIDGET_UPDATE,
        Permission.WIDGET_CUSTOMIZE,
        Permission.WIDGET_ANALYTICS,
        Permission.WIDGET_MARKETPLACE,

        // HITL permissions
        Permission.HITL_READ,
        Permission.HITL_APPROVE,
        Permission.HITL_REJECT,

        // Sandbox permissions
        Permission.SANDBOX_CREATE,
        Permission.SANDBOX_READ,
        Permission.SANDBOX_UPDATE,
        Permission.SANDBOX_EXECUTE,
        Permission.SANDBOX_DEBUG,
        Permission.SANDBOX_PERFORMANCE,
        Permission.SANDBOX_SHARE,

        // WebSocket permissions
        Permission.WEBSOCKET_PUBLISH,
      ],
      [UserRole.ORG_ADMIN]: [
        // All developer permissions
        ...this.getUserPermissions(UserRole.DEVELOPER),

        // Agent permissions
        Permission.AGENT_DELETE,

        // Tool permissions
        Permission.TOOL_DELETE,

        // Workflow permissions
        Permission.WORKFLOW_DELETE,
        Permission.WORKFLOW_APPROVE,

        // Knowledge permissions
        Permission.KNOWLEDGE_DELETE,

        // AI Provider permissions
        Permission.AI_PROVIDER_CREATE,
        Permission.AI_PROVIDER_UPDATE,
        Permission.AI_PROVIDER_DELETE,
        Permission.AI_PROVIDER_ROUTING,
        Permission.AI_PROVIDER_OPTIMIZATION,
        Permission.AI_PROVIDER_ROTATE_KEY,
        Permission.AI_PROVIDER_BULK_CONFIGURE,

        // Billing permissions
        Permission.BILLING_STATS,
        Permission.BILLING_SUBSCRIPTION_CREATE,
        Permission.BILLING_SUBSCRIPTION_UPDATE,
        Permission.BILLING_SUBSCRIPTION_CANCEL,

        // Notification permissions
        Permission.NOTIFICATION_DELETE,
        Permission.NOTIFICATION_TEMPLATE_CREATE,
        Permission.NOTIFICATION_TEMPLATE_READ,
        Permission.NOTIFICATION_TEMPLATE_UPDATE,
        Permission.NOTIFICATION_ADMIN_STATS,
        Permission.NOTIFICATION_ADMIN_BATCHING,

        // Session permissions
        Permission.SESSION_DELETE,
        Permission.SESSION_ANALYTICS,
        Permission.SESSION_DESTROY_ALL,

        // Prompt Template permissions
        Permission.PROMPT_TEMPLATE_DELETE,

        // User management permissions
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_INVITE,
        Permission.USER_ACTIVATE,
        Permission.USER_DEACTIVATE,
        Permission.USER_VERIFY_EMAIL,
        Permission.USER_RESET_PASSWORD,

        // Organization permissions
        Permission.ORG_READ,
        Permission.ORG_UPDATE,
        Permission.ORG_SETTINGS,
        Permission.ORG_BILLING,
        Permission.ORG_MEMBERS,
        Permission.ORG_INVITE_USERS,
        Permission.ORG_REMOVE_USERS,

        // Analytics permissions
        Permission.ANALYTICS_EXPORT,
        Permission.ANALYTICS_COSTS,
        Permission.ANALYTICS_ENGAGEMENT,

        // Widget permissions
        Permission.WIDGET_DELETE,
        Permission.WIDGET_DEPLOY,

        // HITL permissions
        Permission.HITL_CREATE,
        Permission.HITL_UPDATE,
        Permission.HITL_DELETE,
        Permission.HITL_ESCALATE,
        Permission.HITL_DELEGATE,
        Permission.HITL_ANALYTICS,

        // Sandbox permissions
        Permission.SANDBOX_DELETE,

        // WebSocket permissions
        Permission.WEBSOCKET_ADMIN,
      ],
      [UserRole.SUPER_ADMIN]: [
        // All org admin permissions
        ...this.getUserPermissions(UserRole.ORG_ADMIN),

        // Organization permissions
        Permission.ORG_DELETE,

        // System permissions
        Permission.SYSTEM_ADMIN,
        Permission.SYSTEM_MONITOR,
        Permission.SYSTEM_HEALTH,
        Permission.SYSTEM_LOGS,
        Permission.SYSTEM_BACKUP,
        Permission.SYSTEM_RESTORE,
        Permission.SYSTEM_MAINTENANCE,
      ],
    };

    const basePermissions = rolePermissions[role] || [];

    // Merge with custom permissions if provided
    if (customPermissions && customPermissions.length > 0) {
      return [...new Set([...basePermissions, ...customPermissions])];
    }

    return basePermissions;
  }
}
