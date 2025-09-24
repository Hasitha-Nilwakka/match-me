"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, connectionsApi } from "../../lib/api";
import PendingRequestsIndicator from "../../components/PendingRequestsIndicator";

// Interface for connection request data
interface ConnectionRequest {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  profilePicture: string;
  requestDate: string;
  status: string;
}

export default function ConnectionRequestsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("requests");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);

  // Helper function to get a valid image URL
  const getValidImageUrl = (url: string | null | undefined): string => {
    if (!url || url.trim() === "") {
      return "/sitefiles/default-profile-picture.png";
    }

    // Check if it contains emojis or non-ASCII characters that would break image URLs
    const hasInvalidChars = /[^\x00-\x7F]/.test(url);
    if (hasInvalidChars) {
      return "/sitefiles/default-profile-picture.png";
    }

    // If it's an uploads path, construct the full backend URL
    if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
      const cleanPath = url.startsWith("/") ? url : `/${url}`;
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      return `${backendUrl}${cleanPath}`;
    }

    // Check if it's a valid URL format (relative or absolute)
    try {
      // Handle relative URLs (starting with /)
      if (url.startsWith("/")) {
        return url;
      }
      // Handle absolute URLs
      new URL(url);
      return url;
    } catch {
      return "/sitefiles/default-profile-picture.png";
    }
  };

  // Load connection requests from API
  const loadConnectionRequests = async () => {
    try {
      setIsLoadingRequests(true);
      console.log("Loading connection requests...");
      const response = await connectionsApi.getConnectionRequests();
      console.log("Connection requests response:", response);

      if (response.success && response.data && response.data.requests) {
        setRequests(response.data.requests);
      } else {
        console.warn("No requests data or invalid format:", response);
        setRequests([]);
      }
    } catch (error) {
      console.error("Error loading connection requests:", error);
      setRequests([]);
      // Don't show error to user if this is expected (no requests)
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Check authentication on page load
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push("/");
    } else {
      setIsAuthenticated(true);
      setIsLoading(false);
      loadConnectionRequests();
    }
  }, [router]);

  const handleLogout = () => {
    authApi.logout();
    router.push("/");
  };

  const handleNavigation = (tab: string) => {
    setActiveTab(tab);
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      console.log("Accepting connection request:", requestId);
      await connectionsApi.updateConnection(requestId.toString(), "accepted");

      // Remove from requests list (optimistic update)
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      console.log(`Accepted connection request ${requestId}`);
    } catch (error) {
      console.error("Error accepting connection request:", error);
      alert("Failed to accept connection request. Please try again.");
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      console.log("Rejecting connection request:", requestId);
      await connectionsApi.updateConnection(requestId.toString(), "rejected");

      // Remove from requests list (optimistic update)
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      console.log(`Rejected connection request ${requestId}`);

      alert("Connection request rejected.");
    } catch (error) {
      console.error("Error rejecting connection request:", error);
      alert("Failed to reject connection request. Please try again.");
    }
  };

  const handleViewProfile = (requestId: number) => {
    // TODO: Navigate to profile view page
    console.log(`Viewing profile for request ${requestId}`);
    // This would typically navigate to a profile view page
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
                  className={`px-3 py-2 rounded-md text-sm font-medium transition relative ${
                    activeTab === "requests"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  Connection Requests
                  <PendingRequestsIndicator className="absolute -top-1 -right-1" />
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
              className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left relative ${
                activeTab === "requests"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              Connection Requests
              <PendingRequestsIndicator className="absolute top-1 right-1" />
            </button>
          </div>
        </div>
      </nav>

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
                    <svg
                      className="w-5 h-5 text-green-600"
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
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">New Today</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {
                      requests.filter((req) => {
                        const requestDate = new Date(req.requestDate);
                        const today = new Date();
                        return (
                          requestDate.toDateString() === today.toDateString()
                        );
                      }).length
                    }
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    From Cities
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {
                      new Set(
                        requests.map((req) => req.city).filter((city) => city)
                      ).size
                    }
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
              {isLoadingRequests && (
                <div className="flex items-center mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-600">
                    Loading requests...
                  </span>
                </div>
              )}
            </div>

            {!isLoadingRequests && requests.length === 0 ? (
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
                          <Image
                            src={getValidImageUrl(request.profilePicture)}
                            alt={`${request.firstName} ${request.lastName}`}
                            width={60}
                            height={60}
                            className="rounded-full border-2 border-white shadow-sm"
                          />
                        </div>

                        {/* Request Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {request.firstName} {request.lastName}
                            </h3>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New Request
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mb-2">
                            {request.city && request.country
                              ? `${request.city}, ${request.country}`
                              : "Location not specified"}
                          </p>
                          <p className="text-xs text-gray-400 mb-3">
                            Requested on{" "}
                            {new Date(request.requestDate).toLocaleDateString()}
                          </p>

                          {/* Connection request notice */}
                          <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">
                                {request.firstName}
                              </span>{" "}
                              would like to connect with you.
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
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
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
