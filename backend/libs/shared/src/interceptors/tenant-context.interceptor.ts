import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId: string;
    role: string;
  };
  organizationId?: string;
  tenantContext?: {
    organizationId: string;
    userId: string;
    userRole: string;
  };
}

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Check if route requires tenant context
    const requiresTenantContext = this.reflector.getAllAndOverride<boolean>(
      'requiresTenantContext',
      [context.getHandler(), context.getClass()]
    );

    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Skip tenant context for public routes
    if (isPublic) {
      return next.handle();
    }

    // Extract tenant context from authenticated user
    if (request.user) {
      const { id: userId, organizationId, role: userRole } = request.user;

      if (!organizationId && requiresTenantContext !== false) {
        throw new BadRequestException(
          'User must belong to an organization to access this resource'
        );
      }

      // Set tenant context
      request.tenantContext = {
        organizationId,
        userId,
        userRole,
      };

      // Also set organizationId directly on request for backward compatibility
      request.organizationId = organizationId;
    } else if (requiresTenantContext !== false) {
      // If tenant context is required but user is not authenticated
      throw new BadRequestException('Authentication required for tenant context');
    }

    return next.handle();
  }
}

// Decorator to mark routes that require tenant context
export const RequiresTenantContext = (required: boolean = true) => {
  return (target: any, _propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('requiresTenantContext', required, descriptor.value);
    } else {
      Reflect.defineMetadata('requiresTenantContext', required, target);
    }
  };
};

// Decorator to mark routes as public (no tenant context required)
export const Public = () => {
  return (target: any, _propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('isPublic', true, descriptor.value);
    } else {
      Reflect.defineMetadata('isPublic', true, target);
    }
  };
};
