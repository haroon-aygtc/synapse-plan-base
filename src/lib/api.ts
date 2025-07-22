import axios from 'axios';
import { getToken } from './auth';

// Create an axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh token
        const refreshedToken = await refreshToken();
        if (refreshedToken) {
          originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, redirect to login
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Function to refresh token
async function refreshToken() {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
      {},
      {
        withCredentials: true, // Important for cookies
      }
    );
    
    if (response.data.success && response.data.data.accessToken) {
      return response.data.data.accessToken;
    }
    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

export { api };
