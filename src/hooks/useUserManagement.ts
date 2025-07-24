import { useState, useEffect, useCallback } from 'react';
import {
  userAPI,
  User,
  UserSearchFilters,
  PaginatedUsers,
  UserStats,
  InviteUserRequest,
  BulkActionResult,
} from '@/lib/user-api';
import { UserRole } from '@/types/global';
import { useToast } from '@/components/ui/use-toast';

export interface UseUserManagementOptions {
  initialPage?: number;
  initialLimit?: number;
  initialFilters?: UserSearchFilters;
}

export function useUserManagement(options: UseUserManagementOptions = {}) {
  const { initialPage = 1, initialLimit = 10, initialFilters = {} } = options;
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<UserSearchFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const fetchUsers = useCallback(
    async (page?: number, newFilters?: UserSearchFilters) => {
      setLoading(true);
      setError(null);
      try {
        const currentPage = page || pagination.page;
        const currentFilters = newFilters || filters;

        const result = await userAPI.getUsers(
          currentPage,
          pagination.limit,
          currentFilters,
        );
        setUsers(result.users);
        setPagination(result.pagination);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users');
        toast({
          title: 'Error',
          description: 'Failed to fetch users',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit, filters, toast],
  );

  const fetchStats = useCallback(async () => {
    try {
      const userStats = await userAPI.getUserStats();
      setStats(userStats);
    } catch (err: any) {
      console.error('Failed to fetch user stats:', err);
    }
  }, []);

  const inviteUser = useCallback(
    async (userData: InviteUserRequest) => {
      try {
        const result = await userAPI.inviteUser(userData);
        toast({
          title: 'Success',
          description: `Invitation sent to ${userData.email}`,
        });
        await fetchUsers();
        return result;
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Failed to send invitation',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [fetchUsers, toast],
  );

  const activateUser = useCallback(
    async (userId: string) => {
      try {
        await userAPI.activateUser(userId);
        toast({
          title: 'Success',
          description: 'User activated successfully',
        });
        await fetchUsers();
        await fetchStats();
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Failed to activate user',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [fetchUsers, fetchStats, toast],
  );

  const deactivateUser = useCallback(
    async (userId: string, reason?: string) => {
      try {
        await userAPI.deactivateUser(userId, reason);
        toast({
          title: 'Success',
          description: 'User deactivated successfully',
        });
        await fetchUsers();
        await fetchStats();
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Failed to deactivate user',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [fetchUsers, fetchStats, toast],
  );

  const updateUser = useCallback(
    async (id: string, userData: Partial<User>) => {
      try {
        const updatedUser = await userAPI.updateUser(id, userData);
        toast({
          title: 'Success',
          description: 'User updated successfully',
        });
        await fetchUsers();
        return updatedUser;
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Failed to update user',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [fetchUsers, toast],
  );

  const bulkAction = useCallback(
    async (
      userIds: string[],
      action: 'activate' | 'deactivate' | 'delete',
      reason?: string,
    ): Promise<BulkActionResult> => {
      try {
        const result = await userAPI.bulkAction(userIds, action, reason);
        toast({
          title: 'Bulk Action Complete',
          description: `${result.success} users processed successfully. ${result.failed} failed.`,
        });
        await fetchUsers();
        await fetchStats();
        setSelectedUsers([]);
        return result;
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Bulk action failed',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [fetchUsers, fetchStats, toast],
  );

  const searchUsers = useCallback(
    async (
      searchTerm: string,
      searchFilters?: {
        role?: UserRole;
        isActive?: boolean;
        limit?: number;
      },
    ) => {
      try {
        const results = await userAPI.searchUsers(searchTerm, searchFilters);
        return results;
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Search failed',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [toast],
  );

  const updateFilters = useCallback(
    (newFilters: UserSearchFilters) => {
      setFilters(newFilters);
      fetchUsers(1, newFilters);
    },
    [fetchUsers],
  );

  const changePage = useCallback(
    (page: number) => {
      setPagination((prev) => ({ ...prev, page }));
      fetchUsers(page);
    },
    [fetchUsers],
  );

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }, []);

  const selectAllUsers = useCallback(() => {
    setSelectedUsers(users.map((user) => user.id));
  }, [users]);

  const clearSelection = useCallback(() => {
    setSelectedUsers([]);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  return {
    // Data
    users,
    pagination,
    filters,
    stats,
    selectedUsers,
    loading,
    error,

    // Actions
    fetchUsers,
    fetchStats,
    inviteUser,
    activateUser,
    deactivateUser,
    updateUser,
    bulkAction,
    searchUsers,
    updateFilters,
    changePage,

    // Selection
    toggleUserSelection,
    selectAllUsers,
    clearSelection,

    // Computed
    hasSelection: selectedUsers.length > 0,
    allSelected: selectedUsers.length === users.length && users.length > 0,
  };
}
