"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  getAuthState, 
  login as authLogin, 
  logout as authLogout, 
  register as authRegister,
  getUser,
  isAuthenticated as checkIsAuthenticated,
  setUser
} from "@/lib/auth";
import axios from "axios";

export interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Function to refresh the auth state
  const refreshAuthState = useCallback(() => {
    const state = getAuthState();
    setAuthState({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      isLoading: false,
    });
  }, []);

  // Initialize auth state
  useEffect(() => {
    refreshAuthState();
  }, [refreshAuthState]);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    try {
      await authLogin(email, password);
      refreshAuthState();
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Login failed" 
      };
    }
  }, [refreshAuthState]);

  // Register function
  const register = useCallback(async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
  }) => {
    try {
      await authRegister(userData);
      refreshAuthState();
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Registration failed" 
      };
    }
  }, [refreshAuthState]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authLogout();
      refreshAuthState();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [refreshAuthState]);

  // Refresh profile function
  const refreshProfile = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('synapse_access_token');
      
      if (!token) {
        return;
      }
      
      const response = await axios.get(`${apiUrl}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.data) {
        setUser(response.data.data);
        refreshAuthState();
      }
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  }, [refreshAuthState]);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    logout,
    register,
    refreshProfile,
  };
}
