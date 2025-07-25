import { api } from "./api";
import { UserRole } from "@/types/global";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  avatar?: string;
  permissions?: string[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSearchFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
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

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: string[];
  message?: string;
}

export interface BulkActionResult {
  success: number;
  failed: number;
  errors: string[];
}

export const userAPI = {
  async getUsers(
    page: number = 1,
    limit: number = 10,
    filters: UserSearchFilters = {},
  ): Promise<PaginatedUsers> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined),
      ),
    });

    const response = await api.get(`/auth/users?${params}`);
    return response.data;
  },

  async getUserById(id: string): Promise<User> {
    const response = await api.get(`/auth/users/${id}`);
    return response.data.data;
  },

  async getUserStats(): Promise<UserStats> {
    const response = await api.get("/auth/users/stats");
    return response.data.data;
  },

  async inviteUser(userData: InviteUserRequest): Promise<any> {
    const response = await api.post("/auth/users/invite", userData);
    return response.data;
  },

  async activateUser(userId: string): Promise<void> {
    await api.post("/auth/users/activate", { userId });
  },

  async deactivateUser(userId: string, reason?: string): Promise<void> {
    await api.post("/auth/users/deactivate", { userId, reason });
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const response = await api.put(`/auth/users/${id}`, userData);
    return response.data.data;
  },

  async bulkAction(
    userIds: string[],
    action: "activate" | "deactivate" | "delete",
    reason?: string,
  ): Promise<BulkActionResult> {
    const response = await api.post("/auth/users/bulk-action", {
      userIds,
      action,
      reason,
    });
    return response.data.data;
  },

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
      ...Object.fromEntries(
        Object.entries(filters || {}).filter(
          ([_, value]) => value !== undefined,
        ),
      ),
    });

    const response = await api.get(`/auth/users/search?${params}`);
    return response.data.data;
  },

  async resetPassword(userId: string): Promise<void> {
    await api.post(`/auth/users/${userId}/reset-password`);
  },

  async impersonateUser(userId: string): Promise<{ token: string }> {
    const response = await api.post("/auth/impersonate", { userId });
    return response.data.data;
  },

  async stopImpersonation(): Promise<void> {
    await api.post("/auth/stop-impersonation");
  },
};
