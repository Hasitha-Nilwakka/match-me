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
  window.location.href = '/login';
};

export const handleAuthError = (error: Error): void => {
  if (error.message.includes('No authentication token found') || 
      error.message.includes('Unauthorized') ||
      error.message.includes('401')) {
    console.log('Authentication error detected, redirecting to login');
    redirectToLogin();
  }
};
