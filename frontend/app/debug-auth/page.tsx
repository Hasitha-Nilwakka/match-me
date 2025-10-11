"use client";
import { useState, useEffect } from 'react';
import { isAuthenticated, getAuthToken, clearAuth, refreshToken } from '@/lib/auth';

export default function DebugAuthPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [refreshStatus, setRefreshStatus] = useState<string>('');

  useEffect(() => {
    setToken(getAuthToken());
    setIsAuth(isAuthenticated());
  }, []);

  const handleClearAuth = () => {
    clearAuth();
    setToken(null);
    setIsAuth(false);
    alert('Authentication cleared. Please refresh the page.');
  };

  const handleRefreshToken = async () => {
    setRefreshStatus('Refreshing token...');
    try {
      const success = await refreshToken();
      if (success) {
        setRefreshStatus('Token refreshed successfully!');
        setToken(getAuthToken());
        setIsAuth(isAuthenticated());
      } else {
        setRefreshStatus('Token refresh failed. Please log in again.');
        setToken(null);
        setIsAuth(false);
      }
    } catch (error) {
      setRefreshStatus(`Token refresh error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded">
            <h2 className="font-semibold mb-2">Authentication Status</h2>
            <p className={`font-mono ${isAuth ? 'text-green-600' : 'text-red-600'}`}>
              {isAuth ? '✅ Authenticated' : '❌ Not Authenticated'}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h2 className="font-semibold mb-2">Token</h2>
            {token ? (
              <div>
                <p className="text-green-600 mb-2">✅ Token exists</p>
                <p className="text-xs text-gray-600 break-all">
                  {token.substring(0, 50)}...
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Length: {token.length} characters
                </p>
              </div>
            ) : (
              <p className="text-red-600">❌ No token found</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h2 className="font-semibold mb-2">Token Refresh</h2>
            <button
              onClick={handleRefreshToken}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
            >
              Refresh Token
            </button>
            {refreshStatus && (
              <p className="text-sm text-gray-600 mt-2">{refreshStatus}</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h2 className="font-semibold mb-2">Actions</h2>
            <button
              onClick={handleClearAuth}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Authentication
            </button>
          </div>

          <div className="p-4 bg-yellow-50 rounded">
            <h2 className="font-semibold mb-2">Troubleshooting</h2>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• If you see &quot;Invalid or expired token&quot; errors, try refreshing the token</li>
              <li>• If token exists but still getting errors, the token may be expired</li>
              <li>• Clear authentication and log in again if refresh fails</li>
              <li>• Check browser console for detailed error messages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
