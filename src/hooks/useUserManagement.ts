import { useState, useEffect, useCallback } from "react";
import {
  userAPI,
  User,
  UserSearchFilters,
  InviteUserRequest,
} from "@/lib/user-api";
import { UserRole } from "@/types/global";

interface UseUserManagementReturn {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: UserSearchFilters;
  stats: {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  } | null;
  selectedUsers: string[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  inviteUser: (userData: InviteUserRequest) => Promise<any>;
  activateUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string, reason?: string) => Promise<void>;
  updateUser: (id: string, userData: Partial<User>) => Promise<User>;
  bulkAction: (
    userIds: string[],
    action: "activate" | "deactivate" | "delete",
    reason?: string,
  ) => Promise<void>;
  updateFilters: (newFilters: UserSearchFilters) => void;
  changePage: (page: number) => void;
  toggleUserSelection: (userId: string) => void;
  selectAllUsers: () => void;
  clearSelection: () => void;
  hasSelection: boolean;
  allSelected: boolean;
}

export function useUserManagement(): UseUserManagementReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<UserSearchFilters>({
    search: "",
    role: undefined,
    isActive: undefined,
    sortBy: "createdAt",
    sortOrder: "DESC" as const,
  });
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  } | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userAPI.getUsers(
        pagination.page,
        pagination.limit,
        filters,
      );
      setUsers(response.users);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const userStats = await userAPI.getUserStats();
      setStats(userStats);
    } catch (err) {
      console.error("Failed to fetch user stats:", err);
    }
  }, []);

  const inviteUser = useCallback(
    async (userData: InviteUserRequest) => {
      try {
        const result = await userAPI.inviteUser(userData);
        await fetchUsers();
        await fetchStats();
        return result;
      } catch (err) {
        throw err;
      }
    },
    [fetchUsers, fetchStats],
  );

  const activateUser = useCallback(
    async (userId: string) => {
      try {
        await userAPI.activateUser(userId);
        await fetchUsers();
        await fetchStats();
      } catch (err) {
        throw err;
      }
    },
    [fetchUsers, fetchStats],
  );

  const deactivateUser = useCallback(
    async (userId: string, reason?: string) => {
      try {
        await userAPI.deactivateUser(userId, reason);
        await fetchUsers();
        await fetchStats();
      } catch (err) {
        throw err;
      }
    },
    [fetchUsers, fetchStats],
  );

  const updateUser = useCallback(
    async (id: string, userData: Partial<User>) => {
      try {
        const updatedUser = await userAPI.updateUser(id, userData);
        await fetchUsers();
        await fetchStats();
        return updatedUser;
      } catch (err) {
        throw err;
      }
    },
    [fetchUsers, fetchStats],
  );

  const bulkAction = useCallback(
    async (
      userIds: string[],
      action: "activate" | "deactivate" | "delete",
      reason?: string,
    ) => {
      try {
        await userAPI.bulkAction(userIds, action, reason);
        await fetchUsers();
        await fetchStats();
        setSelectedUsers([]);
      } catch (err) {
        throw err;
      }
    },
    [fetchUsers, fetchStats],
  );

  const updateFilters = useCallback((newFilters: UserSearchFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const changePage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

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

  const hasSelection = selectedUsers.length > 0;
  const allSelected = users.length > 0 && selectedUsers.length === users.length;

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
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
  };
}
