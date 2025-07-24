export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  organizationId: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  lastLoginAt?: Date;
  avatar?: string;
  preferences?: Record<string, any>;
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
  organization?: IOrganization;
}

export interface IOrganization {
  id: string;
  name: string;
  domain?: string;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  users?: IUser[];
}

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
