'use client';

import React, { useState } from 'react';
import { Mail, User, Shield, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types/global';
import { InviteUserRequest } from '@/lib/user-api';

interface UserInvitationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (userData: InviteUserRequest) => Promise<any>;
}

const roleDescriptions = {
  [UserRole.SUPER_ADMIN]: {
    label: 'Super Admin',
    description: 'Full system access with all permissions',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
  [UserRole.ORG_ADMIN]: {
    label: 'Organization Admin',
    description: 'Manage organization users, settings, and billing',
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  },
  [UserRole.DEVELOPER]: {
    label: 'Developer',
    description: 'Create and manage agents, tools, and workflows',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  [UserRole.VIEWER]: {
    label: 'Viewer',
    description: 'Read-only access to view agents and analytics',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  },
};

const defaultPermissions = {
  [UserRole.SUPER_ADMIN]: [
    'system:admin',
    'system:monitor',
    'org:read',
    'org:update',
    'org:delete',
    'org:settings',
    'org:billing',
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:invite',
    'agent:create',
    'agent:read',
    'agent:update',
    'agent:delete',
    'agent:execute',
    'tool:create',
    'tool:read',
    'tool:update',
    'tool:delete',
    'tool:execute',
    'workflow:create',
    'workflow:read',
    'workflow:update',
    'workflow:delete',
    'workflow:execute',
    'workflow:approve',
    'knowledge:create',
    'knowledge:read',
    'knowledge:update',
    'knowledge:delete',
    'knowledge:search',
    'analytics:read',
    'analytics:export',
  ],
  [UserRole.ORG_ADMIN]: [
    'org:read',
    'org:update',
    'org:settings',
    'org:billing',
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:invite',
    'agent:create',
    'agent:read',
    'agent:update',
    'agent:delete',
    'agent:execute',
    'tool:create',
    'tool:read',
    'tool:update',
    'tool:delete',
    'tool:execute',
    'workflow:create',
    'workflow:read',
    'workflow:update',
    'workflow:delete',
    'workflow:execute',
    'workflow:approve',
    'knowledge:create',
    'knowledge:read',
    'knowledge:update',
    'knowledge:delete',
    'knowledge:search',
    'analytics:read',
    'analytics:export',
  ],
  [UserRole.DEVELOPER]: [
    'agent:create',
    'agent:read',
    'agent:update',
    'agent:delete',
    'agent:execute',
    'tool:create',
    'tool:read',
    'tool:update',
    'tool:delete',
    'tool:execute',
    'workflow:create',
    'workflow:read',
    'workflow:update',
    'workflow:delete',
    'workflow:execute',
    'knowledge:create',
    'knowledge:read',
    'knowledge:update',
    'knowledge:delete',
    'knowledge:search',
    'analytics:read',
  ],
  [UserRole.VIEWER]: [
    'agent:read',
    'tool:read',
    'workflow:read',
    'knowledge:read',
    'knowledge:search',
    'analytics:read',
  ],
};

export function UserInvitation({
  open,
  onOpenChange,
  onInvite,
}: UserInvitationProps) {
  const [formData, setFormData] = useState<InviteUserRequest>({
    email: '',
    firstName: '',
    lastName: '',
    role: UserRole.DEVELOPER,
    permissions: defaultPermissions[UserRole.DEVELOPER],
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [customPermissions, setCustomPermissions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onInvite(formData);
      onOpenChange(false);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: UserRole.DEVELOPER,
        permissions: defaultPermissions[UserRole.DEVELOPER],
        message: '',
      });
      setCustomPermissions(false);
    } catch (error: any) {
      console.error('Failed to invite user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData({
      ...formData,
      role,
      permissions: customPermissions
        ? formData.permissions
        : defaultPermissions[role],
    });
  };

  const handlePermissionToggle = (permission: string) => {
    const currentPermissions = formData.permissions || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter((p: string) => p !== permission)
      : [...currentPermissions, permission];

    setFormData({ ...formData, permissions: newPermissions });
  };

  const allPermissions = [
    { category: 'System', permissions: ['system:admin', 'system:monitor'] },
    {
      category: 'Organization',
      permissions: [
        'org:read',
        'org:update',
        'org:delete',
        'org:settings',
        'org:billing',
      ],
    },
    {
      category: 'Users',
      permissions: [
        'user:create',
        'user:read',
        'user:update',
        'user:delete',
        'user:invite',
      ],
    },
    {
      category: 'Agents',
      permissions: [
        'agent:create',
        'agent:read',
        'agent:update',
        'agent:delete',
        'agent:execute',
      ],
    },
    {
      category: 'Tools',
      permissions: [
        'tool:create',
        'tool:read',
        'tool:update',
        'tool:delete',
        'tool:execute',
      ],
    },
    {
      category: 'Workflows',
      permissions: [
        'workflow:create',
        'workflow:read',
        'workflow:update',
        'workflow:delete',
        'workflow:execute',
        'workflow:approve',
      ],
    },
    {
      category: 'Knowledge',
      permissions: [
        'knowledge:create',
        'knowledge:read',
        'knowledge:update',
        'knowledge:delete',
        'knowledge:search',
      ],
    },
    {
      category: 'Analytics',
      permissions: ['analytics:read', 'analytics:export'],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Invite New User</span>
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a new user to join your organization with
            specific roles and permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>User Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Role Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Role & Permissions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleDescriptions).map(([role, info]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center space-x-2">
                          <Badge className={info.color}>{info.label}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {info.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="customPermissions"
                  checked={customPermissions}
                  onCheckedChange={(checked: boolean) => setCustomPermissions(checked)}
                /> 
                <Checkbox
                  id="customPermissions"
                  checked={customPermissions}
                  onCheckedChange={(checked: boolean) => setCustomPermissions(checked)}
                />
                <Label htmlFor="customPermissions">Customize permissions</Label>
              </div>

              {customPermissions && (
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="text-sm font-medium">Custom Permissions</div>
                  {allPermissions.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {category.category}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {category.permissions.map((permission) => (
                          <div
                            key={permission}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={permission}
                              checked={
                                formData.permissions?.includes(permission) ||
                                false
                              }
                              onCheckedChange={() =>
                                handlePermissionToggle(permission)
                              }
                            />
                            <Label htmlFor={permission} className="text-sm">
                              {permission.split(':')[1]}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Invitation Message</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="message">Custom Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to the invitation email..."
                  value={formData.message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
