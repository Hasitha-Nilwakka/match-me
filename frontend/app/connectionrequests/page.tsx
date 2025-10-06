"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, connectionsApi } from "../../lib/api";
import Navigation from "../../components/Navigation";
import ProfileModal from "../../components/ProfileModal";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Load connection requests based on data mode
  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);

      // Real API call
      const payload = await connectionsApi.getConnectionRequests();
      const data = Array.isArray(payload) ? payload : payload?.requests ?? [];
      // Transform backend data to match frontend interface
      const transformedRequests: Request[] = data.map(
        (req: {
          id: number;
          userId: number;
          firstName: string;
          lastName: string;
          city?: string;
          country?: string;
          profilePicture?: string;
          requestDate: string;
          status: string;
        }) => ({
          id: req.id,
          firstName: req.firstName,
          lastName: req.lastName,
          city: req.city,
          country: req.country,
          profilePicture:
            req.profilePicture && req.profilePicture.startsWith("/")
              ? req.profilePicture
              : "/sitefiles/default-profile-picture.png",
          isOnline: false, // Backend doesn't provide online status yet
          lastSeen: "Recently",
          requestDate: req.requestDate,
          message: "Would like to connect with you!",
        })
      );
      setRequests(transformedRequests);
    } catch (error) {
      console.error("Error loading connection requests:", error);
      // Show empty list on error
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check authentication on page load
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push("/");
    } else {
      setIsAuthenticated(true);
      loadRequests();
    }
  }, [router, loadRequests]);

  const handleAcceptRequest = async (requestId: number) => {
    try {
      // Real API call
      await connectionsApi.acceptConnection(String(requestId));
      // Remove from requests after successful API call
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      console.log(`Accepted connection request ${requestId}`);
    } catch (error) {
      console.error("Error accepting connection request:", error);
      alert("Failed to accept connection request. Please try again.");
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      // Real API call
      await connectionsApi.rejectConnection(String(requestId));
      // Remove from requests after successful API call
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      console.log(`Rejected connection request ${requestId}`);
    } catch (error) {
      console.error("Error rejecting connection request:", error);
      alert("Failed to reject connection request. Please try again.");
    }
  };

  const handleViewProfile = (requestId: number) => {
    const req = requests.find((r) => r.id === requestId);
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
      <Navigation />

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
        initialProfile={
          (typeof window !== "undefined"
            ? ((window as unknown as { __mm_profile_mock?: unknown })
                .__mm_profile_mock as unknown)
            : null) || null
        }
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Connection Requests
            </h1>
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
                    <svg
                      className="w-5 h-5 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Pending Requests
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {requests.length}
                  </p>
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
                  <p className="text-sm font-medium text-gray-500">
                    Online Now
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {requests.filter((req) => req.isOnline).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    With Messages
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {requests.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Requests List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Pending Requests
              </h2>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No pending requests
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  You&apos;re all caught up! Check back later for new requests.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="px-6 py-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {/* Profile Picture */}
                        <div className="relative">
                          {(() => {
                            const profilePicSrc =
                              request.profilePicture &&
                              request.profilePicture.startsWith("http")
                                ? request.profilePicture
                                : request.profilePicture &&
                                  request.profilePicture.startsWith("/uploads")
                                ? `${
                                    process.env.NEXT_PUBLIC_API_URL ||
                                    (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
                                  }${request.profilePicture}`
                                : request.profilePicture &&
                                  request.profilePicture.startsWith("/")
                                ? request.profilePicture
                                : "/sitefiles/default-profile-picture.png";

                            return (
                              <Image
                                src={profilePicSrc}
                                alt={`${request.firstName} ${request.lastName}`}
                                width={60}
                                height={60}
                                className="rounded-full border-2 border-white shadow-sm object-cover"
                                style={{
                                  borderRadius: "50%",
                                  width: "60px",
                                  height: "60px",
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src =
                                    "/sitefiles/default-profile-picture.png";
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
                            Requested on{" "}
                            {new Date(request.requestDate).toLocaleDateString()}
                            {!request.isOnline &&
                              ` • Last seen ${request.lastSeen}`}
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
                      <div className="flex sm:flex-col flex-row sm:space-y-2 space-y-0 sm:space-x-0 space-x-2 ml-2 sm:ml-4">
                        <button
                          onClick={() => handleViewProfile(request.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors text-left"
                        >
                          View Profile
                        </button>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>Accept</span>
                          </button>

                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
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
