'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Users,
  UserCheck,
  UserX,
  Mail,
  Trash2,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUserManagement } from '@/hooks/useUserManagement';
import { UserRole } from '@/types/global';
import { UserInvitation } from './UserInvitation';
import { RBACPermissions } from './RBACPermissions';

interface UserManagementProps {
  className?: string;
}

const roleColors = {
  [UserRole.SUPER_ADMIN]:
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  [UserRole.ORG_ADMIN]:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  [UserRole.DEVELOPER]:
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [UserRole.VIEWER]:
    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const roleLabels = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ORG_ADMIN]: 'Org Admin',
  [UserRole.DEVELOPER]: 'Developer',
  [UserRole.VIEWER]: 'Viewer',
};

export function UserManagement({ className }: UserManagementProps) {
  const {
    users,
    pagination,
    filters,
    stats,
    selectedUsers,
    loading,
    error,
    fetchUsers,
    inviteUser,
    activateUser,
    deactivateUser,
    updateUser,
    bulkAction,
    updateFilters,
    changePage,
    toggleUserSelection,
    selectAllUsers,
    clearSelection,
    hasSelection,
    allSelected,
  } = useUserManagement();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<
    'activate' | 'deactivate' | 'delete'
  >('activate');
  const [deactivationReason, setDeactivationReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    updateFilters({ ...filters, search: value });
  };

  const handleFilterChange = (key: string, value: any) => {
    updateFilters({ ...filters, [key]: value });
  };

  const handleUserAction = async (
    userId: string,
    action: 'activate' | 'deactivate' | 'edit',
  ) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    switch (action) {
      case 'activate':
        await activateUser(userId);
        break;
      case 'deactivate':
        setSelectedUser(user);
        setShowDeactivateDialog(true);
        break;
      case 'edit':
        setSelectedUser(user);
        setShowPermissionsDialog(true);
        break;
    }
  };

  const handleDeactivateConfirm = async () => {
    if (selectedUser) {
      await deactivateUser(selectedUser.id, deactivationReason);
      setShowDeactivateDialog(false);
      setSelectedUser(null);
      setDeactivationReason('');
    }
  };

  const handleBulkAction = async () => {
    await bulkAction(selectedUsers, bulkActionType, deactivationReason);
    setShowBulkActionDialog(false);
    setDeactivationReason('');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Inactive Users
              </CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.inactive}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.byRole[UserRole.ORG_ADMIN] +
                  stats.byRole[UserRole.SUPER_ADMIN]}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users, roles, and permissions for your organization
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.role || ''}
              onValueChange={(value: string) =>
                handleFilterChange('role', value || undefined)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value={UserRole.SUPER_ADMIN}>
                  Super Admin
                </SelectItem>
                <SelectItem value={UserRole.ORG_ADMIN}>Org Admin</SelectItem>
                <SelectItem value={UserRole.DEVELOPER}>Developer</SelectItem>
                <SelectItem value={UserRole.VIEWER}>Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.isActive?.toString() || ''}
              onValueChange={(value: string) =>
                handleFilterChange(
                  'isActive',
                  value === '' ? undefined : value === 'true',
                )
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {hasSelection && (
            <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''}{' '}
                selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBulkActionType('activate');
                  setShowBulkActionDialog(true);
                }}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBulkActionType('deactivate');
                  setShowBulkActionDialog(true);
                }}
              >
                <UserX className="h-4 w-4 mr-1" />
                Deactivate
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                Clear Selection
              </Button>
            </div>
          )}

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          selectAllUsers();
                        } else {
                          clearSelection();
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked: boolean) => toggleUserSelection(user.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              {getInitials(user.firstName, user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActive ? 'default' : 'secondary'}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleUserAction(user.id, 'edit')}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.isActive ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUserAction(user.id, 'deactivate')
                                }
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUserAction(user.id, 'activate')
                                }
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
                of {pagination.total} users
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UserInvitation
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={inviteUser}
      />

      <RBACPermissions
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        user={selectedUser}
        onUpdate={updateUser}
      />

      {/* Deactivate User Dialog */}
      <AlertDialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {selectedUser?.firstName}{' '}
              {selectedUser?.lastName}? This will prevent them from accessing
              the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="Reason for deactivation (optional)"
              value={deactivationReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeactivationReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateConfirm}>
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Dialog */}
      <AlertDialog
        open={showBulkActionDialog}
        onOpenChange={setShowBulkActionDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkActionType === 'activate' ? 'Activate' : 'Deactivate'} Users
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {bulkActionType} {selectedUsers.length}{' '}
              user{selectedUsers.length > 1 ? 's' : ''}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkActionType === 'deactivate' && (
            <div className="my-4">
              <Textarea
                placeholder="Reason for deactivation (optional)"
                value={deactivationReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeactivationReason(e.target.value)}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAction}>
              {bulkActionType === 'activate' ? 'Activate' : 'Deactivate'} Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
