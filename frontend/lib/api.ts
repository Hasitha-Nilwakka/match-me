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
    if (host === 'localhost' || host === '127.0.0.1') {
      console.warn('[API] Using localhost-derived API URL. For mobile testing, set NEXT_PUBLIC_API_URL in frontend/.env.local to your LAN IP (e.g. http://192.168.x.x:8080).');
    }
    return derived;
  }

  // 3) Fallback for SSR/build
  const fallback = 'http://localhost:8080';
  console.warn('[API] Using SSR fallback API URL:', fallback, '\nSet NEXT_PUBLIC_API_URL to your backend base URL for non-localhost clients.');
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
    DELETE_ME: '/me/delete-profile',
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

import { io, Socket } from 'socket.io-client';

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

  // Create Socket.IO connection (NEW - replaces WebSocket)
  createSocketIOConnection: (
    chatId: string,
    onMessage: (message: unknown) => void,
    onTyping?: (data: unknown) => void
  ): Socket => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const baseUrl = getApiUrl();
    
    console.log('[SocketIO] Creating Socket.IO connection');
    console.log('[SocketIO] Base URL:', baseUrl);
    console.log('[SocketIO] Chat ID:', chatId);
    
    // Create Socket.IO connection
    const socket = io(baseUrl, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'], // WebSocket first, polling fallback
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });
    
    // Connection events
    socket.on('connect', () => {
      console.log('[SocketIO] Connected! Socket ID:', socket.id);
      // Join the chat room
      socket.emit('join_chat', { chatId: Number(chatId) });
    });
    
    socket.on('joined_chat', (data: any) => {
      console.log('[SocketIO] Joined chat room:', data);
    });
    
    socket.on('disconnect', (reason: string) => {
      console.log('[SocketIO] Disconnected:', reason);
    });
    
    socket.on('reconnect', (attemptNumber: number) => {
      console.log('[SocketIO] Reconnected after', attemptNumber, 'attempts');
      // Rejoin chat room after reconnection
      socket.emit('join_chat', { chatId: Number(chatId) });
    });
    
    socket.on('reconnecting', (attemptNumber: number) => {
      console.log('[SocketIO] Reconnecting... Attempt', attemptNumber);
    });
    
    socket.on('reconnect_failed', () => {
      console.error('[SocketIO] Reconnection failed');
    });
    
    socket.on('error', (error: any) => {
      console.error('[SocketIO] Error:', error);
    });
    
    socket.on('connect_error', (error: Error) => {
      console.error('[SocketIO] Connection error:', error.message);
    });
    
    // Chat events
    socket.on('message', (data: unknown) => {
      console.log('[SocketIO] Message received:', data);
      onMessage(data);
    });
    
    socket.on('typing', (data: unknown) => {
      console.log('[SocketIO] Typing event received:', data);
      if (onTyping) {
        onTyping(data);
      }
    });
    
    socket.on('read_receipt', (data: unknown) => {
      console.log('[SocketIO] Read receipt received:', data);
      // Forward read receipts to message handler
      onMessage(data);
    });
    
    return socket;
  },

  // Send typing indicator via Socket.IO
  sendSocketIOTypingIndicator: (socket: Socket, isTyping: boolean) => {
    if (socket && socket.connected) {
      socket.emit('typing', { isTyping });
      console.log('[SocketIO] Sent typing indicator:', isTyping);
    } else {
      console.warn('[SocketIO] Cannot send typing - socket not connected');
    }
  },
};

// OLD WebSocket methods removed - now using Socket.IO exclusively
// See git history (backup-native-websocket branch) for old WebSocket implementation
/*
const OLD_WEBSOCKET_CODE_REMOVED = {
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
        if (typeof event.data !== 'string') {
          console.warn('[API] Ignoring non-text WS frame');
          return;
        }

        // Support NDJSON / multi-line frames and trim whitespace
        const raw = event.data as string;
        const lines = raw.split('\n');
        for (const line of lines) {
          const snippet = line.trim();
          if (!snippet) continue;
          // Only attempt to parse when it looks like JSON
          if (!(snippet.startsWith('{') || snippet.startsWith('['))) {
            console.warn('[API] Skipping non-JSON WS snippet:', snippet.slice(0, 80));
            continue;
          }
          try {
            const data = JSON.parse(snippet);
            console.log('[API] WebSocket message received:', data);
            if (data && data.type === 'typing') {
              console.log('[API] Routing typing event to onTyping:', data);
              onTyping?.(data);
            } else {
              if (data && (data.type === 'read' || data.Type === 'read')) {
                console.log('[API] Routing read event to onMessage:', data);
              }
              onMessage(data);
            }
          } catch (innerErr) {
            console.error('[API] Failed to parse WS snippet:', snippet, innerErr);
          }
        }
      } catch (error) {
        console.error('[API] Error handling WebSocket message:', error);
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

  sendTypingIndicator: (ws: WebSocket, isTyping: boolean) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'typing', 
        isTyping: isTyping 
      }));
    }
  },
};
*/

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
    const nordicCities: { [key: string]: { name: string; latitude: number; longitude: number }[] } = {
      'DK': [
      { name: 'Copenhagen', latitude: 55.6761, longitude: 12.5683 },
      { name: 'Aarhus', latitude: 56.1629, longitude: 10.2039 },
      { name: 'Odense', latitude: 55.4038, longitude: 10.4024 },
      { name: 'Aalborg', latitude: 57.0488, longitude: 9.9217 },
      { name: 'Esbjerg', latitude: 55.4667, longitude: 8.4500 },
      { name: 'Randers', latitude: 56.4607, longitude: 10.0369 },
      { name: 'Kolding', latitude: 55.4904, longitude: 9.4721 },
      { name: 'Horsens', latitude: 55.8607, longitude: 9.8500 },
      { name: 'Vejle', latitude: 55.7094, longitude: 9.5378 },
      { name: 'Roskilde', latitude: 55.6415, longitude: 12.0803 },
      { name: 'Herning', latitude: 56.1372, longitude: 8.9739 },
      { name: 'Silkeborg', latitude: 56.1697, longitude: 9.5454 },
      { name: 'Næstved', latitude: 55.2297, longitude: 11.7611 },
      { name: 'Fredericia', latitude: 55.5659, longitude: 9.7552 },
      { name: 'Viborg', latitude: 56.4533, longitude: 9.4020 },
      { name: 'Køge', latitude: 55.4580, longitude: 12.1819 },
      { name: 'Holstebro', latitude: 56.3600, longitude: 8.6167 },
      { name: 'Taastrup', latitude: 55.6500, longitude: 12.3000 },
      { name: 'Slagelse', latitude: 55.4025, longitude: 11.3550 },
      { name: 'Hillerød', latitude: 55.9280, longitude: 12.3008 }
      ],
      'FI': [
      // Major cities
      { name: 'Helsinki', latitude: 60.1699, longitude: 24.9384 },
      { name: 'Espoo', latitude: 60.2055, longitude: 24.6559 },
      { name: 'Tampere', latitude: 61.4991, longitude: 23.7871 },
      { name: 'Vantaa', latitude: 60.2946, longitude: 25.0407 },
      { name: 'Oulu', latitude: 65.0121, longitude: 25.4651 },
      { name: 'Turku', latitude: 60.4518, longitude: 22.2666 },
      { name: 'Jyväskylä', latitude: 62.2426, longitude: 25.7473 },
      { name: 'Lahti', latitude: 60.9827, longitude: 25.6612 },
      { name: 'Kuopio', latitude: 62.8924, longitude: 27.6783 },
      { name: 'Pori', latitude: 61.4851, longitude: 21.7974 },
      
      // Medium cities
      { name: 'Kouvola', latitude: 60.8681, longitude: 26.7042 },
      { name: 'Joensuu', latitude: 62.6010, longitude: 29.7636 },
      { name: 'Lappeenranta', latitude: 61.0587, longitude: 28.1887 },
      { name: 'Hämeenlinna', latitude: 60.9963, longitude: 24.4641 },
      { name: 'Vaasa', latitude: 63.0951, longitude: 21.6165 },
      { name: 'Seinäjoki', latitude: 62.7903, longitude: 22.8404 },
      { name: 'Rovaniemi', latitude: 66.5039, longitude: 25.7294 },
      { name: 'Mikkeli', latitude: 61.6884, longitude: 27.2722 },
      { name: 'Kotka', latitude: 60.4664, longitude: 26.9458 },
      { name: 'Salo', latitude: 60.3836, longitude: 23.1303 },
      
      // Smaller municipalities
      { name: 'Porvoo', latitude: 60.3963, longitude: 25.6652 },
      { name: 'Lohja', latitude: 60.2487, longitude: 24.0662 },
      { name: 'Hyvinkää', latitude: 60.6299, longitude: 24.8615 },
      { name: 'Nurmijärvi', latitude: 60.4638, longitude: 24.8067 },
      { name: 'Järvenpää', latitude: 60.4739, longitude: 25.0897 },
      { name: 'Kirkkonummi', latitude: 60.1225, longitude: 24.4358 },
      { name: 'Kerava', latitude: 60.4044, longitude: 25.1050 },
      { name: 'Tuusula', latitude: 60.4033, longitude: 25.0265 },
      { name: 'Sipoo', latitude: 60.3738, longitude: 25.2697 },
      { name: 'Vihti', latitude: 60.4178, longitude: 24.3199 },
      
      // Northern municipalities
      { name: 'Tornio', latitude: 65.8481, longitude: 24.1462 },
      { name: 'Kemi', latitude: 65.7362, longitude: 24.5662 },
      { name: 'Kajaani', latitude: 64.2278, longitude: 27.7285 },
      { name: 'Ylivieska', latitude: 64.0736, longitude: 24.5410 },
      { name: 'Raahe', latitude: 64.6831, longitude: 24.4776 },
      { name: 'Iisalmi', latitude: 63.5589, longitude: 27.1907 },
      { name: 'Savonlinna', latitude: 61.8671, longitude: 28.8814 },
      { name: 'Varkaus', latitude: 62.3147, longitude: 27.8739 },
      { name: 'Pieksämäki', latitude: 62.3056, longitude: 27.1614 },
      { name: 'Heinola', latitude: 61.2058, longitude: 26.0378 },
      
      // Western municipalities
      { name: 'Rauma', latitude: 61.1274, longitude: 21.5103 },
      { name: 'Kankaanpää', latitude: 61.8014, longitude: 22.3938 },
      { name: 'Parkano', latitude: 62.0093, longitude: 23.0276 },
      { name: 'Ähtäri', latitude: 62.5503, longitude: 24.0603 },
      { name: 'Alajärvi', latitude: 63.0003, longitude: 23.8167 },
      { name: 'Lapua', latitude: 62.9694, longitude: 23.0064 },
      { name: 'Kurikka', latitude: 62.6167, longitude: 22.4167 },
      { name: 'Ilmajoki', latitude: 62.7333, longitude: 22.5833 },
      { name: 'Kauhava', latitude: 63.1000, longitude: 23.0500 },
      { name: 'Alavus', latitude: 62.5833, longitude: 23.6167 }
      ],
      'IS': [
      { name: 'Reykjavík', latitude: 64.1466, longitude: -21.9426 },
      { name: 'Kópavogur', latitude: 64.1125, longitude: -21.9069 },
      { name: 'Hafnarfjörður', latitude: 64.0671, longitude: -21.9508 },
      { name: 'Akureyri', latitude: 65.6835, longitude: -18.1262 },
      { name: 'Reykjanesbær', latitude: 63.9942, longitude: -22.5539 },
      { name: 'Garðabær', latitude: 64.0902, longitude: -21.9250 },
      { name: 'Mosfellsbær', latitude: 64.1677, longitude: -21.6885 },
      { name: 'Árborg', latitude: 63.8697, longitude: -20.8797 },
      { name: 'Akranes', latitude: 64.3208, longitude: -22.0776 },
      { name: 'Fjarðabyggð', latitude: 65.2667, longitude: -14.4000 },
      { name: 'Seltjarnarnes', latitude: 64.1580, longitude: -21.9694 },
      { name: 'Fljótsdalshérað', latitude: 65.2667, longitude: -14.4000 },
      { name: 'Vestmannaeyjar', latitude: 63.4404, longitude: -20.2685 },
      { name: 'Skagafjörður', latitude: 65.5000, longitude: -19.5000 },
      { name: 'Ísafjarðarbær', latitude: 66.0747, longitude: -23.1339 },
      { name: 'Dalvík', latitude: 65.9667, longitude: -18.5333 },
      { name: 'Sauðárkrókur', latitude: 65.7474, longitude: -19.6389 },
      { name: 'Húsavík', latitude: 66.0449, longitude: -17.3389 },
      { name: 'Egilsstaðir', latitude: 65.2637, longitude: -14.3944 },
      { name: 'Selfoss', latitude: 63.9331, longitude: -20.9972 }
      ],
      'NO': [
      { name: 'Oslo', latitude: 59.9139, longitude: 10.7522 },
      { name: 'Bergen', latitude: 60.3913, longitude: 5.3221 },
      { name: 'Trondheim', latitude: 63.4305, longitude: 10.3951 },
      { name: 'Stavanger', latitude: 58.9700, longitude: 5.7331 },
      { name: 'Kristiansand', latitude: 58.1467, longitude: 7.9956 },
      { name: 'Fredrikstad', latitude: 59.2181, longitude: 10.9298 },
      { name: 'Tromsø', latitude: 69.6492, longitude: 18.9553 },
      { name: 'Drammen', latitude: 59.7439, longitude: 10.2045 },
      { name: 'Skien', latitude: 59.2097, longitude: 9.6067 },
      { name: 'Ålesund', latitude: 62.4722, longitude: 6.1495 },
      { name: 'Tønsberg', latitude: 59.2675, longitude: 10.4078 },
      { name: 'Moss', latitude: 59.4369, longitude: 10.6564 },
      { name: 'Haugesund', latitude: 59.4138, longitude: 5.2681 },
      { name: 'Sandefjord', latitude: 59.1317, longitude: 10.2164 },
      { name: 'Arendal', latitude: 58.4617, longitude: 8.7722 },
      { name: 'Hamar', latitude: 60.7945, longitude: 11.0680 },
      { name: 'Steinkjer', latitude: 64.0147, longitude: 11.4953 },
      { name: 'Larvik', latitude: 59.0544, longitude: 10.0392 },
      { name: 'Kongsberg', latitude: 59.6686, longitude: 9.6517 },
      { name: 'Horten', latitude: 59.4167, longitude: 10.4833 }
      ],
      'SE': [
      { name: 'Stockholm', latitude: 59.3293, longitude: 18.0686 },
      { name: 'Gothenburg', latitude: 57.7089, longitude: 11.9746 },
      { name: 'Malmö', latitude: 55.6050, longitude: 13.0038 },
      { name: 'Uppsala', latitude: 59.8586, longitude: 17.6389 },
      { name: 'Västerås', latitude: 59.6162, longitude: 16.5528 },
      { name: 'Örebro', latitude: 59.2741, longitude: 15.2066 },
      { name: 'Linköping', latitude: 58.4108, longitude: 15.6214 },
      { name: 'Helsingborg', latitude: 56.0465, longitude: 12.6945 },
      { name: 'Jönköping', latitude: 57.7826, longitude: 14.1618 },
      { name: 'Norrköping', latitude: 58.5877, longitude: 16.1924 },
      { name: 'Lund', latitude: 55.7047, longitude: 13.1910 },
      { name: 'Umeå', latitude: 63.8258, longitude: 20.2630 },
      { name: 'Gävle', latitude: 60.6749, longitude: 17.1413 },
      { name: 'Borås', latitude: 57.7210, longitude: 12.9401 },
      { name: 'Södertälje', latitude: 59.1955, longitude: 17.6253 },
      { name: 'Eskilstuna', latitude: 59.3667, longitude: 16.5077 },
      { name: 'Halmstad', latitude: 56.6745, longitude: 12.8581 },
      { name: 'Växjö', latitude: 56.8777, longitude: 14.8091 },
      { name: 'Karlstad', latitude: 59.3793, longitude: 13.5036 },
      { name: 'Östersund', latitude: 63.1792, longitude: 14.6357 }
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
    age?: number;
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
    minAge?: number;
    maxAge?: number;
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
