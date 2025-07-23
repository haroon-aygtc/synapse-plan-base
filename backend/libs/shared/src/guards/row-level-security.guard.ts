import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@shared/interfaces';

@Injectable()
export class RowLevelSecurityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if resource ownership is required
    const requiresResourceOwnership = this.reflector.getAllAndOverride<boolean>(
      'requiresResourceOwnership',
      [context.getHandler(), context.getClass()],
    );

    // Check if cross-organization access is allowed
    const allowCrossOrganization = this.reflector.getAllAndOverride<boolean>(
      'allowCrossOrganization',
      [context.getHandler(), context.getClass()],
    );

    // Super admins can access cross-organization resources if explicitly allowed
    if (allowCrossOrganization && user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Set up row-level security context
    const rowLevelContext = {
      organizationId: user.organizationId,
      userId: user.id,
      userRole: user.role,
      requiresResourceOwnership: requiresResourceOwnership || false,
      canAccessOtherUsers: this.canAccessOtherUsers(user.role),
    };

    // Attach to request for use in services
    request.rowLevelContext = rowLevelContext;

    return true;
  }

  private canAccessOtherUsers(role: UserRole): boolean {
    return [UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN].includes(role);
  }
}
