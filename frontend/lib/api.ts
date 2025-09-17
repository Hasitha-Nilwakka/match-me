// API configuration and utility functions
// This file centralizes API-related configuration and provides reusable functions

// Get the API base URL from environment variables
export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  USERS: {
    GET_ALL: '/users',
    GET_ME: '/me',
    GET_BY_ID: (id: string) => `/users/${id}`,
  },
  // Add more endpoints as needed
} as const;

// Generic API request function
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${getApiUrl()}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
};

// Auth-specific API functions
export const authApi = {
  login: async (email: string, password: string) => {
    return apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (email: string, password: string) => {
    return apiRequest(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Client-side logout (clears localStorage)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Get current user data
  getCurrentUser: (): {id: number; email: string; isActive: boolean} | null => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },
};
