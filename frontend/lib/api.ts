// API configuration and utility functions
// This file centralizes API-related configuration and provides reusable functions

// NEW FUNCTION: Get API URL with fresh logic
export const getApiUrlNew = (): string => {
  console.log('[API] getApiUrlNew called at:', new Date().toISOString());

  // 1) Prefer explicit env override
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    console.log('[API] Using NEXT_PUBLIC_API_URL:', envUrl);
    return envUrl;
  }

  // 2) Derive from browser location (works across LAN/devices)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname; // e.g. localhost or 192.168.x.x
    const derived = `http://${host}:8080`;
    console.log('[API] Derived API URL from window.location:', derived);
    return derived;
  }

  // 3) Fallback for SSR/build
  const fallback = 'http://localhost:8080';
  console.log('[API] Fallback API URL:', fallback);
  return fallback;
};

// Get the API base URL from environment variables
export const getApiUrl = (): string => {
  console.log('[API] getApiUrl called at:', new Date().toISOString());
  
  // Use the new function instead
  return getApiUrlNew();
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
    UPDATE_SEEKING_PREFERENCES: '/me/preferences',
    GET_SEEKING_PREFERENCES: '/me/preferences',
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
    CREATE: '/chats',
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
  CONNECTIONS: {
    GET_ALL: '/connections',
    GET_REQUESTS: '/connections/requests',
    GET_MATCHES: '/connections/matches',
    UPDATE: (id: string) => `/connections/${id}`,
    DELETE: (id: string) => `/connections/${id}`,
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

  console.log('[API] Making request to:', url);
  console.log('[API] Request options:', { ...defaultOptions, ...options });
  console.log('[API] Current location:', typeof window !== 'undefined' ? window.location.href : 'server-side');

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    console.log('[API] Response status:', response.status);
    console.log('[API] Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('[API] Response not OK:', response.status, response.statusText);
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error('[API] Error response body:', errorText);
    }
    
    return response;
  } catch (error) {
    console.error('[API] Fetch error:', error);
    console.error('[API] URL was:', url);
    console.error('[API] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[API] Error message:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

// Authenticated API request function
export const authenticatedApiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = localStorage.getItem('token');
  console.log('Authenticated request to:', endpoint, 'Token exists:', !!token);
  if (!token) {
    console.error('No authentication token found. User may need to log in again.');
    throw new Error('No authentication token found. Please log in again.');
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

  // Create a new chat with a user
  createChat: async (userId: number) => {
    console.log('[API] createChat called with userId:', userId);
    console.log('[API] Making POST request to:', API_ENDPOINTS.CHATS.CREATE);
    const response = await authenticatedApiRequest(API_ENDPOINTS.CHATS.CREATE, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    console.log('[API] createChat response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Failed to create chat';
      console.error('[API] createChat error:', errorMessage);
      throw new Error(errorMessage);
    }
    const result = await response.json();
    console.log('[API] createChat success:', result);
    return result;
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
  createWebSocketConnection: (chatId: string, onMessage: (message: unknown) => void, onTyping?: (data: unknown) => void) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Use the same base URL as API calls, but convert to WebSocket protocol
    const baseUrl = getApiUrl();
    const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + `/chats/${chatId}/ws?token=${encodeURIComponent(token)}`;
    
    console.log('[API] Creating WebSocket connection to:', wsUrl);
    console.log('[API] Token length:', token.length);
    console.log('[API] Chat ID:', chatId);
    console.log('[API] Base URL:', baseUrl);
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[API] WebSocket connected to chat', chatId);
      // Send authentication token after connection opens
      ws.send(JSON.stringify({ type: 'auth', token: token }));
      console.log('[API] Sent auth token via WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[API] WebSocket message received:', data);
        
        // Handle different message types
        if (data.type === 'typing') {
          onTyping?.(data);
        } else {
          onMessage(data);
        }
      } catch (error) {
        console.error('[API] Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('[API] WebSocket disconnected from chat', chatId, 'Code:', event.code, 'Reason:', event.reason);
      console.log('[API] WebSocket close was clean:', event.wasClean);
    };

    ws.onerror = (error) => {
      console.error('[API] WebSocket error:', error);
      console.error('[API] WebSocket ready state:', ws.readyState);
      console.error('[API] WebSocket URL:', wsUrl);
    };

    // Add a timeout to detect if connection never opens
    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.error('[API] WebSocket connection timeout - still connecting after 5 seconds');
        console.error('[API] WebSocket URL:', wsUrl);
        console.error('[API] WebSocket ready state:', ws.readyState);
      }
    }, 5000);

    return ws;
  },

  // Send typing indicator
  sendTypingIndicator: (ws: WebSocket, isTyping: boolean) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'typing', 
        isTyping: isTyping 
      }));
    }
  },
};

// Connections API functions
export const connectionsApi = {
  // Get all user's connections
  getConnections: async () => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CONNECTIONS.GET_ALL);
    if (!response.ok) {
      throw new Error('Failed to fetch connections');
    }
    return response.json();
  },

  // Get connection requests
  getConnectionRequests: async () => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CONNECTIONS.GET_REQUESTS);
    if (!response.ok) {
      throw new Error('Failed to fetch connection requests');
    }
    return response.json();
  },

  // Get count of pending connection requests (lightweight consumer utility)
  getConnectionRequestsCount: async (): Promise<number> => {
    try {
      const data = await connectionsApi.getConnectionRequests();
      const requests = Array.isArray(data) ? data : (data?.requests || []);
      return requests.length || 0;
    } catch {
      return 0;
    }
  },

  // Get matches
  getMatches: async () => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CONNECTIONS.GET_MATCHES);
    if (!response.ok) {
      throw new Error('Failed to fetch matches');
    }
    return response.json();
  },

  // Accept a connection request
  acceptConnection: async (connectionId: string) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CONNECTIONS.UPDATE(connectionId), {
      method: 'PUT',
      body: JSON.stringify({ status: 'accepted' }),
    });
    if (!response.ok) {
      throw new Error('Failed to accept connection');
    }
    return response.json();
  },

  // Reject a connection request
  rejectConnection: async (connectionId: string) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CONNECTIONS.UPDATE(connectionId), {
      method: 'PUT',
      body: JSON.stringify({ status: 'rejected' }),
    });
    if (!response.ok) {
      throw new Error('Failed to reject connection');
    }
    return response.json();
  },

  // Delete a connection
  deleteConnection: async (connectionId: string) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CONNECTIONS.DELETE(connectionId), {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete connection');
    }
    return response.json();
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

// External API functions for countries and cities
export const externalApi = {
  // Get Nordic countries only
  getCountries: async (): Promise<{ name: string; code: string }[]> => {
    console.log('Loading Nordic countries...');
    // Return only Nordic countries
    const nordicCountries = [
      { name: 'Denmark', code: 'DK' },
      { name: 'Finland', code: 'FI' },
      { name: 'Iceland', code: 'IS' },
      { name: 'Norway', code: 'NO' },
      { name: 'Sweden', code: 'SE' }
    ];
    console.log('Loaded Nordic countries:', nordicCountries.length);
    return nordicCountries;
  },

  // Get cities for Nordic countries (hardcoded)
  getCitiesByCountry: async (countryCode: string): Promise<{ name: string; population?: number }[]> => {
    console.log('Loading cities for Nordic country:', countryCode);
    
    // Hardcoded cities for Nordic countries
    const nordicCities: { [key: string]: { name: string; population?: number }[] } = {
      'DK': [
        { name: 'Copenhagen', population: 632340 },
        { name: 'Aarhus', population: 285273 },
        { name: 'Odense', population: 180863 },
        { name: 'Aalborg', population: 119862 },
        { name: 'Esbjerg', population: 72330 },
        { name: 'Randers', population: 62804 },
        { name: 'Kolding', population: 61021 },
        { name: 'Horsens', population: 61074 },
        { name: 'Vejle', population: 58059 },
        { name: 'Roskilde', population: 51285 },
        { name: 'Herning', population: 50032 },
        { name: 'Silkeborg', population: 44426 },
        { name: 'Næstved', population: 43234 },
        { name: 'Fredericia', population: 40890 },
        { name: 'Viborg', population: 40122 },
        { name: 'Køge', population: 38069 },
        { name: 'Holstebro', population: 36020 },
        { name: 'Taastrup', population: 33333 },
        { name: 'Slagelse', population: 33000 },
        { name: 'Hillerød', population: 32000 }
      ],
      'FI': [
        { name: 'Helsinki', population: 656229 },
        { name: 'Espoo', population: 293017 },
        { name: 'Tampere', population: 244223 },
        { name: 'Vantaa', population: 238857 },
        { name: 'Turku', population: 194244 },
        { name: 'Oulu', population: 208939 },
        { name: 'Jyväskylä', population: 143400 },
        { name: 'Lahti', population: 120112 },
        { name: 'Kuopio', population: 120306 },
        { name: 'Pori', population: 83768 },
        { name: 'Kouvola', population: 80840 },
        { name: 'Joensuu', population: 76000 },
        { name: 'Lappeenranta', population: 73000 },
        { name: 'Hämeenlinna', population: 68000 },
        { name: 'Vaasa', population: 67000 },
        { name: 'Seinäjoki', population: 65000 },
        { name: 'Rovaniemi', population: 64000 },
        { name: 'Mikkeli', population: 54000 },
        { name: 'Kotka', population: 53000 },
        { name: 'Salo', population: 52000 }
      ],
      'IS': [
        { name: 'Reykjavík', population: 131136 },
        { name: 'Kópavogur', population: 37000 },
        { name: 'Hafnarfjörður', population: 29000 },
        { name: 'Akureyri', population: 19000 },
        { name: 'Reykjanesbær', population: 18000 },
        { name: 'Garðabær', population: 16000 },
        { name: 'Mosfellsbær', population: 12000 },
        { name: 'Árborg', population: 10000 },
        { name: 'Akranes', population: 7000 },
        { name: 'Fjarðabyggð', population: 5000 },
        { name: 'Seltjarnarnes', population: 4500 },
        { name: 'Fljótsdalshérað', population: 4000 },
        { name: 'Vestmannaeyjar', population: 4000 },
        { name: 'Skagafjörður', population: 4000 },
        { name: 'Ísafjarðarbær', population: 4000 },
        { name: 'Dalvík', population: 1400 },
        { name: 'Sauðárkrókur', population: 2600 },
        { name: 'Húsavík', population: 2300 },
        { name: 'Egilsstaðir', population: 2500 },
        { name: 'Selfoss', population: 7000 }
      ],
      'NO': [
        { name: 'Oslo', population: 697010 },
        { name: 'Bergen', population: 286930 },
        { name: 'Trondheim', population: 205332 },
        { name: 'Stavanger', population: 144699 },
        { name: 'Kristiansand', population: 112000 },
        { name: 'Fredrikstad', population: 83000 },
        { name: 'Tromsø', population: 77000 },
        { name: 'Drammen', population: 68000 },
        { name: 'Skien', population: 55000 },
        { name: 'Ålesund', population: 52000 },
        { name: 'Tønsberg', population: 43000 },
        { name: 'Moss', population: 35000 },
        { name: 'Haugesund', population: 37000 },
        { name: 'Sandefjord', population: 45000 },
        { name: 'Arendal', population: 45000 },
        { name: 'Hamar', population: 30000 },
        { name: 'Steinkjer', population: 22000 },
        { name: 'Larvik', population: 46000 },
        { name: 'Kongsberg', population: 28000 },
        { name: 'Horten', population: 27000 }
      ],
      'SE': [
        { name: 'Stockholm', population: 975551 },
        { name: 'Gothenburg', population: 579281 },
        { name: 'Malmö', population: 347949 },
        { name: 'Uppsala', population: 230767 },
        { name: 'Västerås', population: 150564 },
        { name: 'Örebro', population: 156381 },
        { name: 'Linköping', population: 164616 },
        { name: 'Helsingborg', population: 149280 },
        { name: 'Jönköping', population: 141081 },
        { name: 'Norrköping', population: 143171 },
        { name: 'Lund', population: 121893 },
        { name: 'Umeå', population: 130224 },
        { name: 'Gävle', population: 102904 },
        { name: 'Borås', population: 111154 },
        { name: 'Södertälje', population: 100000 },
        { name: 'Eskilstuna', population: 107579 },
        { name: 'Halmstad', population: 70000 },
        { name: 'Växjö', population: 90000 },
        { name: 'Karlstad', population: 95000 },
        { name: 'Östersund', population: 65000 }
      ]
    };
    
    const cities = nordicCities[countryCode] || [];
    console.log('Loaded cities for', countryCode + ':', cities.length);
    return cities;
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
  logout: async () => {
    // Mark user as offline before logging out
    console.log('[Logout] Setting user offline before logout');
    try {
      await authApi.updateOnlineStatus(false);
      console.log('[Logout] Successfully set user offline before logout');
    } catch (error) {
      console.error('[Logout] Failed to update online status on logout:', error);
    }
    
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

  // Update online status
  updateOnlineStatus: async (isOnline: boolean) => {
    console.log('[API] Updating online status to:', isOnline);
    const response = await authenticatedApiRequest('/me/online-status', {
      method: 'PUT',
      body: JSON.stringify({ isOnline }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Failed to update online status:', response.status, errorText);
      throw new Error('Failed to update online status');
    }
    const result = await response.json();
    console.log('[API] Successfully updated online status:', result);
    return result;
  },

  // Get user by ID
  getUserById: async (userId: string) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.USERS.GET_BY_ID(userId));
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  },

  // Get user online status
  getUserOnlineStatus: async (userId: string) => {
    const response = await authenticatedApiRequest(`/users/${userId}/online-status`);
    if (!response.ok) {
      throw new Error('Failed to fetch user online status');
    }
    return response.json();
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

  // Get other user's bio
  getUserBio: async (userId: string) => {
    const response = await authenticatedApiRequest(`/users/${userId}/bio`);
    if (!response.ok) {
      throw new Error('Failed to fetch user bio');
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
