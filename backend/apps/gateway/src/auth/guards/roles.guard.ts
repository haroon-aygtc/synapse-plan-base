import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@shared/interfaces';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    // Additional permission checks based on role hierarchy
    if (!this.checkRoleHierarchy(user.role, requiredRoles)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private checkRoleHierarchy(
    userRole: UserRole,
    requiredRoles: UserRole[],
  ): boolean {
    const roleHierarchy = {
      [UserRole.SUPER_ADMIN]: 4,
      [UserRole.ORG_ADMIN]: 3,
      [UserRole.DEVELOPER]: 2,
      [UserRole.VIEWER]: 1,
    };

    const userRoleLevel = roleHierarchy[userRole];
    const minRequiredLevel = Math.min(
      ...requiredRoles.map((role) => roleHierarchy[role]),
    );

    return userRoleLevel >= minRequiredLevel;
  }
}
