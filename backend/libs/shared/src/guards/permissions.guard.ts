import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
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

  // Tool permissions
  TOOL_CREATE = 'tool:create',
  TOOL_READ = 'tool:read',
  TOOL_UPDATE = 'tool:update',
  TOOL_DELETE = 'tool:delete',
  TOOL_EXECUTE = 'tool:execute',

  // Workflow permissions
  WORKFLOW_CREATE = 'workflow:create',
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_UPDATE = 'workflow:update',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_EXECUTE = 'workflow:execute',
  WORKFLOW_APPROVE = 'workflow:approve',

  // Knowledge permissions
  KNOWLEDGE_CREATE = 'knowledge:create',
  KNOWLEDGE_READ = 'knowledge:read',
  KNOWLEDGE_UPDATE = 'knowledge:update',
  KNOWLEDGE_DELETE = 'knowledge:delete',
  KNOWLEDGE_SEARCH = 'knowledge:search',

  // User management permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_INVITE = 'user:invite',

  // Organization permissions
  ORG_READ = 'org:read',
  ORG_UPDATE = 'org:update',
  ORG_DELETE = 'org:delete',
  ORG_SETTINGS = 'org:settings',
  ORG_BILLING = 'org:billing',

  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',

  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MONITOR = 'system:monitor',
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userPermissions = this.getUserPermissions(user.role);
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }

  private getUserPermissions(role: UserRole): string[] {
    const rolePermissions = {
      [UserRole.VIEWER]: [
        Permission.AGENT_READ,
        Permission.TOOL_READ,
        Permission.WORKFLOW_READ,
        Permission.KNOWLEDGE_READ,
        Permission.KNOWLEDGE_SEARCH,
        Permission.ANALYTICS_READ,
      ],
      [UserRole.DEVELOPER]: [
        // All viewer permissions
        ...this.getUserPermissions(UserRole.VIEWER),
        // Plus developer permissions
        Permission.AGENT_CREATE,
        Permission.AGENT_UPDATE,
        Permission.AGENT_EXECUTE,
        Permission.TOOL_CREATE,
        Permission.TOOL_UPDATE,
        Permission.TOOL_EXECUTE,
        Permission.WORKFLOW_CREATE,
        Permission.WORKFLOW_UPDATE,
        Permission.WORKFLOW_EXECUTE,
        Permission.KNOWLEDGE_CREATE,
        Permission.KNOWLEDGE_UPDATE,
      ],
      [UserRole.ORG_ADMIN]: [
        // All developer permissions
        ...this.getUserPermissions(UserRole.DEVELOPER),
        // Plus admin permissions
        Permission.AGENT_DELETE,
        Permission.TOOL_DELETE,
        Permission.WORKFLOW_DELETE,
        Permission.WORKFLOW_APPROVE,
        Permission.KNOWLEDGE_DELETE,
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_INVITE,
        Permission.ORG_READ,
        Permission.ORG_UPDATE,
        Permission.ORG_SETTINGS,
        Permission.ORG_BILLING,
        Permission.ANALYTICS_EXPORT,
      ],
      [UserRole.SUPER_ADMIN]: [
        // All org admin permissions
        ...this.getUserPermissions(UserRole.ORG_ADMIN),
        // Plus super admin permissions
        Permission.ORG_DELETE,
        Permission.SYSTEM_ADMIN,
        Permission.SYSTEM_MONITOR,
      ],
    };

    return rolePermissions[role] || [];
  }
}
