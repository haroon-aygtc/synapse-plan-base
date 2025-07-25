import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000');

// Token storage keys
const ACCESS_TOKEN_KEY = 'tempo_access_token';
const REFRESH_TOKEN_KEY = 'tempo_refresh_token';
const USER_DATA_KEY = 'tempo_user_data';
const ORG_DATA_KEY = 'tempo_org_data';

// Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  avatar?: string;
  permissions?: string[];
  preferences?: Record<string, any>;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings?: Record<string, any>;
  quotas?: Record<string, number>;
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/${API_VERSION}`,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token and organization context
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        const orgData = this.getOrganizationData();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (orgData?.id) {
          config.headers['X-Organization-ID'] = orgData.id;
        }

        // Add request ID for tracing
        config.headers['X-Request-ID'] = this.generateRequestId();

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh and errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.client(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshAccessToken();
            this.processQueue(null, newToken);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.clearAuthData();
            window.location.href = '/auth/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other errors
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private handleApiError(error: AxiosError): ApiError {
    const response = error.response;
    const data = response?.data as any;

    return {
      message: data?.message || error.message || 'An unexpected error occurred',
      code: data?.code || 'UNKNOWN_ERROR',
      statusCode: response?.status || 500,
      details: data?.details || null,
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Token management
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  private clearAuthData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(ORG_DATA_KEY);
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/api/${API_VERSION}/auth/refresh`, {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data.data;
    
    this.setTokens({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    });

    return accessToken;
  }

  // User data management
  public getUserData(): User | null {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  public setUserData(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  }

  public getOrganizationData(): Organization | null {
    if (typeof window === 'undefined') return null;
    const orgData = localStorage.getItem(ORG_DATA_KEY);
    return orgData ? JSON.parse(orgData) : null;
  }

  public setOrganizationData(org: Organization): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ORG_DATA_KEY, JSON.stringify(org));
  }

  // Authentication methods
  public async login(email: string, password: string): Promise<{ user: User; organization: Organization; tokens: AuthTokens }> {
    const response = await this.client.post<ApiResponse<{
      user: User;
      organization: Organization;
      tokens: AuthTokens;
    }>>('/auth/login', { email, password });

    const { user, organization, tokens } = response.data.data;
    
    this.setTokens(tokens);
    this.setUserData(user);
    this.setOrganizationData(organization);

    return { user, organization, tokens };
  }

  public async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
  }): Promise<{ user: User; organization: Organization; tokens: AuthTokens }> {
    const response = await this.client.post<ApiResponse<{
      user: User;
      organization: Organization;
      tokens: AuthTokens;
    }>>('/auth/register', userData);

    const { user, organization, tokens } = response.data.data;
    
    this.setTokens(tokens);
    this.setUserData(user);
    this.setOrganizationData(organization);

    return { user, organization, tokens };
  }

  public async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  public async getCurrentUser(): Promise<User> {
    const response = await this.client.get<ApiResponse<User>>('/auth/me');
    const user = response.data.data;
    this.setUserData(user);
    return user;
  }

  // Generic API methods
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // File upload method
  public async uploadFile(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // Health check
  public async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get<ApiResponse<{ status: string; timestamp: string }>>('/health');
    return response.data.data;
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Get current organization ID
  public getCurrentOrganizationId(): string | null {
    const org = this.getOrganizationData();
    return org?.id || null;
  }

  // Set organization context (for multi-tenant switching)
  public setOrganizationContext(organizationId: string): void {
    const orgData = this.getOrganizationData();
    if (orgData) {
      orgData.id = organizationId;
      this.setOrganizationData(orgData);
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;

// Export specific API modules
export * from './agent-api';
export * from './tool-api';
export * from './workflow-api';
export * from './widget-api';
export * from './knowledge-api';
export * from './prompt-template-api';
export * from './user-api';
export * from './analytics-api';