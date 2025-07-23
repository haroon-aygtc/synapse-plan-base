import { Injectable } from '@nestjs/common';
import { APXPermissionLevel, APXSecurityLevel, APXMessageType } from '@shared/enums';

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
    [APXMessageType.AGENT_EXECUTION_STARTED]: APXPermissionLevel.EXECUTE,
    [APXMessageType.TOOL_CALL_START]: APXPermissionLevel.EXECUTE,
    [APXMessageType.HITL_REQUEST_CREATED]: APXPermissionLevel.WRITE,
    [APXMessageType.STREAM_PAUSE]: APXPermissionLevel.WRITE,
    [APXMessageType.STREAM_RESUME]: APXPermissionLevel.WRITE,
    // Add more as needed
  };

  getRateLimit(role: string, limitType: 'messages' | 'executions' | 'streams'): number {
    return this.rateLimits[role]?.[limitType] || this.rateLimits.VIEWER[limitType];
  }

  getSecurityLevel(role: string): APXSecurityLevel {
    if (['SUPER_ADMIN', 'ORG_ADMIN'].includes(role)) {
      return APXSecurityLevel.PRIVATE;
    }
    return APXSecurityLevel.AUTHENTICATED;
  }

  getPermissions(role: string): APXPermissionLevel[] {
    return this.rolePermissions[role] || this.rolePermissions.VIEWER;
  }

  getRequiredPermission(messageType: APXMessageType): APXPermissionLevel {
    return this.messagePermissions[messageType] || APXPermissionLevel.READ;
  }

  hasPermission(userRole: string, requiredPermission: APXPermissionLevel): boolean {
    const userPermissions = this.getPermissions(userRole);
    return userPermissions.includes(requiredPermission);
  }

  canSendMessage(userRole: string, messageType: APXMessageType): boolean {
    const requiredPermission = this.getRequiredPermission(messageType);
    return this.hasPermission(userRole, requiredPermission);
  }
}