import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserService } from './user.service';
import { OrganizationService } from './organization.service';
import { RegisterDto, LoginDto } from './dto';
import { IJwtPayload, IUser } from '@shared/interfaces';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventType } from '@shared/enums';

@Injectable()
export class AuthService {
  private readonly refreshTokenTTL: number;
  private readonly accessTokenTTL: number;
  private readonly maxFailedAttempts: number;
  private readonly lockoutDuration: number;

  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.refreshTokenTTL = this.parseTimeToSeconds(
      this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
    this.accessTokenTTL = this.parseTimeToSeconds(
      this.configService.get('JWT_EXPIRES_IN', '24h'),
    );
    this.maxFailedAttempts = this.configService.get(
      'MAX_FAILED_LOGIN_ATTEMPTS',
      5,
    );
    this.lockoutDuration =
      this.configService.get('LOCKOUT_DURATION_MINUTES', 15) * 60;
  }

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, organizationName } =
      registerDto;

    // Check if user already exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create organization if provided
    let organization;
    if (organizationName) {
      organization = await this.organizationService.create({
        name: organizationName,
        slug: this.generateSlug(organizationName),
      });
    }

    // Create user
    const user = await this.userService.create({
      email,
      passwordHash,
      firstName,
      lastName,
      organizationId: organization?.id,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(user: IUser) {
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async validateUser(email: string, password: string): Promise<IUser | null> {
    const normalizedEmail = email.toLowerCase();

    // Check if account is locked
    await this.checkAccountLockout(normalizedEmail);

    const user = await this.userService.findByEmail(normalizedEmail);
    if (!user) {
      await this.recordFailedAttempt(normalizedEmail);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.recordFailedAttempt(normalizedEmail);
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.organization && !user.organization.isActive) {
      throw new UnauthorizedException('Organization is deactivated');
    }

    // Clear failed attempts on successful login
    await this.clearFailedAttempts(normalizedEmail);

    return user;
  }

  async logout(userId: string, accessToken?: string) {
    // Blacklist the current access token
    if (accessToken) {
      await this.blacklistToken(accessToken);
    }

    // Invalidate all refresh tokens for the user
    await this.invalidateUserRefreshTokens(userId);

    // Emit user logout event
    this.eventEmitter.emit(EventType.USER_LOGOUT, {
      userId,
      timestamp: new Date(),
    });
  }

  async refreshToken(refreshToken: string): Promise<any> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get(
          'JWT_REFRESH_SECRET',
          this.configService.get('JWT_SECRET'),
        ),
      });

      // Check if refresh token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      // Get user
      const user = await this.userService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Check if refresh token exists in cache
      const storedToken = await this.cacheManager.get(
        `refresh_token:${user.id}:${this.getTokenHash(refreshToken)}`,
      );
      if (!storedToken) {
        throw new UnauthorizedException('Refresh token not found');
      }

      // Blacklist old refresh token
      await this.blacklistToken(refreshToken);

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(user: IUser) {
    const payload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get(
        'JWT_REFRESH_SECRET',
        this.configService.get('JWT_SECRET'),
      ),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store refresh token in cache
    const tokenHash = this.getTokenHash(refreshToken);
    await this.cacheManager.set(
      `refresh_token:${user.id}:${tokenHash}`,
      {
        userId: user.id,
        createdAt: new Date(),
      },
      this.refreshTokenTTL * 1000, // Convert to milliseconds
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
      tokenType: 'Bearer',
    };
  }

  private sanitizeUser(user: any): IUser {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);
  }

  // Token blacklisting methods
  async blacklistToken(token: string): Promise<void> {
    const tokenHash = this.getTokenHash(token);
    await this.cacheManager.set(
      `blacklisted_token:${tokenHash}`,
      true,
      this.accessTokenTTL * 1000, // TTL in milliseconds
    );
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.getTokenHash(token);
    const blacklisted = await this.cacheManager.get(
      `blacklisted_token:${tokenHash}`,
    );
    return !!blacklisted;
  }

  private async invalidateUserRefreshTokens(userId: string): Promise<void> {
    // In a production system, you might want to store a list of active tokens
    // For now, we'll use a simple approach with a user token version
    await this.cacheManager.set(
      `user_token_version:${userId}`,
      Date.now(),
      this.refreshTokenTTL * 1000,
    );
  }

  private getTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Account lockout methods
  private async checkAccountLockout(email: string): Promise<void> {
    const lockoutKey = `lockout:${email}`;
    const lockoutData = await this.cacheManager.get(lockoutKey);

    if (lockoutData) {
      throw new UnauthorizedException(
        `Account is locked due to too many failed login attempts. Try again later.`,
      );
    }
  }

  private async recordFailedAttempt(email: string): Promise<void> {
    const attemptsKey = `failed_attempts:${email}`;
    const attempts =
      ((await this.cacheManager.get(attemptsKey)) as number) || 0;
    const newAttempts = attempts + 1;

    if (newAttempts >= this.maxFailedAttempts) {
      // Lock the account
      const lockoutKey = `lockout:${email}`;
      await this.cacheManager.set(
        lockoutKey,
        true,
        this.lockoutDuration * 1000,
      );
      await this.cacheManager.del(attemptsKey);
    } else {
      // Increment failed attempts
      await this.cacheManager.set(
        attemptsKey,
        newAttempts,
        this.lockoutDuration * 1000,
      );
    }
  }

  private async clearFailedAttempts(email: string): Promise<void> {
    const attemptsKey = `failed_attempts:${email}`;
    await this.cacheManager.del(attemptsKey);
  }

  private parseTimeToSeconds(timeString: string): number {
    const timeRegex = /^(\d+)([smhd])$/;
    const match = timeString.match(timeRegex);

    if (!match) {
      return 3600; // Default to 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }
}
