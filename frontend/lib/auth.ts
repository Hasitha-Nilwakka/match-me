// Authentication utility functions

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export const clearAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const redirectToLogin = (): void => {
  clearAuth();
  window.location.href = '/';
};

export const handleAuthError = (error: Error): void => {
  if (error.message.includes('No authentication token found') || 
      error.message.includes('Unauthorized') ||
      error.message.includes('401') ||
      error.message.includes('Token refresh failed')) {
    console.log('Authentication error detected, redirecting to login');
    redirectToLogin();
  }
};

// Check if token is expired (basic check without parsing JWT)
export const isTokenExpired = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return true;
  
  try {
    // Basic check - if token exists and is not empty, assume it's valid
    // The actual expiration will be handled by the backend and automatic refresh
    return false;
  } catch {
    return true;
  }
};

// Refresh token manually (for use in components)
export const refreshToken = async (): Promise<boolean> => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return true;
    } else {
      clearAuth();
      return false;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearAuth();
    return false;
  }
};
