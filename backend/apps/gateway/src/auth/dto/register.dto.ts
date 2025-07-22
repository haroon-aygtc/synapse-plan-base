import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    maxLength: 100,
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    maxLength: 100,
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'Organization name (optional, will create new organization)',
    example: 'Acme Corporation',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Organization name must be a string' })
  @MaxLength(255, {
    message: 'Organization name must not exceed 255 characters',
  })
  organizationName?: string;
}
