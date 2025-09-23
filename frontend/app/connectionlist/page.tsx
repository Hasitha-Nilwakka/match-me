"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, connectionsApi } from "../../lib/api";
import { log } from "console";

// Connection type definition
interface Connection {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  city?: string;
  country?: string;
  profilePicture: string;
  isOnline: boolean;
  lastSeen: string;
  connectionDate: string;
  status: string;
}

export default function ConnectionListPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("connections");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get a valid image URL
  const getValidImageUrl = (url: string | null | undefined): string => {
    if (!url || url.trim() === "") {
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

  // Check authentication and fetch connections on page load
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      console.log("Checking authentication...");
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      console.log("Token exists:", !!token);
      console.log("User exists:", !!user);

      if (!authApi.isAuthenticated()) {
        console.log("User not authenticated, redirecting to login");
        router.push("/");
      } else {
        console.log(
          "User authenticated, setting state and fetching connections"
        );
        setIsAuthenticated(true);
        await fetchConnections();
      }
    };

    checkAuthAndFetch();
  }, [router]);

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check token before making API call
      const token = localStorage.getItem("token");
      console.log(
        "Fetching connections with token:",
        token ? "Token exists" : "No token"
      );

      if (!token) {
        throw new Error("No authentication token found");
      }

      console.log("Making API call to fetch connections...");
      const response = await connectionsApi.getConnections();
      console.log("Connections response:", response);

      if (response.success && response.data && response.data.connections) {
        setConnections(response.data.connections);
      } else {
        console.warn(
          "No connections found or unexpected response format:",
          response
        );
        setConnections([]);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);

      // If it's an authentication error, redirect to login
      if (error instanceof Error && error.message.includes("401")) {
        console.log("Authentication error, clearing token and redirecting");
        authApi.logout();
        router.push("/");
        return;
      }

      setError(
        error instanceof Error ? error.message : "Failed to fetch connections"
      );
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push("/");
  };

  const handleNavigation = (tab: string) => {
    setActiveTab(tab);
  };

  const handleStartChat = (connectionId: number) => {
    // TODO: Implement start chat functionality
    console.log(`Starting chat with connection ${connectionId}`);
    // This would typically navigate to a chat page or open a chat modal
  };

  const handleRemoveConnection = async (connectionId: number) => {
    try {
      console.log(`Removing connection ${connectionId}`);
      await connectionsApi.deleteConnection(connectionId.toString());

      // Remove connection from the list (optimistic update)
      setConnections((prev: Connection[]) =>
        prev.filter((conn: Connection) => conn.id !== connectionId)
      );
      console.log(`Successfully removed connection ${connectionId}`);
    } catch (error) {
      console.error("Failed to remove connection:", error);
      // Show error message to user
      setError(
        error instanceof Error ? error.message : "Failed to remove connection"
      );
    }
  };

  const handleViewProfile = (connectionId: number) => {
    // TODO: Navigate to profile view page
    console.log(`Viewing profile for connection ${connectionId}`);
    // This would typically navigate to a profile view page
  };

  // Show loading screen while checking authentication or fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading connections...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  console.log(connections);

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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Debug Information (only in development) */}
          {/* {process.env.NODE_ENV === "development" && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              <strong>Debug Info:</strong>
              <ul className="mt-2 text-sm">
                <li>
                  • Token exists:{" "}
                  {!!localStorage.getItem("token") ? "Yes" : "No"}
                </li>
                <li>
                  • User data exists:{" "}
                  {!!localStorage.getItem("user") ? "Yes" : "No"}
                </li>
                <li>
                  • Is authenticated: {authApi.isAuthenticated() ? "Yes" : "No"}
                </li>
                <li>
                  • API URL:{" "}
                  {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}
                </li>
              </ul>
            </div>
          )} */}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Your Connections
            </h1>
            <p className="text-lg text-gray-600">
              Manage your connections and start conversations
            </p>

            {/* Error Message */}
            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>

                {/* If it's an auth error, show login button */}
                {error.includes("401") ||
                error.includes("not authenticated") ? (
                  <div className="mt-3">
                    <Link
                      href="/"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Go to Login
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setError(null);
                      fetchConnections();
                    }}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors mr-2"
                  >
                    Retry
                  </button>
                )}

                <button
                  onClick={() => setError(null)}
                  className="absolute top-0 bottom-0 right-0 px-4 py-3"
                >
                  <svg
                    className="fill-current h-6 w-6 text-red-500"
                    role="button"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Connection Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Connections
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {connections.length}
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
                    {
                      connections.filter((conn: Connection) => conn.isOnline)
                        .length
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
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Active Chats
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Connections List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                All Connections
              </h2>
            </div>

            {connections.length === 0 ? (
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No connections
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by finding some matches!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {connections.map((connection: Connection) => (
                  <div
                    key={connection.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Profile Picture */}
                        <div className="relative">
                          <Image
                            src={getValidImageUrl(connection.profilePicture)}
                            alt={`${connection.firstName} ${connection.lastName}`}
                            width={60}
                            height={60}
                            className="rounded-full border-2 border-white shadow-sm"
                          />
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
                            {connection.city && connection.country
                              ? `${connection.city}, ${connection.country}`
                              : "Location not available"}
                          </p>
                          <p className="text-xs text-gray-400">
                            Connected on{" "}
                            {new Date(
                              connection.connectionDate
                            ).toLocaleDateString()}
                            {!connection.isOnline &&
                              connection.lastSeen &&
                              ` • Last seen ${connection.lastSeen}`}
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
                          onClick={() => handleStartChat(connection.id)}
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
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          <span>Start Chat</span>
                        </button>

                        <button
                          onClick={() => handleRemoveConnection(connection.id)}
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
