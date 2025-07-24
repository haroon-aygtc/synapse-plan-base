import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@shared/interfaces';

export class InviteUserDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
  })
  @IsString()
  @MinLength(1, { message: 'First name cannot be empty' })
  @MaxLength(100, { message: 'First name cannot exceed 100 characters' })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1, { message: 'Last name cannot be empty' })
  @MaxLength(100, { message: 'Last name cannot exceed 100 characters' })
  lastName: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    enum: UserRole,
    example: UserRole.DEVELOPER,
  })
  @IsEnum(UserRole, { message: 'Please provide a valid user role' })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Custom permissions to assign to the user',
    type: [String],
    example: ['agent:create', 'tool:read'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Custom message to include in the invitation email',
    example: 'Welcome to our AI platform!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Message cannot exceed 500 characters' })
  message?: string;
}

export class ActivateUserDto {
  @ApiProperty({
    description: 'User ID to activate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  userId: string;
}

export class DeactivateUserDto {
  @ApiProperty({
    description: 'User ID to deactivate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  userId: string;

  @ApiPropertyOptional({
    description: 'Reason for deactivation',
    example: 'User requested account closure',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;
}

export class BulkUserActionDto {
  @ApiProperty({
    description: 'Array of user IDs to perform action on',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987fcdeb-51a2-43d1-9f12-345678901234',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({
    description: 'Action to perform',
    enum: ['activate', 'deactivate', 'delete'],
    example: 'activate',
  })
  @IsEnum(['activate', 'deactivate', 'delete'])
  action: 'activate' | 'deactivate' | 'delete';

  @ApiPropertyOptional({
    description: 'Reason for the action',
    example: 'Bulk activation after policy update',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;
}
