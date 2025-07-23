/**
 * Authentication Module
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import { User, Organization, UserRole, APIResponse, AuthState } from "../types";
import { AuthenticationError, ValidationError } from "../errors";
import { isValidEmail, validatePassword } from "../utils";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  session: {
    sessionToken: string;
    expiresAt: string;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  preferences?: Record<string, any>;
}

/**
 * Authentication module for user management and session handling
 */
export class AuthModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/auth");
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    this.validateRequired(credentials, ["email", "password"]);

    if (!isValidEmail(credentials.email)) {
      throw new ValidationError(
        "Invalid email format",
        "email",
        "valid email",
        credentials.email,
      );
    }

    try {
      const response = await this.post<LoginResponse>("/login", credentials);

      if (response.success && response.data) {
        // Update client auth state
        this.client.updateAuthState({
          isAuthenticated: true,
          user: response.data.user,
          organization: response.data.user.organization || null,
          permissions: [], // Will be populated from user role
          tokenExpiresAt: new Date(
            Date.now() + this.parseExpiresIn(response.data.expiresIn),
          ),
        });

        // Update client config with new token
        this.client.updateConfig({ apiKey: response.data.accessToken });

        this.emit("auth:login", response.data);
        this.debug("User logged in successfully", {
          userId: response.data.user.id,
        });

        return response.data;
      }

      throw new AuthenticationError("Login failed: Invalid response");
    } catch (error) {
      this.debug("Login failed", error);
      throw error instanceof AuthenticationError
        ? error
        : new AuthenticationError("Login failed");
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<LoginResponse> {
    this.validateRequired(data, ["email", "password", "firstName", "lastName"]);

    if (!isValidEmail(data.email)) {
      throw new ValidationError(
        "Invalid email format",
        "email",
        "valid email",
        data.email,
      );
    }

    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`,
        "password",
        "strong password",
        "[REDACTED]",
      );
    }

    try {
      const response = await this.post<LoginResponse>("/register", data);

      if (response.success && response.data) {
        // Update client auth state
        this.client.updateAuthState({
          isAuthenticated: true,
          user: response.data.user,
          organization: response.data.user.organization || null,
          permissions: [],
          tokenExpiresAt: new Date(
            Date.now() + this.parseExpiresIn(response.data.expiresIn),
          ),
        });

        // Update client config with new token
        this.client.updateConfig({ apiKey: response.data.accessToken });

        this.emit("auth:register", response.data);
        this.debug("User registered successfully", {
          userId: response.data.user.id,
        });

        return response.data;
      }

      throw new AuthenticationError("Registration failed: Invalid response");
    } catch (error) {
      this.debug("Registration failed", error);
      throw error instanceof AuthenticationError
        ? error
        : new AuthenticationError("Registration failed");
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await this.post("/logout");
    } catch (error) {
      // Continue with logout even if API call fails
      this.debug("Logout API call failed", error);
    }

    // Clear client auth state
    this.client.updateAuthState({
      isAuthenticated: false,
      user: null,
      organization: null,
      permissions: [],
      tokenExpiresAt: undefined,
    });

    // Clear client config token
    this.client.updateConfig({ apiKey: "" });

    this.emit("auth:logout");
    this.debug("User logged out");
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    this.validateRequired({ refreshToken }, ["refreshToken"]);

    try {
      const response = await this.post<RefreshTokenResponse>("/refresh", {
        refreshToken,
      });

      if (response.success && response.data) {
        // Update client config with new token
        this.client.updateConfig({ apiKey: response.data.accessToken });

        // Update token expiration in auth state
        const currentAuthState = this.client.getAuthState();
        this.client.updateAuthState({
          ...currentAuthState,
          tokenExpiresAt: new Date(
            Date.now() + this.parseExpiresIn(response.data.expiresIn),
          ),
        });

        this.emit("auth:token_refreshed", response.data);
        this.debug("Token refreshed successfully");

        return response.data;
      }

      throw new AuthenticationError("Token refresh failed: Invalid response");
    } catch (error) {
      this.debug("Token refresh failed", error);
      throw error instanceof AuthenticationError
        ? error
        : new AuthenticationError("Token refresh failed");
    }
  }

  /**
   * Validate current token
   */
  async validateToken(token?: string): Promise<User> {
    const tokenToValidate = token || this.client.getConfig().apiKey;

    if (!tokenToValidate) {
      throw new AuthenticationError("No token provided for validation");
    }

    try {
      const response = await this.get<User>("/validate", {
        headers: { Authorization: `Bearer ${tokenToValidate}` },
      });

      if (response.success && response.data) {
        // Update client auth state if validating current token
        if (!token || token === this.client.getConfig().apiKey) {
          this.client.updateAuthState({
            isAuthenticated: true,
            user: response.data,
            organization: response.data.organization || null,
            permissions: [],
          });
        }

        this.debug("Token validated successfully", {
          userId: response.data.id,
        });
        return response.data;
      }

      throw new AuthenticationError(
        "Token validation failed: Invalid response",
      );
    } catch (error) {
      this.debug("Token validation failed", error);
      throw error instanceof AuthenticationError
        ? error
        : new AuthenticationError("Token validation failed");
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    if (!this.isAuthenticated()) {
      throw new AuthenticationError("User not authenticated");
    }

    try {
      const response = await this.get<User>("/profile");

      if (response.success && response.data) {
        // Update auth state with fresh user data
        const currentAuthState = this.client.getAuthState();
        this.client.updateAuthState({
          ...currentAuthState,
          user: response.data,
          organization: response.data.organization || null,
        });

        this.debug("Profile retrieved successfully", {
          userId: response.data.id,
        });
        return response.data;
      }

      throw new AuthenticationError("Failed to retrieve profile");
    } catch (error) {
      this.debug("Profile retrieval failed", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UpdateProfileRequest): Promise<User> {
    if (!this.isAuthenticated()) {
      throw new AuthenticationError("User not authenticated");
    }

    try {
      const response = await this.patch<User>("/profile", updates);

      if (response.success && response.data) {
        // Update auth state with updated user data
        const currentAuthState = this.client.getAuthState();
        this.client.updateAuthState({
          ...currentAuthState,
          user: response.data,
        });

        this.emit("auth:profile_updated", response.data);
        this.debug("Profile updated successfully", {
          userId: response.data.id,
        });

        return response.data;
      }

      throw new Error("Failed to update profile");
    } catch (error) {
      this.debug("Profile update failed", error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(request: ChangePasswordRequest): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new AuthenticationError("User not authenticated");
    }

    this.validateRequired(request, ["currentPassword", "newPassword"]);

    const passwordValidation = validatePassword(request.newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`,
        "newPassword",
        "strong password",
        "[REDACTED]",
      );
    }

    try {
      const response = await this.post("/change-password", {
        currentPassword: request.currentPassword,
        newPassword: request.newPassword,
      });

      if (response.success) {
        this.emit("auth:password_changed");
        this.debug("Password changed successfully");
      } else {
        throw new Error("Failed to change password");
      }
    } catch (error) {
      this.debug("Password change failed", error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    this.validateRequired(request, ["email"]);

    if (!isValidEmail(request.email)) {
      throw new ValidationError(
        "Invalid email format",
        "email",
        "valid email",
        request.email,
      );
    }

    try {
      const response = await this.post("/reset-password", request);

      if (response.success) {
        this.emit("auth:password_reset_requested", { email: request.email });
        this.debug("Password reset requested", { email: request.email });
      } else {
        throw new Error("Failed to request password reset");
      }
    } catch (error) {
      this.debug("Password reset request failed", error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(request: PasswordReset): Promise<void> {
    this.validateRequired(request, ["token", "newPassword"]);

    const passwordValidation = validatePassword(request.newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`,
        "newPassword",
        "strong password",
        "[REDACTED]",
      );
    }

    try {
      const response = await this.post("/reset-password/confirm", {
        token: request.token,
        newPassword: request.newPassword,
      });

      if (response.success) {
        this.emit("auth:password_reset");
        this.debug("Password reset successfully");
      } else {
        throw new Error("Failed to reset password");
      }
    } catch (error) {
      this.debug("Password reset failed", error);
      throw error;
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return this.client.getAuthState();
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Check if user is admin (ORG_ADMIN or SUPER_ADMIN)
   */
  isAdmin(): boolean {
    return this.hasAnyRole([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]);
  }

  /**
   * Check if user is super admin
   */
  isSuperAdmin(): boolean {
    return this.hasRole(UserRole.SUPER_ADMIN);
  }

  // Private helper methods

  private parseExpiresIn(expiresIn: string): number {
    // Parse expiration time (e.g., "15m", "1h", "7d")
    const match = expiresIn.match(/(\d+)([smhd])/);
    if (!match) return 15 * 60 * 1000; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }
}
