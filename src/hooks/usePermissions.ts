import { useAuth } from './useAuth';
import { PERMISSIONS, ROLE_PERMISSIONS, Permission } from '@/types/global';

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;

    // Check if user has custom permissions
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions.includes(permission);
    }

    // Fall back to role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    return rolePermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  };

  const getUserPermissions = (): Permission[] => {
    if (!user) return [];

    if (user.permissions && user.permissions.length > 0) {
      return user.permissions as Permission[];
    }

    return ROLE_PERMISSIONS[user.role] || [];
  };

  const canAccessModule = (module: string): boolean => {
    const modulePermissions = {
      admin: [PERMISSIONS.USER_READ, PERMISSIONS.ORG_READ],
      agents: [PERMISSIONS.AGENT_READ],
      tools: [PERMISSIONS.TOOL_READ],
      workflows: [PERMISSIONS.WORKFLOW_READ],
      knowledge: [PERMISSIONS.KNOWLEDGE_READ],
      analytics: [PERMISSIONS.ANALYTICS_READ],
      billing: [PERMISSIONS.ORG_BILLING],
    };

    const requiredPermissions =
      modulePermissions[module as keyof typeof modulePermissions];
    if (!requiredPermissions) return false;

    return hasAnyPermission(requiredPermissions);
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    canAccessModule,
    permissions: PERMISSIONS,
  };
}
