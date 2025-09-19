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
  PROFILE: {
    GET_ME: '/me/profile',
    UPDATE_ME: '/me/profile',
    GET_BY_ID: (id: string) => `/users/${id}/profile`,
  },
  REFERENCE: {
    LANGUAGES: '/languages',
    HOBBIES: '/hobbies',
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

// Authenticated API request function
export const authenticatedApiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiRequest(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
};

// Reference data API functions
export const referenceApi = {
  // Get all available languages
  getLanguages: async (): Promise<string[]> => {
    const response = await apiRequest(API_ENDPOINTS.REFERENCE.LANGUAGES);
    if (!response.ok) {
      throw new Error('Failed to fetch languages');
    }
    const data = await response.json();
    return data.languages;
  },

  // Get all available hobbies
  getHobbies: async (): Promise<string[]> => {
    const response = await apiRequest(API_ENDPOINTS.REFERENCE.HOBBIES);
    if (!response.ok) {
      throw new Error('Failed to fetch hobbies');
    }
    const data = await response.json();
    return data.hobbies;
  },
};

// External API functions for countries
export const externalApi = {
  // Get all countries from REST Countries API
  getCountries: async (): Promise<{ name: string; code: string }[]> => {
    try {
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
      if (!response.ok) {
        throw new Error('Failed to fetch countries');
      }
      const data = await response.json();
      return data.map((country: { name: { common: string }; cca2: string }) => ({
        name: country.name.common,
        code: country.cca2
      })).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching countries:', error);
      // Fallback to a comprehensive list of countries
      return [
        { name: 'Afghanistan', code: 'AF' },
        { name: 'Albania', code: 'AL' },
        { name: 'Algeria', code: 'DZ' },
        { name: 'Argentina', code: 'AR' },
        { name: 'Armenia', code: 'AM' },
        { name: 'Australia', code: 'AU' },
        { name: 'Austria', code: 'AT' },
        { name: 'Azerbaijan', code: 'AZ' },
        { name: 'Bangladesh', code: 'BD' },
        { name: 'Belarus', code: 'BY' },
        { name: 'Belgium', code: 'BE' },
        { name: 'Brazil', code: 'BR' },
        { name: 'Bulgaria', code: 'BG' },
        { name: 'Cambodia', code: 'KH' },
        { name: 'Canada', code: 'CA' },
        { name: 'Chile', code: 'CL' },
        { name: 'China', code: 'CN' },
        { name: 'Colombia', code: 'CO' },
        { name: 'Croatia', code: 'HR' },
        { name: 'Czech Republic', code: 'CZ' },
        { name: 'Denmark', code: 'DK' },
        { name: 'Egypt', code: 'EG' },
        { name: 'Estonia', code: 'EE' },
        { name: 'Finland', code: 'FI' },
        { name: 'France', code: 'FR' },
        { name: 'Georgia', code: 'GE' },
        { name: 'Germany', code: 'DE' },
        { name: 'Greece', code: 'GR' },
        { name: 'Hungary', code: 'HU' },
        { name: 'Iceland', code: 'IS' },
        { name: 'India', code: 'IN' },
        { name: 'Indonesia', code: 'ID' },
        { name: 'Ireland', code: 'IE' },
        { name: 'Israel', code: 'IL' },
        { name: 'Italy', code: 'IT' },
        { name: 'Japan', code: 'JP' },
        { name: 'Kazakhstan', code: 'KZ' },
        { name: 'Kenya', code: 'KE' },
        { name: 'Latvia', code: 'LV' },
        { name: 'Lithuania', code: 'LT' },
        { name: 'Luxembourg', code: 'LU' },
        { name: 'Malaysia', code: 'MY' },
        { name: 'Mexico', code: 'MX' },
        { name: 'Netherlands', code: 'NL' },
        { name: 'New Zealand', code: 'NZ' },
        { name: 'Norway', code: 'NO' },
        { name: 'Pakistan', code: 'PK' },
        { name: 'Philippines', code: 'PH' },
        { name: 'Poland', code: 'PL' },
        { name: 'Portugal', code: 'PT' },
        { name: 'Romania', code: 'RO' },
        { name: 'Russia', code: 'RU' },
        { name: 'Saudi Arabia', code: 'SA' },
        { name: 'Singapore', code: 'SG' },
        { name: 'Slovakia', code: 'SK' },
        { name: 'Slovenia', code: 'SI' },
        { name: 'South Africa', code: 'ZA' },
        { name: 'South Korea', code: 'KR' },
        { name: 'Spain', code: 'ES' },
        { name: 'Sweden', code: 'SE' },
        { name: 'Switzerland', code: 'CH' },
        { name: 'Thailand', code: 'TH' },
        { name: 'Turkey', code: 'TR' },
        { name: 'Ukraine', code: 'UA' },
        { name: 'United Arab Emirates', code: 'AE' },
        { name: 'United Kingdom', code: 'GB' },
        { name: 'United States', code: 'US' },
        { name: 'Vietnam', code: 'VN' }
      ];
    }
  }
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

// Profile-specific API functions
export const profileApi = {
  // Get current user's profile
  getMyProfile: async () => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.PROFILE.GET_ME);
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    return response.json();
  },

  // Update current user's profile
  updateMyProfile: async (profileData: {
    firstName?: string;
    lastName?: string;
    gender?: string;
    status?: string;
    relationshipStatus?: string;
    aboutMe?: string;
    ethnicity?: string;
    religion?: string;
    profilePictureURL?: string;
    languages?: string[];
  }) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.PROFILE.UPDATE_ME, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    return response.json();
  },

  // Get current user's location
  getMyLocation: async () => {
    const response = await authenticatedApiRequest('/me/location');
    if (!response.ok) {
      throw new Error('Failed to fetch location');
    }
    return response.json();
  },

  // Update current user's location
  updateMyLocation: async (locationData: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const response = await authenticatedApiRequest('/me/location', {
      method: 'PUT',
      body: JSON.stringify(locationData),
    });
    if (!response.ok) {
      throw new Error('Failed to update location');
    }
    return response.json();
  },

  // Get other user's profile
  getUserProfile: async (userId: string) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.PROFILE.GET_BY_ID(userId));
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return response.json();
  },
};
