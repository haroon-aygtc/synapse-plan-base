'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  User,
  Check,
  X,
  AlertTriangle,
  Save,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { UserRole, PERMISSIONS, ROLE_PERMISSIONS } from '@/types/global';
import { User as UserType } from '@/lib/user-api';

interface RBACPermissionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserType | null;
  onUpdate: (id: string, userData: Partial<UserType>) => Promise<UserType>;
}

const roleDescriptions = {
  [UserRole.SUPER_ADMIN]: {
    label: 'Super Admin',
    description: 'Full system access with all permissions',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    risk: 'high',
  },
  [UserRole.ORG_ADMIN]: {
    label: 'Organization Admin',
    description: 'Manage organization users, settings, and billing',
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    risk: 'medium',
  },
  [UserRole.DEVELOPER]: {
    label: 'Developer',
    description: 'Create and manage agents, tools, and workflows',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    risk: 'low',
  },
  [UserRole.VIEWER]: {
    label: 'Viewer',
    description: 'Read-only access to view agents and analytics',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    risk: 'minimal',
  },
};

const permissionCategories = [
  {
    name: 'System',
    permissions: [PERMISSIONS.SYSTEM_ADMIN, PERMISSIONS.SYSTEM_MONITOR],
    description: 'System-level administration and monitoring',
  },
  {
    name: 'Organization',
    permissions: [
      PERMISSIONS.ORG_READ,
      PERMISSIONS.ORG_UPDATE,
      PERMISSIONS.ORG_DELETE,
      PERMISSIONS.ORG_SETTINGS,
      PERMISSIONS.ORG_BILLING,
    ],
    description: 'Organization management and settings',
  },
  {
    name: 'Users',
    permissions: [
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.USER_DELETE,
      PERMISSIONS.USER_INVITE,
    ],
    description: 'User management and invitations',
  },
  {
    name: 'Agents',
    permissions: [
      PERMISSIONS.AGENT_CREATE,
      PERMISSIONS.AGENT_READ,
      PERMISSIONS.AGENT_UPDATE,
      PERMISSIONS.AGENT_DELETE,
      PERMISSIONS.AGENT_EXECUTE,
    ],
    description: 'AI agent creation and management',
  },
  {
    name: 'Tools',
    permissions: [
      PERMISSIONS.TOOL_CREATE,
      PERMISSIONS.TOOL_READ,
      PERMISSIONS.TOOL_UPDATE,
      PERMISSIONS.TOOL_DELETE,
      PERMISSIONS.TOOL_EXECUTE,
    ],
    description: 'Tool integration and execution',
  },
  {
    name: 'Workflows',
    permissions: [
      PERMISSIONS.WORKFLOW_CREATE,
      PERMISSIONS.WORKFLOW_READ,
      PERMISSIONS.WORKFLOW_UPDATE,
      PERMISSIONS.WORKFLOW_DELETE,
      PERMISSIONS.WORKFLOW_EXECUTE,
      PERMISSIONS.WORKFLOW_APPROVE,
    ],
    description: 'Workflow orchestration and approval',
  },
  {
    name: 'Knowledge',
    permissions: [
      PERMISSIONS.KNOWLEDGE_CREATE,
      PERMISSIONS.KNOWLEDGE_READ,
      PERMISSIONS.KNOWLEDGE_UPDATE,
      PERMISSIONS.KNOWLEDGE_DELETE,
      PERMISSIONS.KNOWLEDGE_SEARCH,
    ],
    description: 'Knowledge base and document management',
  },
  {
    name: 'Analytics',
    permissions: [PERMISSIONS.ANALYTICS_READ, PERMISSIONS.ANALYTICS_EXPORT],
    description: 'Analytics and reporting access',
  },
];

export function RBACPermissions({
  open,
  onOpenChange,
  user,
  onUpdate,
}: RBACPermissionsProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.VIEWER);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedPermissions(user.permissions || ROLE_PERMISSIONS[user.role]);
      setHasChanges(false);
    }
  }, [user]);

  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    setSelectedPermissions(ROLE_PERMISSIONS[newRole]);
    setHasChanges(true);
  };

  const handlePermissionToggle = (permission: string) => {
    const newPermissions = selectedPermissions.includes(permission)
      ? selectedPermissions.filter((p) => p !== permission)
      : [...selectedPermissions, permission];

    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleReset = () => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedPermissions(user.permissions || ROLE_PERMISSIONS[user.role]);
      setHasChanges(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await onUpdate(user.id, {
        role: selectedRole,
        permissions: selectedPermissions,
      });
      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update user permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionLabel = (permission: string) => {
    return (
      permission
        .split(':')[1]
        ?.replace(/([A-Z])/g, ' $1')
        .toLowerCase() || permission
    );
  };

  const getRiskLevel = (role: UserRole) => {
    const risk = roleDescriptions[role].risk;
    const colors = {
      minimal: 'text-green-600',
      low: 'text-blue-600',
      medium: 'text-yellow-600',
      high: 'text-red-600',
    };
    return { risk, color: colors[risk as keyof typeof colors] };
  };

  if (!user) return null;

  const currentRoleInfo = roleDescriptions[selectedRole];
  const riskInfo = getRiskLevel(selectedRole);
  const rolePermissions = ROLE_PERMISSIONS[selectedRole];
  const hasCustomPermissions =
    JSON.stringify(selectedPermissions.sort()) !==
    JSON.stringify(rolePermissions.sort());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Manage Permissions</span>
          </DialogTitle>
          <DialogDescription>
            Configure role and permissions for {user.firstName} {user.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>User Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="font-medium">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user.email}
                  </div>
                </div>
                <Badge className={roleDescriptions[user.role].color}>
                  {roleDescriptions[user.role].label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Role Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role Assignment</CardTitle>
              <CardDescription>
                Select the primary role for this user. Each role comes with
                predefined permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select value={selectedRole} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleDescriptions).map(([role, info]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <Badge className={info.color}>{info.label}</Badge>
                            <span className="text-sm">{info.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Info */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge className={currentRoleInfo.color}>
                      {currentRoleInfo.label}
                    </Badge>
                    <span className={`text-sm font-medium ${riskInfo.color}`}>
                      {riskInfo.risk.toUpperCase()} RISK
                    </span>
                  </div>
                  {hasCustomPermissions && (
                    <Badge variant="outline">Custom Permissions</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentRoleInfo.description}
                </p>
              </div>

              {/* Risk Warning */}
              {selectedRole !== user.role && riskInfo.risk === 'high' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>High Risk Role Assignment</AlertTitle>
                  <AlertDescription>
                    You are assigning a Super Admin role which grants full
                    system access. Please ensure this user requires these
                    elevated privileges.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detailed Permissions</CardTitle>
              <CardDescription>
                Fine-tune specific permissions for this user. Changes from the
                default role permissions will be highlighted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {permissionCategories.map((category) => {
                  const categoryPermissions = category.permissions.filter((p) =>
                    Object.values(PERMISSIONS).includes(p),
                  );
                  const hasAnyPermission = categoryPermissions.some((p) =>
                    selectedPermissions.includes(p),
                  );
                  const hasAllPermissions = categoryPermissions.every((p) =>
                    selectedPermissions.includes(p),
                  );

                  return (
                    <div key={category.name} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{category.name}</h4>
                            {hasAnyPermission && (
                              <Badge
                                variant={
                                  hasAllPermissions ? 'default' : 'secondary'
                                }
                              >
                                {hasAllPermissions
                                  ? 'Full Access'
                                  : 'Partial Access'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {hasAnyPermission ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pl-4">
                        {categoryPermissions.map((permission) => {
                          const isSelected =
                            selectedPermissions.includes(permission);
                          const isDefaultForRole =
                            rolePermissions.includes(permission);
                          const isCustom = isSelected !== isDefaultForRole;

                          return (
                            <div
                              key={permission}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={permission}
                                checked={isSelected}
                                onCheckedChange={() =>
                                  handlePermissionToggle(permission)
                                }
                              />
                              <Label
                                htmlFor={permission}
                                className={`text-sm flex-1 ${isCustom ? 'font-medium' : ''}`}
                              >
                                {getPermissionLabel(permission)}
                              </Label>
                              {isCustom && (
                                <Badge variant="outline" className="text-xs">
                                  Custom
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {category !==
                        permissionCategories[
                          permissionCategories.length - 1
                        ] && <Separator />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || loading}>
              <Save className="h-4 w-4 mr-1" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
