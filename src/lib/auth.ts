import { apiClient } from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

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

class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };
  private listeners: Array<(state: AuthState) => void> = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeAuth();
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async initializeAuth() {
    try {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        const user = JSON.parse(userStr);

        // Verify token is still valid by fetching profile
        try {
          const response = await apiClient.getProfile();
          if (response.success && response.data) {
            this.updateAuthState({
              user: response.data,
              isAuthenticated: true,
              isLoading: false,
            });
            // Update stored user data
            localStorage.setItem('user', JSON.stringify(response.data));
            return;
          }
        } catch (error) {
          // Token is invalid, clear storage
          this.clearAuthData();
        }
      }

      this.updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }

  private updateAuthState(newState: Partial<AuthState>) {
    this.authState = { ...this.authState, ...newState };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.authState));
  }

  private clearAuthData() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getAuthState(): AuthState {
    return this.authState;
  }

  async login(
    credentials: LoginCredentials,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateAuthState({ isLoading: true });

      const response = await apiClient.login(
        credentials.email,
        credentials.password,
      );

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;

        // Store tokens and user data
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        this.updateAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      } else {
        this.updateAuthState({ isLoading: false });
        return { success: false, error: response.message || 'Login failed' };
      }
    } catch (error: any) {
      this.updateAuthState({ isLoading: false });
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  async register(
    data: RegisterData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateAuthState({ isLoading: true });

      const response = await apiClient.register(data);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;

        // Store tokens and user data
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        this.updateAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      } else {
        this.updateAuthState({ isLoading: false });
        return {
          success: false,
          error: response.message || 'Registration failed',
        };
      }
    } catch (error: any) {
      this.updateAuthState({ isLoading: false });
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
      this.updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }

  async refreshProfile(): Promise<void> {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        this.updateAuthState({
          user: response.data,
        });
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  getUser(): User | null {
    return this.authState.user;
  }

  isLoading(): boolean {
    return this.authState.isLoading;
  }
}

export const authService = AuthService.getInstance();
