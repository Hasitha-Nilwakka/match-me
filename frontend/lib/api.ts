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
    GET_BIographical: '/me/biographical',
    UPDATE_BIographical: '/me/biographical',
    UPDATE_SEEKING_PREFERENCES: '/me/seeking-preferences',
    GET_SEEKING_PREFERENCES: '/me/seeking-preferences',
  },
  REFERENCE: {
    LANGUAGES: '/languages',
    HOBBIES: '/hobbies',
    INTERESTS: '/interests',
    FOOD_PREFERENCES: '/food-preferences',
    MUSIC_GENRES: '/music-genres',
    MOVIE_GENRES: '/movie-genres',
    TRAVEL_TYPES: '/travel-types',
  },
  CHATS: {
    GET_ALL: '/chats',
    GET_MESSAGES: (chatId: string) => `/chats/${chatId}/messages`,
    SEND_MESSAGE: (chatId: string) => `/chats/${chatId}/messages`,
    MARK_READ: (chatId: string) => `/chats/${chatId}/read`,
    DELETE: (chatId: string) => `/chats/${chatId}`,
    WEBSOCKET: (chatId: string) => `/chats/${chatId}/ws`,
  },
  RECOMMENDATIONS: {
    GET_ALL: '/recommendations',
    LIKE: (id: string) => `/recommendations/${id}/like`,
    DISMISS: (id: string) => `/recommendations/${id}/dismiss`,
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
  console.log('Authenticated request to:', endpoint, 'Token exists:', !!token);
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

  // Get all available interests
  getInterests: async (): Promise<string[]> => {
    const response = await apiRequest(API_ENDPOINTS.REFERENCE.INTERESTS);
    if (!response.ok) {
      throw new Error('Failed to fetch interests');
    }
    const data = await response.json();
    return data.interests;
  },

  // Get all available food preferences
  getFoodPreferences: async (): Promise<string[]> => {
    const response = await apiRequest(API_ENDPOINTS.REFERENCE.FOOD_PREFERENCES);
    if (!response.ok) {
      throw new Error('Failed to fetch food preferences');
    }
    const data = await response.json();
    return data.foodPreferences;
  },

  // Get all available music genres
  getMusicGenres: async (): Promise<string[]> => {
    const response = await apiRequest(API_ENDPOINTS.REFERENCE.MUSIC_GENRES);
    if (!response.ok) {
      throw new Error('Failed to fetch music genres');
    }
    const data = await response.json();
    return data.musicGenres;
  },

  // Get all available movie genres
  getMovieGenres: async (): Promise<string[]> => {
    const response = await apiRequest(API_ENDPOINTS.REFERENCE.MOVIE_GENRES);
    if (!response.ok) {
      throw new Error('Failed to fetch movie genres');
    }
    const data = await response.json();
    return data.movieGenres;
  },

  // Get all available travel types
  getTravelTypes: async (): Promise<string[]> => {
    const response = await apiRequest(API_ENDPOINTS.REFERENCE.TRAVEL_TYPES);
    if (!response.ok) {
      throw new Error('Failed to fetch travel types');
    }
    const data = await response.json();
    return data.travelTypes;
  },
};

// Chat API functions
export const chatApi = {
  // Get all user's chats
  getAllChats: async () => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CHATS.GET_ALL);
    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }
    return response.json();
  },

  // Get messages for a specific chat
  getChatMessages: async (chatId: string, page = 1, limit = 50) => {
    const response = await authenticatedApiRequest(
      `${API_ENDPOINTS.CHATS.GET_MESSAGES(chatId)}?page=${page}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch chat messages');
    }
    return response.json();
  },

  // Send a message
  sendMessage: async (chatId: string, content: string) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CHATS.SEND_MESSAGE(chatId), {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  // Mark messages as read
  markAsRead: async (chatId: string) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CHATS.MARK_READ(chatId), {
      method: 'PUT',
    });
    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }
    return response.json();
  },

  // Delete a chat and all its messages
  deleteChat: async (chatId: string) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CHATS.DELETE(chatId), {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete chat');
    }
    return response.json();
  },

  // Create WebSocket connection
  createWebSocketConnection: (chatId: string, onMessage: (message: unknown) => void) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Use the same base URL as API calls, but convert to WebSocket protocol
    const baseUrl = getApiUrl();
    const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + `/chats/${chatId}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected to chat', chatId);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected from chat', chatId);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  },
};

// Recommendations API functions
export const recommendationsApi = {
  // Get recommendations for the current user
  getRecommendations: async () => {
    try {
      console.log('API: Fetching recommendations...');
      const response = await authenticatedApiRequest(API_ENDPOINTS.RECOMMENDATIONS.GET_ALL);
      console.log('API: Recommendations response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Recommendations API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: `${getApiUrl()}${API_ENDPOINTS.RECOMMENDATIONS.GET_ALL}`
        });
        throw new Error(`Failed to fetch recommendations: ${response.status} ${response.statusText}${errorText ? ' - ' + errorText : ''}`);
      }
      return response.json();
    } catch (error) {
      console.error('Recommendations fetch error:', error);
      throw error;
    }
  },

  // Like a recommendation (send connection request)
  likeRecommendation: async (userId: string) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.RECOMMENDATIONS.LIKE(userId), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to like recommendation');
    }
    return response.json();
  },

  // Dismiss a recommendation
  dismissRecommendation: async (userId: string) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.RECOMMENDATIONS.DISMISS(userId), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to dismiss recommendation');
    }
    return response.json();
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
    console.log('API: Updating profile with data:', profileData);
    const response = await authenticatedApiRequest(API_ENDPOINTS.PROFILE.UPDATE_ME, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    console.log('API: Profile update response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API: Profile update failed:', errorText);
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

  // Get biographical data
  getBiographicalData: async () => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.PROFILE.GET_BIographical);
    if (!response.ok) {
      throw new Error('Failed to fetch biographical data');
    }
    return response.json();
  },

  // Update biographical data
  updateBiographicalData: async (data: {
    interests: string[];
    hobbies: string[];
    foodPreferences: string[];
    musicGenres: string[];
    movieGenres: string[];
    travelTypes: string[];
  }) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.PROFILE.UPDATE_BIographical, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update biographical data');
    }
    return response.json();
  },

  // Update seeking preferences
  updateSeekingPreferences: async (data: {
    genderPreference?: string;
    statusPreference?: string;
    relationshipPreference?: string;
    locationPreference: string;
    ethnicityPreference?: string;
    religionPreference?: string;
    // Multiple preference values
    interestsPreference?: string[];
    hobbiesPreference?: string[];
    foodPreferencesPreference?: string[];
    musicGenresPreference?: string[];
    movieGenresPreference?: string[];
    travelTypesPreference?: string[];
    languagesPreference?: string[];
    // Weight values
    genderWeight: number;
    statusWeight: number;
    relationshipWeight: number;
    locationWeight: number;
    languagesWeight: number;
    interestsWeight: number;
    hobbiesWeight: number;
    foodPreferencesWeight: number;
    musicGenresWeight: number;
    movieGenresWeight: number;
    travelTypesWeight: number;
    ethnicityWeight: number;
    religionWeight: number;
  }) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.PROFILE.UPDATE_SEEKING_PREFERENCES, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update seeking preferences');
    }
    return response.json();
  },

  // Get seeking preferences
  getSeekingPreferences: async () => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.PROFILE.GET_SEEKING_PREFERENCES, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error('Failed to get seeking preferences');
    }
    return response.json();
  },
};
