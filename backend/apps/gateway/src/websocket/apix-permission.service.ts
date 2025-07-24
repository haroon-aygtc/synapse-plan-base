import { Injectable } from '@nestjs/common';
import {
  APXPermissionLevel,
  APXSecurityLevel,
  APXMessageType,
} from '@shared/enums';

@Injectable()
export class APXPermissionService {
  private readonly rateLimits = {
    SUPER_ADMIN: { messages: 1000, executions: 500, streams: 50 },
    ORG_ADMIN: { messages: 500, executions: 200, streams: 20 },
    DEVELOPER: { messages: 200, executions: 100, streams: 10 },
    VIEWER: { messages: 50, executions: 10, streams: 2 },
  };

  private readonly rolePermissions = {
    SUPER_ADMIN: [
      APXPermissionLevel.READ,
      APXPermissionLevel.WRITE,
      APXPermissionLevel.ADMIN,
      APXPermissionLevel.EXECUTE,
    ],
    ORG_ADMIN: [
      APXPermissionLevel.READ,
      APXPermissionLevel.WRITE,
      APXPermissionLevel.ADMIN,
      APXPermissionLevel.EXECUTE,
    ],
    DEVELOPER: [
      APXPermissionLevel.READ,
      APXPermissionLevel.WRITE,
      APXPermissionLevel.EXECUTE,
    ],
    VIEWER: [APXPermissionLevel.READ],
  };

  private readonly messagePermissions = {
    // Lifecycle Events
    [APXMessageType.CONNECTION_ACK]: APXPermissionLevel.READ,
    [APXMessageType.CONNECTION_HEARTBEAT]: APXPermissionLevel.READ,
    [APXMessageType.SESSION_CREATED]: APXPermissionLevel.ADMIN,
    [APXMessageType.SESSION_ENDED]: APXPermissionLevel.ADMIN,

    // Agent Execution
    [APXMessageType.AGENT_EXECUTION_STARTED]: APXPermissionLevel.EXECUTE,
    [APXMessageType.AGENT_TEXT_CHUNK]: APXPermissionLevel.READ,
    [APXMessageType.AGENT_TOOL_CALL]: APXPermissionLevel.READ,
    [APXMessageType.AGENT_MEMORY_USED]: APXPermissionLevel.READ,
    [APXMessageType.AGENT_ERROR]: APXPermissionLevel.READ,
    [APXMessageType.AGENT_EXECUTION_COMPLETE]: APXPermissionLevel.READ,

    // Tool Invocation
    [APXMessageType.TOOL_CALL_START]: APXPermissionLevel.EXECUTE,
    [APXMessageType.TOOL_CALL_RESULT]: APXPermissionLevel.READ,
    [APXMessageType.TOOL_CALL_ERROR]: APXPermissionLevel.READ,

    // Knowledge Base
    [APXMessageType.KB_SEARCH_PERFORMED]: APXPermissionLevel.READ,
    [APXMessageType.KB_CHUNK_INJECTED]: APXPermissionLevel.READ,

    // HITL
    [APXMessageType.HITL_REQUEST_CREATED]: APXPermissionLevel.WRITE,
    [APXMessageType.HITL_RESOLUTION_PENDING]: APXPermissionLevel.READ,
    [APXMessageType.HITL_RESOLVED]: APXPermissionLevel.WRITE,
    [APXMessageType.HITL_EXPIRED]: APXPermissionLevel.READ,

    // Widget Events
    [APXMessageType.WIDGET_LOADED]: APXPermissionLevel.READ,
    [APXMessageType.WIDGET_OPENED]: APXPermissionLevel.READ,
    [APXMessageType.WIDGET_QUERY_SUBMITTED]: APXPermissionLevel.WRITE,
    [APXMessageType.WIDGET_CONVERTED]: APXPermissionLevel.READ,

    // Control Events
    [APXMessageType.STREAM_PAUSE]: APXPermissionLevel.WRITE,
    [APXMessageType.STREAM_RESUME]: APXPermissionLevel.WRITE,
    [APXMessageType.TOKEN_LIMIT_REACHED]: APXPermissionLevel.READ,
    [APXMessageType.PROVIDER_FALLBACK]: APXPermissionLevel.READ,

    // Workflow Events
    [APXMessageType.WORKFLOW_EXECUTION_STARTED]: APXPermissionLevel.EXECUTE,

    // Error Events
    [APXMessageType.VALIDATION_ERROR]: APXPermissionLevel.READ,
    [APXMessageType.PERMISSION_DENIED]: APXPermissionLevel.READ,
    [APXMessageType.RATE_LIMIT_EXCEEDED]: APXPermissionLevel.READ,
  };

  getRateLimit(
    role: string,
    limitType: 'messages' | 'executions' | 'streams',
  ): number {
    return (
      this.rateLimits[role]?.[limitType] || this.rateLimits.VIEWER[limitType]
    );
  }

  getSecurityLevel(role: string): APXSecurityLevel {
    switch (role) {
      case 'SUPER_ADMIN':
        return APXSecurityLevel.PRIVATE;
      case 'ORG_ADMIN':
        return APXSecurityLevel.SENSITIVE;
      case 'DEVELOPER':
        return APXSecurityLevel.ENCRYPTED;
      case 'VIEWER':
        return APXSecurityLevel.AUTHENTICATED;
      default:
        return APXSecurityLevel.PUBLIC;
    }
  }

  getPermissions(role: string): APXPermissionLevel[] {
    return this.rolePermissions[role] || this.rolePermissions.VIEWER;
  }

  getRequiredPermission(messageType: APXMessageType): APXPermissionLevel {
    return this.messagePermissions[messageType] || APXPermissionLevel.READ;
  }

  hasPermission(
    userRole: string,
    requiredPermission: APXPermissionLevel,
  ): boolean {
    const userPermissions = this.getPermissions(userRole);
    return userPermissions.includes(requiredPermission);
  }

  canSendMessage(userRole: string, messageType: APXMessageType): boolean {
    const requiredPermission = this.getRequiredPermission(messageType);
    return this.hasPermission(userRole, requiredPermission);
  }

  validateTenantAccess(
    userOrgId: string,
    targetOrgId: string,
    userRole: string,
  ): boolean {
    // Super admins can access any tenant
    if (userRole === 'SUPER_ADMIN') {
      return true;
    }

    // All other users can only access their own organization
    return userOrgId === targetOrgId;
  }

  validateSessionOwnership(
    sessionUserId: string,
    requestUserId: string,
    userRole: string,
  ): boolean {
    // Admins can access any session in their organization
    if (['SUPER_ADMIN', 'ORG_ADMIN'].includes(userRole)) {
      return true;
    }

    // Regular users can only access their own sessions
    return sessionUserId === requestUserId;
  }

  getMaxPayloadSize(role: string): number {
    const limits = {
      SUPER_ADMIN: 10 * 1024 * 1024, // 10MB
      ORG_ADMIN: 5 * 1024 * 1024, // 5MB
      DEVELOPER: 2 * 1024 * 1024, // 2MB
      VIEWER: 512 * 1024, // 512KB
    };
    return limits[role] || limits.VIEWER;
  }

  getSessionTimeout(role: string): number {
    const timeouts = {
      SUPER_ADMIN: 24 * 60 * 60 * 1000, // 24 hours
      ORG_ADMIN: 12 * 60 * 60 * 1000, // 12 hours
      DEVELOPER: 8 * 60 * 60 * 1000, // 8 hours
      VIEWER: 2 * 60 * 60 * 1000, // 2 hours
    };
    return timeouts[role] || timeouts.VIEWER;
  }
}
