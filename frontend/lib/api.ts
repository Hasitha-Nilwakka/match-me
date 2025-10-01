// API configuration and utility functions
// This file centralizes API-related configuration and provides reusable functions

// Get the API base URL from environment variables
export const getApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const defaultUrl = 'http://10.84.226.21:8080';
  const finalUrl = envUrl || defaultUrl;
  
  console.log('[API] Environment URL:', envUrl);
  console.log('[API] Default URL:', defaultUrl);
  console.log('[API] Final URL:', finalUrl);
  
  return finalUrl;
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

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    console.log('[API] Response status:', response.status);
    console.log('[API] Response headers:', Object.fromEntries(response.headers.entries()));
    return response;
  } catch (error) {
    console.error('[API] Fetch error:', error);
    console.error('[API] URL was:', url);
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

  // Create a new chat with a user
  createChat: async (userId: number) => {
    const response = await authenticatedApiRequest(API_ENDPOINTS.CHATS.CREATE, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Failed to create chat';
      throw new Error(errorMessage);
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
    } catch (e) {
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
  // Get all countries from REST Countries API
  getCountries: async (): Promise<{ name: string; code: string }[]> => {
    try {
      console.log('Fetching countries from REST Countries API...');
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
      if (!response.ok) {
        throw new Error('Failed to fetch countries');
      }
      const data = await response.json();
      console.log('REST Countries API response:', data.length, 'countries');
      const countries = data.map((country: { name: { common: string }; cca2: string }) => ({
        name: country.name.common,
        code: country.cca2
      })).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
      console.log('Processed countries:', countries.length);
      return countries;
    } catch (error) {
      console.error('Error fetching countries from API:', error);
      console.log('Using fallback countries list...');
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
  },

  // Get cities for a specific country using GeoNames API
  getCitiesByCountry: async (countryCode: string): Promise<{ name: string; population?: number }[]> => {
    try {
      console.log('Attempting to fetch cities from GeoNames API for country:', countryCode);
      // Using GeoNames API with username 'demo' (free tier)
      // In production, you should register for your own username
      const response = await fetch(
        `https://secure.geonames.org/searchJSON?country=${countryCode}&featureClass=P&maxRows=100&username=demo&orderby=population`
      );
      
      console.log('GeoNames API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`GeoNames API failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('GeoNames API response data:', data);
      
      // Check if API returned an error (like rate limit exceeded)
      if (data.status && data.status.value !== 0) {
        console.log('GeoNames API returned error:', data.status.message);
        throw new Error(`GeoNames API error: ${data.status.message}`);
      }
      
      if (data.geonames && data.geonames.length > 0) {
        const cities = data.geonames.map((city: { name: string; population?: number }) => ({
          name: city.name,
          population: city.population
        })).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
        console.log('GeoNames cities loaded:', cities.length);
        return cities;
      }
      
      console.log('No cities found in GeoNames response, using fallback');
      throw new Error('No cities found in GeoNames response');
    } catch (error) {
      console.error('GeoNames API error:', error);
      console.log('Using fallback cities for country:', countryCode);
      
      // Fallback to major cities for common countries
      const fallbackCities: { [key: string]: string[] } = {
        'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Mesa', 'Kansas City', 'Atlanta', 'Long Beach', 'Colorado Springs', 'Raleigh', 'Miami', 'Virginia Beach', 'Omaha', 'Oakland', 'Minneapolis', 'Tulsa', 'Arlington', 'Tampa'],
        'CA': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener', 'London', 'Victoria', 'Halifax', 'Oshawa', 'Windsor', 'Saskatoon', 'Regina', 'Sherbrooke', 'Kelowna', 'Barrie', 'Abbotsford', 'Sudbury', 'Kingston', 'Trois-Rivières', 'Guelph', 'Cambridge', 'Whitby', 'Ajax', 'Langley', 'Saanich', 'Thunder Bay', 'Terrebonne', 'Saint-Jean-sur-Richelieu', 'Richmond', 'Burnaby', 'Saguenay', 'Laval', 'Surrey', 'Brampton', 'Mississauga'],
        'GB': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds', 'Sheffield', 'Edinburgh', 'Bristol', 'Leicester', 'Coventry', 'Bradford', 'Cardiff', 'Belfast', 'Nottingham', 'Hull', 'Newcastle', 'Stoke-on-Trent', 'Southampton', 'Derby', 'Portsmouth', 'Brighton', 'Plymouth', 'Northampton', 'Reading', 'Luton', 'Wolverhampton', 'Bolton', 'Bournemouth', 'Norwich', 'Swindon', 'Southend-on-Sea', 'Middlesbrough', 'Peterborough', 'Huddersfield', 'York', 'Blackpool', 'Milton Keynes', 'Stockport', 'West Bromwich'],
        'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra', 'Wollongong', 'Hobart', 'Geelong', 'Townsville', 'Cairns', 'Toowoomba', 'Darwin', 'Ballarat', 'Bendigo', 'Albury', 'Launceston', 'Mackay', 'Rockhampton', 'Bunbury', 'Coffs Harbour', 'Wagga Wagga', 'Hervey Bay', 'Port Macquarie', 'Gladstone', 'Mildura', 'Shepparton', 'Traralgon', 'Kalgoorlie', 'Warrnambool', 'Albany', 'Devonport', 'Burnie', 'Whyalla', 'Mount Gambier', 'Geraldton', 'Broken Hill', 'Karratha'],
        'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hannover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster', 'Karlsruhe', 'Mannheim', 'Augsburg', 'Wiesbaden', 'Gelsenkirchen', 'Mönchengladbach', 'Braunschweig', 'Chemnitz', 'Kiel', 'Aachen', 'Halle', 'Magdeburg', 'Freiburg', 'Krefeld', 'Lübeck', 'Oberhausen', 'Erfurt', 'Mainz', 'Rostock', 'Kassel'],
        'FR': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Angers', 'Grenoble', 'Dijon', 'Nîmes', 'Aix-en-Provence', 'Saint-Denis', 'Le Mans', 'Amiens', 'Tours', 'Limoges', 'Annecy', 'Perpignan', 'Boulogne-Billancourt', 'Orléans', 'Mulhouse', 'Rouen', 'Caen', 'Nancy', 'Argenteuil', 'Montreuil', 'Roubaix', 'Tourcoing', 'Nanterre', 'Avignon'],
        'IT': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Venice', 'Verona', 'Messina', 'Padua', 'Trieste', 'Taranto', 'Brescia', 'Prato', 'Parma', 'Modena', 'Reggio Calabria', 'Reggio Emilia', 'Perugia', 'Livorno', 'Ravenna', 'Cagliari', 'Foggia', 'Rimini', 'Salerno', 'Ferrara', 'Sassari', 'Monza', 'Syracuse', 'Bergamo', 'Forlì', 'Trento', 'Vicenza', 'Terni', 'Bolzano', 'Novara'],
        'ES': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Hospitalet', 'A Coruña', 'Granada', 'Vitoria', 'Elche', 'Santa Cruz', 'Oviedo', 'Badalona', 'Cartagena', 'Terrassa', 'Jerez', 'Sabadell', 'Móstoles', 'Alcalá de Henares', 'Pamplona', 'Fuenlabrada', 'Almería', 'Leganés', 'Santander', 'Castellón', 'Burgos', 'Albacete', 'Getafe', 'Salamanca', 'Huelva'],
        'BR': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Goiânia', 'Belém', 'Porto Alegre', 'Guarulhos', 'Campinas', 'São Luís', 'São Gonçalo', 'Maceió', 'Duque de Caxias', 'Natal', 'Teresina', 'Campo Grande', 'Nova Iguaçu', 'São Bernardo do Campo', 'João Pessoa', 'Santo André', 'Jaboatão dos Guararapes', 'São José dos Campos', 'Ribeirão Preto', 'Uberlândia', 'Sorocaba', 'Contagem', 'Aracaju', 'Feira de Santana', 'Cuiabá', 'Joinville', 'Aparecida de Goiânia', 'Londrina', 'Ananindeua', 'Serra', 'Niterói'],
        'IN': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad', 'Navi Mumbai', 'Solapur', 'Vijayawada', 'Kolhapur', 'Amritsar', 'Nashik', 'Sangli', 'Malegaon'],
        'CN': ['Shanghai', 'Beijing', 'Chongqing', 'Tianjin', 'Guangzhou', 'Shenzhen', 'Wuhan', 'Dongguan', 'Chengdu', 'Nanjing', 'Xi\'an', 'Hangzhou', 'Foshan', 'Shenyang', 'Harbin', 'Qingdao', 'Dalian', 'Jinan', 'Zhengzhou', 'Changsha', 'Kunming', 'Changchun', 'Taiyuan', 'Shijiazhuang', 'Nanning', 'Hefei', 'Ningbo', 'Fuzhou', 'Xiamen', 'Nanchang', 'Guiyang', 'Haikou', 'Lanzhou', 'Yinchuan', 'Xining', 'Hohhot', 'Urumqi', 'Lhasa', 'Macau', 'Hong Kong'],
        'JP': ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kawasaki', 'Kyoto', 'Saitama', 'Hiroshima', 'Sendai', 'Kitakyushu', 'Chiba', 'Sakai', 'Niigata', 'Hamamatsu', 'Okayama', 'Sagamihara', 'Kumamoto', 'Shizuoka', 'Kagoshima', 'Funabashi', 'Hachioji', 'Matsuyama', 'Matsudo', 'Nishinomiya', 'Kawaguchi', 'Kanazawa', 'Ichikawa', 'Oita', 'Fukuyama', 'Amagasaki', 'Nagasaki', 'Toyonaka', 'Toyohashi', 'Toyota', 'Takamatsu', 'Hirakata', 'Fujisawa'],
        'KR': ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan', 'Changwon', 'Goyang', 'Yongin', 'Bucheon', 'Ansan', 'Anyang', 'Namyangju', 'Hwaseong', 'Cheongju', 'Jeonju', 'Cheonan', 'Gimhae', 'Jeju', 'Pyeongtaek', 'Siheung', 'Wonju', 'Jinju', 'Gumi', 'Jeongeup', 'Gunsan', 'Iksan', 'Yeosu', 'Mokpo', 'Gunsan', 'Jeonju', 'Andong', 'Gyeongju', 'Gangneung', 'Chuncheon', 'Hongcheon', 'Wonju', 'Chungju'],
        'MX': ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Zapopan', 'Nezahualcóyotl', 'Chihuahua', 'Mérida', 'Naucalpan', 'Álvaro Obregón', 'Guadalupe', 'Acapulco', 'Tlalnepantla', 'Cancún', 'Saltillo', 'Aguascalientes', 'Hermosillo', 'Mexicali', 'San Luis Potosí', 'Culiacán', 'Querétaro', 'Morelia', 'Chimalhuacán', 'Reynosa', 'Torreón', 'Tlaquepaque', 'Tuxtla Gutiérrez', 'Durango', 'Cuautitlán Izcalli', 'Veracruz', 'Ciudad López Mateos', 'Irapuato', 'Ensenada', 'Matamoros', 'Tonalá', 'Xalapa', 'Nuevo Laredo'],
        'RU': ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod', 'Chelyabinsk', 'Samara', 'Omsk', 'Rostov-on-Don', 'Ufa', 'Krasnoyarsk', 'Perm', 'Voronezh', 'Volgograd', 'Krasnodar', 'Saratov', 'Tyumen', 'Tolyatti', 'Izhevsk', 'Barnaul', 'Ulyanovsk', 'Irkutsk', 'Vladivostok', 'Yaroslavl', 'Habarovsk', 'Makhachkala', 'Tomsk', 'Orenburg', 'Kemerovo', 'Ryazan', 'Astrakhan', 'Naberezhnye Chelny', 'Penza', 'Lipetsk', 'Tula', 'Kirov', 'Cheboksary', 'Kaliningrad', 'Bryansk'],
        // Additional European countries
        'NL': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen', 'Enschede', 'Haarlem', 'Arnhem', 'Zaanstad', 'Amersfoort', 'Apeldoorn', 'Hoofddorp', 'Maastricht', 'Leiden', 'Dordrecht'],
        'BE': ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven', 'Mons', 'Aalst', 'Mechelen', 'La Louvière', 'Kortrijk', 'Hasselt', 'Ostend', 'Tournai', 'Genk', 'Seraing', 'Roeselare', 'Verviers'],
        'CH': ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano', 'Biel', 'Thun', 'Köniz', 'La Chaux-de-Fonds', 'Fribourg', 'Schaffhausen', 'Chur', 'Vernier', 'Neuchâtel', 'Uster', 'Sion'],
        'AT': ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels', 'Sankt Pölten', 'Dornbirn', 'Steyr', 'Wiener Neustadt', 'Feldkirch', 'Bregenz', 'Leonding', 'Wolfsberg', 'Baden', 'Klosterneuburg', 'Leoben', 'Krems'],
        'SE': ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping', 'Lund', 'Umeå', 'Gävle', 'Borås', 'Södertälje', 'Eskilstuna', 'Halmstad', 'Växjö', 'Karlstad', 'Östersund'],
        'NO': ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Kristiansand', 'Fredrikstad', 'Tromsø', 'Drammen', 'Skien', 'Ålesund', 'Tønsberg', 'Moss', 'Haugesund', 'Sandefjord', 'Arendal', 'Hamar', 'Steinkjer', 'Larvik', 'Kongsberg', 'Horten'],
        'DK': ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde', 'Herning', 'Silkeborg', 'Næstved', 'Fredericia', 'Viborg', 'Køge', 'Holstebro', 'Taastrup', 'Slagelse', 'Hillerød'],
        'FI': ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Turku', 'Oulu', 'Jyväskylä', 'Lahti', 'Kuopio', 'Pori', 'Kouvola', 'Joensuu', 'Lappeenranta', 'Hämeenlinna', 'Vaasa', 'Seinäjoki', 'Rovaniemi', 'Mikkeli', 'Kotka', 'Salo'],
        'PL': ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Białystok', 'Katowice', 'Gdynia', 'Częstochowa', 'Radom', 'Sosnowiec', 'Toruń', 'Kielce', 'Gliwice', 'Zabrze', 'Bytom'],
        'CZ': ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'Budějovice', 'Hradec Králové', 'Ústí nad Labem', 'Pardubice', 'Zlín', 'Havířov', 'Kladno', 'Most', 'Opava', 'Frýdek-Místek', 'Karviná', 'Jihlava', 'Teplice', 'Děčín'],
        'HU': ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét', 'Székesfehérvár', 'Szombathely', 'Szolnok', 'Tatabánya', 'Kaposvár', 'Békéscsaba', 'Zalaegerszeg', 'Érd', 'Sopron', 'Veszprém', 'Baja', 'Szekszárd'],
        'RO': ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova', 'Galați', 'Ploiești', 'Brașov', 'Brăila', 'Arad', 'Pitești', 'Sibiu', 'Bacău', 'Târgu Mureș', 'Baia Mare', 'Buzău', 'Satu Mare', 'Piatra Neamț', 'Râmnicu Vâlcea'],
        'BG': ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse', 'Stara Zagora', 'Pleven', 'Sliven', 'Dobrich', 'Shumen', 'Pernik', 'Haskovo', 'Yambol', 'Pazardzhik', 'Blagoevgrad', 'Veliko Tarnovo', 'Vratsa', 'Gabrovo', 'Asenovgrad', 'Kazanlak'],
        'GR': ['Athens', 'Thessaloniki', 'Patras', 'Piraeus', 'Larissa', 'Heraklion', 'Peristeri', 'Kallithea', 'Acharnes', 'Kalamaria', 'Nikaia', 'Glyfada', 'Volos', 'Ilion', 'Ilioupoli', 'Keratsini', 'Khalandrion', 'Nea Smyrni', 'Marousi', 'Agios Dimitrios'],
        'PT': ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Funchal', 'Coimbra', 'Setúbal', 'Almada', 'Agualva-Cacém', 'Queluz', 'Rio Tinto', 'Barreiro', 'Aveiro', 'Corroios', 'Leiria', 'Faro', 'Évora', 'Viseu', 'Guimarães'],
        'IE': ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Swords', 'Dundalk', 'Bray', 'Navan', 'Ennis', 'Kilkenny', 'Carlow', 'Tralee', 'Newbridge', 'Naas', 'Athlone', 'Portlaoise', 'Mullingar', 'Wexford'],
        // Additional countries from other continents
        'NZ': ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Napier', 'Hastings', 'Dunedin', 'Palmerston North', 'Nelson', 'Rotorua', 'New Plymouth', 'Whangarei', 'Invercargill', 'Whanganui', 'Gisborne', 'Pukekohe', 'Timaru', 'Masterton', 'Levin'],
        'ZA': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Pietermaritzburg', 'Benoni', 'Tembisa', 'Vereeniging', 'Soweto', 'Boksburg', 'Welkom', 'Klerksdorp', 'Potchefstroom', 'Rustenburg', 'Carletonville', 'Midrand', 'Centurion'],
        'EG': ['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said', 'Suez', 'Luxor', 'Mansoura', 'El Mahalla El Kubra', 'Tanta', 'Asyut', 'Ismailia', 'Faiyum', 'Zagazig', 'Aswan', 'Damietta', 'Minya', 'Beni Suef', 'Hurghada', 'Qena'],
        'NG': ['Lagos', 'Kano', 'Ibadan', 'Benin City', 'Port Harcourt', 'Jos', 'Ilorin', 'Abuja', 'Kaduna', 'Maiduguri', 'Zaria', 'Aba', 'Ilesa', 'Onitsha', 'Iwo', 'Ado Ekiti', 'Akure', 'Osogbo', 'Katsina', 'Bauchi'],
        'KE': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Malindi', 'Kitale', 'Garissa', 'Kakamega', 'Nyeri', 'Meru', 'Thika', 'Machakos', 'Embu', 'Narok', 'Kericho', 'Kisii', 'Bungoma', 'Busia', 'Homa Bay'],
        'GH': ['Accra', 'Kumasi', 'Tamale', 'Sekondi-Takoradi', 'Sunyani', 'Cape Coast', 'Koforidua', 'Ho', 'Techiman', 'Tema', 'Ashaiman', 'Bolgatanga', 'Tarkwa', 'Wa', 'Nkawkaw', 'Aflao', 'Suhum', 'Prestea', 'Bibiani', 'Konongo'],
        'MA': ['Casablanca', 'Rabat', 'Fez', 'Marrakech', 'Agadir', 'Tangier', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan', 'Safi', 'Mohammedia', 'Khouribga', 'Beni Mellal', 'El Jadida', 'Taza', 'Nador', 'Settat', 'Larache', 'Ksar El Kebir'],
        'TN': ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Gabès', 'Ariana', 'Gafsa', 'Monastir', 'Ben Arous', 'Kasserine', 'Medenine', 'Nabeul', 'Tataouine', 'Béja', 'Jendouba', 'Kef', 'Mahdia', 'Manouba', 'Siliana'],
        'DZ': ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna', 'Djelfa', 'Sétif', 'Sidi Bel Abbès', 'Biskra', 'Tébessa', 'El Oued', 'Skikda', 'Tiaret', 'Béjaïa', 'Tlemcen', 'Ouargla', 'Guelma', 'Mostaganem', 'M\'Sila'],
        'LY': ['Tripoli', 'Benghazi', 'Misrata', 'Tarhuna', 'Khoms', 'Zawiya', 'Zuwara', 'Ajdabiya', 'Sirte', 'Tobruk', 'Sabha', 'Derna', 'Kufra', 'Gharyan', 'Murzuq', 'Bani Walid', 'Zliten', 'Tajura', 'Yafran', 'Nalut'],
        'SD': ['Khartoum', 'Omdurman', 'Port Sudan', 'Kassala', 'El Obeid', 'Nyala', 'Wad Madani', 'El Fasher', 'Kosti', 'Gedaref', 'Sennar', 'Atbara', 'El Geneina', 'Rabak', 'Singa', 'El Daein', 'Umm Ruwaba', 'Shendi', 'El Damazin', 'Kadugli'],
        'ET': ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Awassa', 'Bahir Dar', 'Jimma', 'Dessie', 'Jijiga', 'Shashamane', 'Bishoftu', 'Arba Minch', 'Hosaena', 'Harar', 'Dila', 'Nekemte', 'Debre Birhan', 'Asella', 'Goba', 'Kebri Dehar'],
        'UG': ['Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja', 'Bwizibwera', 'Mbale', 'Mukono', 'Kasese', 'Masaka', 'Entebbe', 'Njeru', 'Kitgum', 'Arua', 'Iganga', 'Soroti', 'Fort Portal', 'Lugazi', 'Mityana', 'Nebbi'],
        'TZ': ['Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya', 'Morogoro', 'Tanga', 'Kahama', 'Tabora', 'Singida', 'Musoma', 'Iringa', 'Katumba', 'Shinyanga', 'Moshi', 'Unguja', 'Kigoma', 'Mpanda', 'Bukoba', 'Sumbawanga'],
        'ZW': ['Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo', 'Chinhoyi', 'Marondera', 'Norton', 'Chegutu', 'Bindura', 'Zvishavane', 'Victoria Falls', 'Hwange', 'Redcliff', 'Rusape', 'Chiredzi', 'Kariba'],
        'BW': ['Gaborone', 'Francistown', 'Molepolole', 'Selebi-Phikwe', 'Maun', 'Serowe', 'Kanye', 'Mahalapye', 'Mochudi', 'Mogoditshane', 'Palapye', 'Lobatse', 'Ramotswa', 'Thamaga', 'Moshupa', 'Tlokweng', 'Orapa', 'Jwaneng', 'Sowa', 'Letlhakane'],
        'NA': ['Windhoek', 'Rundu', 'Walvis Bay', 'Oshakati', 'Swakopmund', 'Katima Mulilo', 'Grootfontein', 'Rehoboth', 'Otjiwarongo', 'Okahandja', 'Keetmanshoop', 'Lüderitz', 'Mariental', 'Gobabis', 'Tsumeb', 'Omaruru', 'Usakos', 'Karibib', 'Outjo', 'Khorixas'],
        'ZM': ['Lusaka', 'Kitwe', 'Ndola', 'Kabwe', 'Chingola', 'Mufulira', 'Luanshya', 'Livingstone', 'Kasama', 'Chipata', 'Solwezi', 'Mazabuka', 'Chililabombwe', 'Mongu', 'Kafue', 'Choma', 'Mansa', 'Kapiri Mposhi', 'Nchelenge', 'Samfya'],
        'MW': ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Kasungu', 'Mangochi', 'Karonga', 'Salima', 'Nkhotakota', 'Liwonde', 'Nsanje', 'Rumphi', 'Mzimba', 'Balaka', 'Mchinji', 'Dedza', 'Ntcheu', 'Chitipa', 'Thyolo', 'Phalombe'],
        'MZ': ['Maputo', 'Matola', 'Beira', 'Nampula', 'Chimoio', 'Nacala', 'Quelimane', 'Tete', 'Pemba', 'Xai-Xai', 'Inhambane', 'Maxixe', 'Lichinga', 'Angoche', 'Cuamba', 'Montepuez', 'Chokwe', 'Mocuba', 'Gurue', 'Mocimboa da Praia'],
        'MG': ['Antananarivo', 'Toamasina', 'Antsirabe', 'Fianarantsoa', 'Mahajanga', 'Toliara', 'Antsiranana', 'Ambalavao', 'Ambovombe', 'Andoany', 'Ankazoabo', 'Antalaha', 'Antanifotsy', 'Antsohihy', 'Arivonimamo', 'Bealanana', 'Befandriana', 'Brickaville', 'Farafangana', 'Fort Dauphin'],
        'MU': ['Port Louis', 'Beau Bassin-Rose Hill', 'Vacoas-Phoenix', 'Curepipe', 'Quatre Bornes', 'Triolet', 'Goodlands', 'Centre de Flacq', 'Bel Air', 'Mahebourg', 'Saint Pierre', 'Bambous', 'Cascavelle', 'Grand Baie', 'Flic en Flac', 'Le Morne', 'Trou aux Biches', 'Pamplemousses', 'Rivière du Rempart', 'Savanne'],
        'SC': ['Victoria', 'Anse Boileau', 'Anse Royale', 'Au Cap', 'Baie Lazare', 'Baie Sainte Anne', 'Beau Vallon', 'Bel Air', 'Bel Ombre', 'Cascade', 'Glacis', 'Grand Anse', 'La Digue', 'La Rivière Anglaise', 'Mont Buxton', 'Mont Fleuri', 'Plaisance', 'Pointe La Rue', 'Port Glaud', 'Takamaka'],
        'CV': ['Praia', 'Mindelo', 'Santa Maria', 'Cova Figueira', 'Pedra Badejo', 'São Filipe', 'Assomada', 'Tarrafal', 'Espargos', 'Porto Novo', 'Ribeira Brava', 'Vila do Maio', 'Picos', 'Calheta', 'Vila Nova Sintra', 'Mosteiros', 'São Domingos', 'Ribeira Grande', 'Pombas', 'Ponta do Sol']
      };
      
      const fallbackResult = fallbackCities[countryCode]?.map(city => ({ name: city })) || [];
      console.log('Fallback cities result:', fallbackResult.length, 'cities for', countryCode);
      return fallbackResult;
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
