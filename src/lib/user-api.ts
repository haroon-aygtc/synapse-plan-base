import { api } from './api';
import { UserRole } from '@/types/global';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  avatar?: string;
  preferences?: Record<string, any>;
  permissions?: string[];
}

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: string[];
  message?: string;
}

export interface UserSearchFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedUsers {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
}

export interface BulkActionResult {
  success: number;
  failed: number;
  errors: string[];
}

class UserAPI {
  async getUsers(
    page: number = 1,
    limit: number = 10,
    filters?: UserSearchFilters,
  ): Promise<PaginatedUsers> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.role && { role: filters.role }),
      ...(filters?.isActive !== undefined && {
        isActive: filters.isActive.toString(),
      }),
      ...(filters?.sortBy && { sortBy: filters.sortBy }),
      ...(filters?.sortOrder && { sortOrder: filters.sortOrder }),
    });

    const response = await api.get(`/auth/users?${params}`);
    return {
      users: response.data.data,
      pagination: response.data.pagination,
    };
  }

  async getUserById(id: string): Promise<User> {
    const response = await api.get(`/auth/users/${id}`);
    return response.data.data;
  }

  async inviteUser(
    userData: InviteUserRequest,
  ): Promise<{ invitationId: string; email: string }> {
    const response = await api.post('/auth/users/invite', userData);
    return response.data.data;
  }

  async activateUser(userId: string): Promise<void> {
    await api.post('/auth/users/activate', { userId });
  }

  async deactivateUser(userId: string, reason?: string): Promise<void> {
    await api.post('/auth/users/deactivate', { userId, reason });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const response = await api.put(`/auth/users/${id}`, userData);
    return response.data.data;
  }

  async bulkAction(
    userIds: string[],
    action: 'activate' | 'deactivate' | 'delete',
    reason?: string,
  ): Promise<BulkActionResult> {
    const response = await api.post('/auth/users/bulk-action', {
      userIds,
      action,
      reason,
    });
    return response.data.data;
  }

  async searchUsers(
    searchTerm: string,
    filters?: {
      role?: UserRole;
      isActive?: boolean;
      limit?: number;
    },
  ): Promise<User[]> {
    const params = new URLSearchParams({
      search: searchTerm,
      ...(filters?.role && { role: filters.role }),
      ...(filters?.isActive !== undefined && {
        isActive: filters.isActive.toString(),
      }),
      ...(filters?.limit && { limit: filters.limit.toString() }),
    });

    const response = await api.get(`/auth/users?${params}`);
    return response.data.data;
  }

  async getUserStats(): Promise<UserStats> {
    const response = await api.get('/auth/users/stats');
    return response.data.data;
  }
}

export const userAPI = new UserAPI();
