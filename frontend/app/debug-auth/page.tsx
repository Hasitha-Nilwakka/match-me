"use client";
import { useState, useEffect } from 'react';
import { isAuthenticated, getAuthToken, clearAuth } from '@/lib/auth';

export default function DebugAuthPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);

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
            <h2 className="font-semibold mb-2">Actions</h2>
            <button
              onClick={handleClearAuth}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Authentication
            </button>
          </div>

          <div className="p-4 bg-blue-50 rounded">
            <h2 className="font-semibold mb-2">Troubleshooting</h2>
            <ul className="text-sm space-y-1">
              <li>• If not authenticated, the user needs to log in again</li>
              <li>• If token exists but still getting errors, the token may be expired</li>
              <li>• Clear authentication and log in again to get a fresh token</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
