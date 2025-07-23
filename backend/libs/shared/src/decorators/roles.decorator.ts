import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@shared/interfaces';

// Decorator to set required roles for a route
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

// Decorator to set required permissions for a route
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// Decorator to mark routes as public (no authentication required)
export const Public = () => SetMetadata('isPublic', true);

// Decorator to require organization admin or higher
export const RequireOrgAdmin = () =>
  Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN);

// Decorator to require super admin
export const RequireSuperAdmin = () => Roles(UserRole.SUPER_ADMIN);

// Decorator to allow developers and above
export const RequireDeveloper = () =>
  Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN);

// Decorator to allow viewers and above (all authenticated users)
export const RequireViewer = () =>
  Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  );

// Decorator to require tenant context (organization scoping)
export const RequireTenantContext = (required: boolean = true) =>
  SetMetadata('requiresTenantContext', required);

// Decorator to require resource ownership
export const RequireResourceOwnership = () =>
  SetMetadata('requiresResourceOwnership', true);

// Decorator to allow cross-organization access (super admin only)
export const AllowCrossOrganization = () =>
  SetMetadata('allowCrossOrganization', true);
