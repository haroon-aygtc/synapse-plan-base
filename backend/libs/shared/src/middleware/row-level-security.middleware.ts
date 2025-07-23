import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/interfaces';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId: string;
    role: UserRole;
    isActive: boolean;
  };
  rowLevelFilters?: {
    organizationId: string;
    userId?: string;
    userRole: UserRole;
    canAccessAllInOrg: boolean;
  };
}

@Injectable()
export class RowLevelSecurityMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (req.user) {
      const { id: userId, organizationId, role } = req.user;

      // Set up row-level security filters
      req.rowLevelFilters = {
        organizationId,
        userId,
        userRole: role,
        canAccessAllInOrg: this.canAccessAllInOrganization(role),
      };
    }

    next();
  }

  private canAccessAllInOrganization(role: UserRole): boolean {
    return [UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN].includes(role);
  }
}
