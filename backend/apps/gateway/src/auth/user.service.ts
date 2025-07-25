import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, In } from 'typeorm';
import { User } from '@database/entities';
import { IUser, UserRole } from '@shared/interfaces';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventType } from '@shared/enums';

interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
  role?: UserRole;
  permissions?: string[];
  isActive?: boolean;
  emailVerificationToken?: string;
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: UserRole;
  preferences?: Record<string, any>;
  permissions?: string[];
  isActive?: boolean;
}

interface FindUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  requestingUserId?: string;
  requestingUserRole?: UserRole;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userData: CreateUserData): Promise<IUser> {
    // Check if user already exists
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = this.userRepository.create({
      ...userData,
      role: userData.role || UserRole.DEVELOPER,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      emailVerified: false,
      permissions:
        userData.permissions ||
        this.getDefaultPermissions(userData.role || UserRole.DEVELOPER),
    });

    const savedUser = await this.userRepository.save(user);

    // Emit user created event
    this.eventEmitter.emit(EventType.USER_CREATED, {
      userId: savedUser.id,
      organizationId: savedUser.organizationId,
      email: savedUser.email,
      role: savedUser.role,
      timestamp: new Date(),
    });

    return this.findById(savedUser.id);
  }

  async findById(id: string): Promise<IUser | null> {
    if (!id) {
      return null;
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    return user;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    if (!email) {
      return null;
    }

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['organization'],
    });

    return user;
  }

  async findByOrganization(
    organizationId: string,
    options?: FindUsersOptions,
  ): Promise<{ users: IUser[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      requestingUserId,
      requestingUserRole,
    } = options || {};

    const whereConditions: FindOptionsWhere<User> = {
      organizationId,
    };

    // Search functionality
    if (search) {
      const searchConditions = [
        { ...whereConditions, firstName: Like(`%${search}%`) },
        { ...whereConditions, lastName: Like(`%${search}%`) },
        { ...whereConditions, email: Like(`%${search}%`) },
      ];

      const [users, total] = await this.userRepository.findAndCount({
        where: searchConditions,
        relations: ['organization'],
        skip: (page - 1) * limit,
        take: limit,
        order: { [sortBy]: sortOrder },
      });

      return { users, total };
    }

    if (role !== undefined) {
      whereConditions.role = role;
    }

    if (isActive !== undefined) {
      whereConditions.isActive = isActive;
    }

    // Row-level security: Non-admin users can only see themselves
    if (
      requestingUserRole &&
      ![UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN].includes(requestingUserRole)
    ) {
      whereConditions.id = requestingUserId;
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: whereConditions,
      relations: ['organization'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sortBy]: sortOrder },
    });

    return { users, total };
  }

  async update(
    id: string,
    updateData: UpdateUserData,
    requestingUserId?: string,
    requestingUserRole?: UserRole,
  ): Promise<IUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Row-level security: Users can only update themselves unless they're admin
    if (requestingUserId && requestingUserRole) {
      if (
        id !== requestingUserId &&
        ![UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN].includes(requestingUserRole)
      ) {
        throw new BadRequestException('You can only update your own profile');
      }
    }

    // Validate role change permissions
    if (updateData.role && updateData.role !== user.role) {
      await this.validateRoleChange(user, updateData.role, requestingUserRole);
    }

    // Validate permission changes
    if (updateData.permissions) {
      await this.validatePermissionChange(
        user,
        updateData.permissions,
        requestingUserRole,
      );
    }

    await this.userRepository.update(id, updateData);

    const updatedUser = await this.findById(id);

    // Emit user updated event
    this.eventEmitter.emit(EventType.USER_UPDATED, {
      userId: id,
      organizationId: user.organizationId,
      changes: updateData,
      timestamp: new Date(),
    });

    return updatedUser;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
    });

    // Emit user login event
    this.eventEmitter.emit(EventType.USER_LOGIN, {
      userId: id,
      timestamp: new Date(),
    });
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(id, { isActive: false });

    // Emit user deleted event (soft delete)
    this.eventEmitter.emit(EventType.USER_DELETED, {
      userId: id,
      organizationId: user.organizationId,
      timestamp: new Date(),
    });
  }

  async activate(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(id, { isActive: true });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, {
      emailVerified: true,
      emailVerificationToken: null,
    });
  }

  async setPasswordResetToken(email: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await this.userRepository.update(
      { email: email.toLowerCase() },
      {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      },
    );
  }

  async resetPassword(token: string, newPasswordHash: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    await this.userRepository.update(user.id, {
      passwordHash: newPasswordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });
  }

  private async validateRoleChange(
    user: IUser,
    newRole: UserRole,
    requestingUserRole?: UserRole,
  ): Promise<void> {
    // Prevent role escalation beyond organization admin for non-super-admins
    const roleHierarchy = {
      [UserRole.VIEWER]: 1,
      [UserRole.DEVELOPER]: 2,
      [UserRole.ORG_ADMIN]: 3,
      [UserRole.SUPER_ADMIN]: 4,
    };

    // Only super admins can assign super admin role
    if (
      newRole === UserRole.SUPER_ADMIN &&
      requestingUserRole !== UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        'Super admin role can only be assigned by system administrators',
      );
    }

    // Org admins cannot assign roles higher than their own
    if (
      requestingUserRole === UserRole.ORG_ADMIN &&
      roleHierarchy[newRole] >= roleHierarchy[UserRole.SUPER_ADMIN]
    ) {
      throw new BadRequestException('Cannot assign role higher than your own');
    }

    // Developers and viewers cannot change roles
    if (
      requestingUserRole &&
      [UserRole.DEVELOPER, UserRole.VIEWER].includes(requestingUserRole)
    ) {
      throw new BadRequestException(
        'Insufficient permissions to change user roles',
      );
    }

    // Validate role hierarchy
    if (roleHierarchy[newRole] > roleHierarchy[UserRole.SUPER_ADMIN]) {
      throw new BadRequestException('Invalid role assignment');
    }
  }

  private async validatePermissionChange(
    user: IUser,
    newPermissions: string[],
    requestingUserRole?: UserRole,
  ): Promise<void> {
    // Only org admins and super admins can modify permissions
    if (
      requestingUserRole &&
      ![UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN].includes(requestingUserRole)
    ) {
      throw new BadRequestException(
        'Insufficient permissions to modify user permissions',
      );
    }

    // Validate that permissions are valid
    const validPermissions = Object.values({
      AGENT_CREATE: 'agent:create',
      AGENT_READ: 'agent:read',
      AGENT_UPDATE: 'agent:update',
      AGENT_DELETE: 'agent:delete',
      AGENT_EXECUTE: 'agent:execute',
      TOOL_CREATE: 'tool:create',
      TOOL_READ: 'tool:read',
      TOOL_UPDATE: 'tool:update',
      TOOL_DELETE: 'tool:delete',
      TOOL_EXECUTE: 'tool:execute',
      WORKFLOW_CREATE: 'workflow:create',
      WORKFLOW_READ: 'workflow:read',
      WORKFLOW_UPDATE: 'workflow:update',
      WORKFLOW_DELETE: 'workflow:delete',
      WORKFLOW_EXECUTE: 'workflow:execute',
      WORKFLOW_APPROVE: 'workflow:approve',
      KNOWLEDGE_CREATE: 'knowledge:create',
      KNOWLEDGE_READ: 'knowledge:read',
      KNOWLEDGE_UPDATE: 'knowledge:update',
      KNOWLEDGE_DELETE: 'knowledge:delete',
      KNOWLEDGE_SEARCH: 'knowledge:search',
      USER_CREATE: 'user:create',
      USER_READ: 'user:read',
      USER_UPDATE: 'user:update',
      USER_DELETE: 'user:delete',
      USER_INVITE: 'user:invite',
      ORG_READ: 'org:read',
      ORG_UPDATE: 'org:update',
      ORG_DELETE: 'org:delete',
      ORG_SETTINGS: 'org:settings',
      ORG_BILLING: 'org:billing',
      ANALYTICS_READ: 'analytics:read',
      ANALYTICS_EXPORT: 'analytics:export',
      SYSTEM_ADMIN: 'system:admin',
      SYSTEM_MONITOR: 'system:monitor',
    });

    const invalidPermissions = newPermissions.filter(
      (permission) => !validPermissions.includes(permission),
    );
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(', ')}`,
      );
    }
  }

  async bulkAction(
    userIds: string[],
    action: 'activate' | 'deactivate' | 'delete',
    organizationId: string,
    reason?: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const userId of userIds) {
      try {
        const user = await this.findById(userId);
        if (!user) {
          results.failed++;
          results.errors.push(`User ${userId} not found`);
          continue;
        }

        if (user.organizationId !== organizationId) {
          results.failed++;
          results.errors.push(`User ${userId} does not belong to organization`);
          continue;
        }

        switch (action) {
          case 'activate':
            await this.activate(userId);
            break;
          case 'deactivate':
            await this.deactivate(userId);
            break;
          case 'delete':
            await this.deactivate(userId); // Soft delete
            break;
        }

        results.success++;

        // Emit bulk action event
        this.eventEmitter.emit(EventType.USER_BULK_ACTION, {
          userId,
          organizationId,
          action,
          reason,
          timestamp: new Date(),
        });
      } catch (error) {
        results.failed++;
        results.errors.push(`User ${userId}: ${error.message}`);
      }
    }

    return results;
  }

  async searchUsers(
    organizationId: string,
    searchTerm: string,
    filters?: {
      role?: UserRole;
      isActive?: boolean;
      limit?: number;
    },
  ): Promise<IUser[]> {
    const { role, isActive, limit = 50 } = filters || {};

    const whereConditions: FindOptionsWhere<User>[] = [
      {
        organizationId,
        firstName: Like(`%${searchTerm}%`),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      {
        organizationId,
        lastName: Like(`%${searchTerm}%`),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      {
        organizationId,
        email: Like(`%${searchTerm}%`),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
    ];

    const users = await this.userRepository.find({
      where: whereConditions,
      relations: ['organization'],
      take: limit,
      order: { firstName: 'ASC' },
    });

    return users;
  }

  async getUserStats(organizationId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  }> {
    const users = await this.userRepository.find({
      where: { organizationId },
      select: ['id', 'role', 'isActive'],
    });

    const stats = {
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      inactive: users.filter((u) => !u.isActive).length,
      byRole: {
        [UserRole.SUPER_ADMIN]: 0,
        [UserRole.ORG_ADMIN]: 0,
        [UserRole.DEVELOPER]: 0,
        [UserRole.VIEWER]: 0,
      },
    };

    users.forEach((user) => {
      stats.byRole[user.role]++;
    });

    return stats;
  }

  private getDefaultPermissions(role: UserRole): string[] {
    const rolePermissions = {
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

    return rolePermissions[role] || rolePermissions[UserRole.VIEWER];
  }
}
