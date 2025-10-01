"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, connectionsApi } from "../../lib/api";
import ProfileModal from "../../components/ProfileModal";
import { useDataMode } from "../../context/DataModeContext";

// Mock connection request data
const mockConnectionRequests = [
  {
    id: 1,
    firstName: "Jessica",
    lastName: "Martinez",
    city: "Los Angeles",
    country: "USA",
    profilePicture: "/sitefiles/default-profile-picture.png",
    isOnline: true,
    lastSeen: "5 minutes ago",
    requestDate: "2024-01-20",
    message: "Hi! I saw we have similar interests in photography and travel. Would love to connect!"
  },
  {
    id: 2,
    firstName: "Alex",
    lastName: "Thompson",
    city: "Seattle",
    country: "USA",
    profilePicture: "/sitefiles/default-profile-picture.png",
    isOnline: false,
    lastSeen: "2 hours ago",
    requestDate: "2024-01-19",
    message: "Hey there! We both love hiking and outdoor adventures. Let's connect!"
  },
  {
    id: 3,
    firstName: "Sophie",
    lastName: "Anderson",
    city: "Melbourne",
    country: "Australia",
    profilePicture: "/sitefiles/default-profile-picture.png",
    isOnline: true,
    lastSeen: "1 minute ago",
    requestDate: "2024-01-18",
    message: "Hello! I noticed we share a passion for cooking and music. Would be great to chat!"
  },
  {
    id: 4,
    firstName: "James",
    lastName: "Wilson",
    city: "Vancouver",
    country: "Canada",
    profilePicture: "/sitefiles/default-profile-picture.png",
    isOnline: false,
    lastSeen: "1 day ago",
    requestDate: "2024-01-17",
    message: "Hi! We both enjoy reading and coffee. Let's connect and share book recommendations!"
  },
  {
    id: 5,
    firstName: "Maria",
    lastName: "Rodriguez",
    city: "Madrid",
    country: "Spain",
    profilePicture: "/sitefiles/default-profile-picture.png",
    isOnline: true,
    lastSeen: "10 minutes ago",
    requestDate: "2024-01-16",
    message: "Hola! I love your profile and we have so much in common. Let's be friends!"
  }
];

interface Request {
  id: number;
  firstName: string;
  lastName: string;
  city?: string;
  country?: string;
  profilePicture: string;
  isOnline: boolean;
  lastSeen?: string;
  requestDate: string;
  message?: string;
}

export default function ConnectionRequestsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("requests");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { mode } = useDataMode();

  // Load connection requests based on data mode
  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (mode === "mock") {
        setRequests(mockConnectionRequests);
      } else {
        // Real API call
        const payload = await connectionsApi.getConnectionRequests();
        const data = Array.isArray(payload) ? payload : (payload?.requests ?? []);
        // Transform backend data to match frontend interface
        const transformedRequests: Request[] = data.map((req: { id: number; userId: number; firstName: string; lastName: string; city?: string; country?: string; profilePicture?: string; requestDate: string; status: string }) => ({
          id: req.id,
          firstName: req.firstName,
          lastName: req.lastName,
          city: req.city,
          country: req.country,
          profilePicture: req.profilePicture && req.profilePicture.startsWith('/') ? req.profilePicture : "/sitefiles/default-profile-picture.png",
          isOnline: false, // Backend doesn't provide online status yet
          lastSeen: "Recently",
          requestDate: req.requestDate,
          message: "Would like to connect with you!"
        }));
        setRequests(transformedRequests);
      }
    } catch (error) {
      console.error('Error loading connection requests:', error);
      // Only fallback to mock data if in mock mode, otherwise show empty list
      if (mode === "mock") {
        setRequests(mockConnectionRequests);
      } else {
        setRequests([]);
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
      loadRequests();
    }
  }, [router, loadRequests]);

  const handleLogout = async () => {
    await authApi.logout();
    router.push('/');
  };

  const handleNavigation = (tab: string) => {
    setActiveTab(tab);
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      if (mode === "mock") {
        // Mock mode - just remove from UI
        setRequests(prev => prev.filter(req => req.id !== requestId));
        console.log(`Accepted connection request ${requestId} (mock mode)`);
      } else {
        // Real API call
        await connectionsApi.acceptConnection(String(requestId));
        // Remove from requests after successful API call
        setRequests(prev => prev.filter(req => req.id !== requestId));
        console.log(`Accepted connection request ${requestId}`);
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
      alert('Failed to accept connection request. Please try again.');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      if (mode === "mock") {
        // Mock mode - just remove from UI
        setRequests(prev => prev.filter(req => req.id !== requestId));
        console.log(`Rejected connection request ${requestId} (mock mode)`);
      } else {
        // Real API call
        await connectionsApi.rejectConnection(String(requestId));
        // Remove from requests after successful API call
        setRequests(prev => prev.filter(req => req.id !== requestId));
        console.log(`Rejected connection request ${requestId}`);
      }
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      alert('Failed to reject connection request. Please try again.');
    }
  };

  const handleViewProfile = (requestId: number) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    setSelectedUserId(null);
    setIsProfileOpen(true);
    (window as unknown as { __mm_profile_mock?: unknown }).__mm_profile_mock = {
      firstName: req.firstName,
      lastName: req.lastName,
      aboutMe: req.message,
      languages: [],
      hobbies: [],
      interests: [],
      city: req.city,
      country: req.country,
      profilePictureURL: req.profilePicture,
    };
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
                <Link
                  href="/connectionlist"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "connections"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Connection List
                </Link>
                <button
                  onClick={() => handleNavigation("requests")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === "requests"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Connection Requests
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
            <Link
              href="/connectionlist"
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "connections"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Connection List
            </Link>
            <button
              onClick={() => handleNavigation("requests")}
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                activeTab === "requests"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Connection Requests
            </button>
          </div>
        </div>
      </nav>

      {/* Profile Modal */}
      <ProfileModal
        userId={selectedUserId}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Profile Modal */}
      <ProfileModal
        userId={selectedUserId}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        initialProfile={(typeof window !== 'undefined' ? (window as unknown as { __mm_profile_mock?: unknown }).__mm_profile_mock as unknown : null) || null}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Connection Requests</h1>
            <p className="text-lg text-gray-600">
              Review and respond to connection requests from other users
            </p>
          </div>

          {/* Request Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Requests</p>
                  <p className="text-2xl font-semibold text-gray-900">{requests.length}</p>
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
                    {requests.filter(req => req.isOnline).length}
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
                  <p className="text-sm font-medium text-gray-500">With Messages</p>
                  <p className="text-2xl font-semibold text-gray-900">{requests.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Requests List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Pending Requests</h2>
            </div>
            
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
                <p className="mt-1 text-sm text-gray-500">You&apos;re all caught up! Check back later for new requests.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <div key={request.id} className="px-6 py-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {/* Profile Picture */}
                        <div className="relative">
                          {(() => {
                            const profilePicSrc = request.profilePicture && request.profilePicture.startsWith('http')
                              ? request.profilePicture
                              : request.profilePicture && request.profilePicture.startsWith('/uploads')
                              ? `http://localhost:8080${request.profilePicture}`
                              : request.profilePicture && request.profilePicture.startsWith('/')
                              ? request.profilePicture
                              : "/sitefiles/default-profile-picture.png";
                            
                            return (
                              <Image
                                src={profilePicSrc}
                                alt={`${request.firstName} ${request.lastName}`}
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
                          {request.isOnline && (
                            <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>

                        {/* Request Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {request.firstName} {request.lastName}
                            </h3>
                            {request.isOnline && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Online
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mb-2">
                            {request.city}, {request.country}
                          </p>
                          <p className="text-xs text-gray-400 mb-3">
                            Requested on {new Date(request.requestDate).toLocaleDateString()}
                            {!request.isOnline && ` • Last seen ${request.lastSeen}`}
                          </p>
                          
                          {/* Request Message */}
                          <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <p className="text-sm text-gray-700 italic">
                              &quot;{request.message}&quot;
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => handleViewProfile(request.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors text-left"
                        >
                          View Profile
                        </button>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Accept</span>
                          </button>
                          
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Reject</span>
                          </button>
                        </div>
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
