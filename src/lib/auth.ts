import axios from 'axios';

// Token storage keys
const ACCESS_TOKEN_KEY = 'synapse_access_token';
const REFRESH_TOKEN_KEY = 'synapse_refresh_token';
const USER_KEY = 'synapse_user';

// Auth state interface
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  isActive: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// Get token from localStorage
export async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

// Set tokens in localStorage
export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

// Clear tokens from localStorage
export function clearTokens(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Get user from localStorage
export function getUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) {
    return null;
  }
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
    return null;
  }
}

// Set user in localStorage
export function setUser(user: User): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getToken();
}

// Get current auth state
export function getAuthState(): AuthState {
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  const user = getUser();

  return {
    isAuthenticated: !!accessToken,
    user,
    accessToken,
    refreshToken,
  };
}

// Login function
export async function login(email: string, password: string): Promise<AuthState> {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/login`,
      { email, password }
    );

    if (response.data.success) {
      const { accessToken, refreshToken, user } = response.data.data;
      setTokens(accessToken, refreshToken);
      setUser(user);
      return {
        isAuthenticated: true,
        user,
        accessToken,
        refreshToken,
      };
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    clearTokens();
    throw error;
  }
}

// Register function
export async function register(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}): Promise<AuthState> {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/register`,
      userData
    );

    if (response.data.success) {
      const { accessToken, refreshToken, user } = response.data.data;
      setTokens(accessToken, refreshToken);
      setUser(user);
      return {
        isAuthenticated: true,
        user,
        accessToken,
        refreshToken,
      };
    } else {
      throw new Error(response.data.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    clearTokens();
    throw error;
  }
}

// Logout function
export async function logout(): Promise<void> {
  try {
    const token = await getToken();
    if (token) {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearTokens();
  }
}

// Auth service interface for UI components
interface AuthServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Auth service object that wraps the functions with consistent response format
export const authService = {
  async login(credentials: { email: string; password: string }): Promise<AuthServiceResponse<AuthState>> {
    try {
      const authState = await login(credentials.email, credentials.password);
      return {
        success: true,
        data: authState,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  },

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
  }): Promise<AuthServiceResponse<AuthState>> {
    try {
      const authState = await register(userData);
      return {
        success: true,
        data: authState,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Registration failed',
      };
    }
  },

  async logout(): Promise<AuthServiceResponse<void>> {
    try {
      await logout();
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Logout failed',
      };
    }
  },

  // Additional utility methods
  getAuthState,
  getUser,
  isAuthenticated,
  getToken,
  clearTokens,
};
