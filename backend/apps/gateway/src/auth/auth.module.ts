import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { User, Organization } from '@database/entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserService } from './user.service';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from '@shared/guards/permissions.guard';
import { RowLevelSecurityGuard } from '@shared/guards/row-level-security.guard';
import { TenantContextInterceptor } from '@shared/interceptors/tenant-context.interceptor';
import { RowLevelSecurityMiddleware } from '@shared/middleware/row-level-security.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Generate cryptographically secure JWT secret if not provided
        const jwtSecret =
          configService.get('JWT_SECRET') ||
          crypto.randomBytes(64).toString('hex');

        if (!configService.get('JWT_SECRET')) {
          console.warn(
            '⚠️  JWT_SECRET not found in environment variables. Using generated secret.',
          );
          console.warn(
            '🔒 For production, set JWT_SECRET environment variable.',
          );
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: configService.get('JWT_EXPIRES_IN', '15m'), // Shorter expiry for security
            issuer: configService.get('JWT_ISSUER', 'synapseai'),
            audience: configService.get('JWT_AUDIENCE', 'synapseai-users'),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    OrganizationService,
    JwtStrategy,
    LocalStrategy,
    // Global guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RowLevelSecurityGuard,
    },
    RowLevelSecurityMiddleware,
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
  exports: [AuthService, UserService, OrganizationService],
})
export class AuthModule {}
