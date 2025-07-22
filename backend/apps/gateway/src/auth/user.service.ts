import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
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
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: UserRole;
  preferences?: Record<string, any>;
  isActive?: boolean;
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
      isActive: true,
      emailVerified: false,
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
    options?: {
      page?: number;
      limit?: number;
      role?: UserRole;
      isActive?: boolean;
    },
  ): Promise<{ users: IUser[]; total: number }> {
    const { page = 1, limit = 10, role, isActive } = options || {};

    const whereConditions: FindOptionsWhere<User> = {
      organizationId,
    };

    if (role !== undefined) {
      whereConditions.role = role;
    }

    if (isActive !== undefined) {
      whereConditions.isActive = isActive;
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: whereConditions,
      relations: ['organization'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { users, total };
  }

  async update(id: string, updateData: UpdateUserData): Promise<IUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate role change permissions
    if (updateData.role && updateData.role !== user.role) {
      await this.validateRoleChange(user, updateData.role);
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
  ): Promise<void> {
    // Prevent role escalation beyond organization admin for non-super-admins
    const roleHierarchy = {
      [UserRole.VIEWER]: 1,
      [UserRole.DEVELOPER]: 2,
      [UserRole.ORG_ADMIN]: 3,
      [UserRole.SUPER_ADMIN]: 4,
    };

    // Only super admins can assign super admin role
    if (newRole === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'Super admin role can only be assigned by system administrators',
      );
    }

    // Validate role hierarchy
    if (roleHierarchy[newRole] > roleHierarchy[UserRole.ORG_ADMIN]) {
      throw new BadRequestException('Invalid role assignment');
    }
  }
}
