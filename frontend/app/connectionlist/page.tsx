"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, connectionsApi } from "../../lib/api";
import ProfileModal from "../../components/ProfileModal";
import { useDataMode } from "../../context/DataModeContext";
import { useChat } from "../../context/ChatContext";

// Mock connection data
const mockConnections = [
  {
    id: 1,
    firstName: "Sarah",
    lastName: "Johnson",
    city: "San Francisco",
    country: "USA",
    profilePicture: "/sitefiles/default-profile-picture.png",
    isOnline: true,
    lastSeen: "2 minutes ago",
    connectionDate: "2024-01-15"
  },
  {
    id: 2,
    firstName: "Michael",
    lastName: "Chen",
    city: "New York",
    country: "USA",
    profilePicture: "/sitefiles/default-profile-picture.png",
    isOnline: false,
    lastSeen: "1 hour ago",
    connectionDate: "2024-01-10"
  },
  {
    id: 3,
    firstName: "Emma",
    lastName: "Williams",
    city: "London",
    country: "UK",
    profilePicture: "/sitefiles/default-profile-picture.png",
    isOnline: true,
    lastSeen: "5 minutes ago",
    connectionDate: "2024-01-08"
  },
  {
    id: 4,
    firstName: "David",
    lastName: "Brown",
    city: "Toronto",
    country: "Canada",
    profilePicture: "/sitefiles/default-profile-picture.png",
    isOnline: false,
    lastSeen: "3 hours ago",
    connectionDate: "2024-01-05"
  },
  {
    id: 5,
    firstName: "Lisa",
    lastName: "Garcia",
    city: "Barcelona",
    country: "Spain",
    profilePicture: "/sitefiles/default-profile-picture.png",
    isOnline: true,
    lastSeen: "1 minute ago",
    connectionDate: "2024-01-03"
  }
];

interface Connection {
  id: number;
  userId?: number; // The actual user ID for chat creation
  firstName: string;
  lastName: string;
  city?: string;
  country?: string;
  profilePicture: string;
  isOnline: boolean;
  lastSeen?: string;
  connectionDate: string;
  chatId?: number;
}

export default function ConnectionListPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("connections");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [startingChatId, setStartingChatId] = useState<number | null>(null);
  const { mode } = useDataMode();
  const { openChat } = useChat();

  // Load connections based on data mode
  const loadConnections = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (mode === "mock") {
        setConnections(mockConnections);
      } else {
        // Real API call
        const response = await connectionsApi.getConnections();
        console.log('Connections API response:', response);
        
        // Handle different possible response structures
        let connectionsData = [];
        
        if (Array.isArray(response)) {
          // Direct array response
          connectionsData = response;
        } else if (response.success && response.data) {
          // Standard API response with success/data structure
          if (Array.isArray(response.data)) {
            connectionsData = response.data;
          } else if (response.data.connections && Array.isArray(response.data.connections)) {
            connectionsData = response.data.connections;
          }
        } else if (response.connections && Array.isArray(response.connections)) {
          // Direct connections property
          connectionsData = response.connections;
        }
        
        console.log('Extracted connections data:', connectionsData);
        
        if (connectionsData.length > 0) {
          // Transform backend data to match frontend interface
          const transformedConnections: Connection[] = connectionsData.map((conn: {
            id: number;
            userId?: number;
            requesterName?: string;
            receiverName?: string;
            firstName?: string;
            lastName?: string;
            city?: string;
            country?: string;
            profilePicture?: string;
            isOnline?: boolean;
            lastSeen?: string;
            createdAt?: string;
            connectionDate?: string;
            chatId?: number;
            requester?: { profile?: { city?: string; country?: string; profilePictureURL?: string } };
            receiver?: { profile?: { city?: string; country?: string; profilePictureURL?: string } };
          }) => ({
            id: conn.id,
            userId: conn.userId, // This is the actual user ID for chat creation
            firstName: conn.requesterName || conn.receiverName || conn.firstName || "Unknown",
            lastName: conn.lastName || "",
            city: conn.requester?.profile?.city || conn.receiver?.profile?.city || conn.city || "Unknown",
            country: conn.requester?.profile?.country || conn.receiver?.profile?.country || conn.country || "Unknown",
            profilePicture: conn.requester?.profile?.profilePictureURL || conn.receiver?.profile?.profilePictureURL || conn.profilePicture || "/sitefiles/default-profile-picture.png",
            isOnline: conn.isOnline || false,
            lastSeen: conn.lastSeen || "Recently",
            connectionDate: conn.createdAt || conn.connectionDate,
            chatId: conn.chatId
          }));
          console.log('Transformed connections:', transformedConnections);
          setConnections(transformedConnections);
        } else {
          console.log('No connections found in response');
          setConnections([]);
        }
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      // Only fallback to mock data if in mock mode, otherwise show empty list
      if (mode === "mock") {
        setConnections(mockConnections);
      } else {
        setConnections([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  // Check authentication on page load
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      loadConnections();
    }
  }, [router, mode, loadConnections]);

  const handleLogout = async () => {
    await authApi.logout();
    router.push('/');
  };

  const handleNavigation = (tab: string) => {
    setActiveTab(tab);
  };

  const handleStartChat = async (connection: Connection) => {
    try {
      setStartingChatId(connection.id);
      
      if (mode === "mock") {
        // For mock mode, just open the chat popup
        openChat();
      } else {
        // For real mode, we need to find the chat ID for this connection
        // Since the backend doesn't return chatId yet, we'll use a workaround
        // We'll open the chat popup and let the user select the chat
        // TODO: Once backend returns chatId, we can pass it directly
        openChat();
      }
      
    } catch (error: unknown) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    } finally {
      setStartingChatId(null);
    }
  };

  const handleRemoveConnection = async (connectionId: number) => {
    try {
      // Call API to remove connection from backend
      await connectionsApi.deleteConnection(connectionId.toString());
      
      // Remove connection from the local list
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      console.log(`Removed connection ${connectionId}`);
    } catch (error) {
      console.error('Failed to remove connection:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleViewProfile = (connectionId: number) => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn || !conn.userId) return;
    // Use real user ID to fetch complete profile data
    setSelectedUserId(conn.userId);
    setIsProfileOpen(true);
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Menu */}
      <nav className="bg-white shadow-lg border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Image
                src="/sitefiles/site-logo-web.png"
                alt="Site Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
            </div>

            {/* Navigation Items */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/frontpage"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "frontpage"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Front Page
                </Link>
                <Link
                  href="/profile"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "profile"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Profile
                </Link>
                <button
                  onClick={() => handleNavigation("connections")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "connections"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Connection List
                </button>
                <Link
                  href="/connectionrequests"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "requests"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Connection Requests
                </Link>
                <button
                  onClick={() => handleNavigation("chat")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "chat"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Chat
                </button>
              </div>
            </div>

            {/* Logout Button */}
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition"
              >
                Log out
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
            <Link
              href="/frontpage"
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "frontpage"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Front Page
            </Link>
            <Link
              href="/profile"
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "profile"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Profile
            </Link>
            <button
              onClick={() => handleNavigation("connections")}
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "connections"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Connection List
            </button>
            <Link
              href="/connectionrequests"
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "requests"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Connection Requests
            </Link>
          </div>
        </div>
      </nav>

      {/* Profile Modal */}
      <ProfileModal
        userId={selectedUserId}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Connections</h1>
            <p className="text-lg text-gray-600">
              Manage your connections and start conversations
            </p>
          </div>

          {/* Connection Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Connections</p>
                  <p className="text-2xl font-semibold text-gray-900">{connections.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Online Now</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {connections.filter(conn => conn.isOnline).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Chats</p>
                  <p className="text-2xl font-semibold text-gray-900">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Connections List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">All Connections</h2>
            </div>
            
            {connections.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No connections</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by finding some matches!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {connections.map((connection) => (
                  <div key={connection.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Profile Picture */}
                        <div className="relative">
                          {(() => {
                            const profilePicSrc = connection.profilePicture && connection.profilePicture.startsWith('http')
                              ? connection.profilePicture
                              : connection.profilePicture && connection.profilePicture.startsWith('/uploads')
                              ? `http://localhost:8080${connection.profilePicture}`
                              : connection.profilePicture && connection.profilePicture.startsWith('/')
                              ? connection.profilePicture
                              : "/sitefiles/default-profile-picture.png";
                            
                            return (
                              <Image
                                src={profilePicSrc}
                                alt={`${connection.firstName} ${connection.lastName}`}
                                width={60}
                                height={60}
                                className="rounded-full border-2 border-white shadow-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/sitefiles/default-profile-picture.png";
                                }}
                              />
                            );
                          })()}
                          {/* Online Status Indicator */}
                          {connection.isOnline && (
                            <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>

                        {/* Connection Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {connection.firstName} {connection.lastName}
                            </h3>
                            {connection.isOnline && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Online
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {connection.city}, {connection.country}
                          </p>
                          <p className="text-xs text-gray-400">
                            Connected on {new Date(connection.connectionDate).toLocaleDateString()}
                            {!connection.isOnline && ` • Last seen ${connection.lastSeen}`}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleViewProfile(connection.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                        >
                          View Profile
                        </button>
                        
                        <button
                          onClick={() => handleStartChat(connection)}
                          disabled={startingChatId === connection.id}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          {startingChatId === connection.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Starting...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span>Start Chat</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleRemoveConnection(connection.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
