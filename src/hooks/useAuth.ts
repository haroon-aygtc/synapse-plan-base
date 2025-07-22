"use client";

import { useState, useEffect } from "react";
import { authService, AuthState } from "@/lib/auth";

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state);
    });

    // Get initial auth state
    setAuthState(authService.getAuthState());

    return unsubscribe;
  }, []);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    register: authService.register.bind(authService),
    refreshProfile: authService.refreshProfile.bind(authService),
  };
}
