"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, connectionsApi, chatApi, getApiUrl } from "../../lib/api";
import { io } from "socket.io-client";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import Navigation from "../../components/Navigation";
import ProfileModal from "../../components/ProfileModal";
import PageErrorBoundary from "../../components/PageErrorBoundary";
import { useChat } from "../../context/ChatContext";

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

function ConnectionListPageContent() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [startingChatId, setStartingChatId] = useState<number | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const { openChat, isChatOpen } = useChat();
  const currentUser = authApi.getCurrentUser();
  const [toast, setToast] = useState<{open: boolean; msg: string}>({open:false, msg:""});

  // Shallow compare helper to avoid unnecessary state updates (and flicker)
  const areConnectionsEqual = (a: Connection[], b: Connection[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      const y = b[i];
      if (
        x.id !== y.id ||
        x.userId !== y.userId ||
        x.firstName !== y.firstName ||
        x.lastName !== y.lastName ||
        x.city !== y.city ||
        x.country !== y.country ||
        x.profilePicture !== y.profilePicture ||
        x.isOnline !== y.isOnline ||
        x.lastSeen !== y.lastSeen ||
        x.connectionDate !== y.connectionDate ||
        x.chatId !== y.chatId
      ) return false;
    }
    return true;
  };

  const isPageVisible = () => typeof document !== 'undefined' && document.visibilityState === 'visible';

  // Load connections based on data mode
  const loadConnections = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);

      // Real API call
      const response = await connectionsApi.getConnections();
      console.log("Connections API response:", response);

      // Handle different possible response structures
      let connectionsData = [];

      if (Array.isArray(response)) {
        // Direct array response
        connectionsData = response;
      } else if (response.success && response.data) {
        // Standard API response with success/data structure
        if (Array.isArray(response.data)) {
          connectionsData = response.data;
        } else if (
          response.data.connections &&
          Array.isArray(response.data.connections)
        ) {
          connectionsData = response.data.connections;
        }
      } else if (response.connections && Array.isArray(response.connections)) {
        // Direct connections property
        connectionsData = response.connections;
      }

      console.log("Extracted connections data:", connectionsData);

      if (connectionsData.length > 0) {
        // Transform backend data to match frontend interface
        const transformedConnections: Connection[] = connectionsData.map(
          (conn: {
            id: number;
            userId?: number;
            requesterId?: number;
            receiverId?: number;
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
            requester?: {
              id?: number;
              profile?: {
                city?: string;
                country?: string;
                profilePictureURL?: string;
              };
            };
            receiver?: {
              id?: number;
              profile?: {
                city?: string;
                country?: string;
                profilePictureURL?: string;
              };
            };
          }) => ({
            id: conn.id,
            // Determine counterpart userId robustly
            userId: (() => {
              // If API already provides userId, prefer it
              if (conn.userId) return conn.userId;
              // Try nested requester/receiver with IDs
              const meId = currentUser?.id;
              const reqId = conn.requester?.id ?? conn.requesterId;
              const recId = conn.receiver?.id ?? conn.receiverId;
              if (meId && reqId && recId) {
                return meId === reqId ? recId : reqId;
              }
              // Fallback: undefined
              return undefined;
            })(),
            firstName:
              conn.requesterName ||
              conn.receiverName ||
              conn.firstName ||
              "Unknown",
            lastName: conn.lastName || "",
            city:
              conn.requester?.profile?.city ||
              conn.receiver?.profile?.city ||
              conn.city ||
              "Unknown",
            country:
              conn.requester?.profile?.country ||
              conn.receiver?.profile?.country ||
              conn.country ||
              "Unknown",
            profilePicture:
              conn.requester?.profile?.profilePictureURL ||
              conn.receiver?.profile?.profilePictureURL ||
              conn.profilePicture ||
              "/sitefiles/default-profile-picture.png",
            isOnline: conn.isOnline || false,
            lastSeen: conn.lastSeen || "Recently",
            connectionDate: conn.createdAt || conn.connectionDate,
            chatId: conn.chatId,
          })
        );
        console.log("Transformed connections:", transformedConnections);
        // Keep a stable order, e.g., by connectionDate desc then name
        const sorted = [...transformedConnections].sort((a, b) => {
          const at = a.connectionDate ? new Date(a.connectionDate).getTime() : 0;
          const bt = b.connectionDate ? new Date(b.connectionDate).getTime() : 0;
          if (bt !== at) return bt - at;
          const an = `${a.firstName} ${a.lastName}`.toLowerCase();
          const bn = `${b.firstName} ${b.lastName}`.toLowerCase();
          return an.localeCompare(bn);
        });
        setConnections(prev => ((isChatOpen || !isPageVisible() || areConnectionsEqual(prev, sorted)) ? prev : sorted));
      } else {
        console.log("No connections found in response");
        setConnections(prev => (prev.length === 0 ? prev : []));
      }
    } catch (error) {
      console.error("Error loading connections:", error);
      // Show empty list on error
      setConnections(prev => prev);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [currentUser?.id, isChatOpen]);

  // Check authentication on page load
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push("/");
    } else {
      setIsAuthenticated(true);
      loadConnections();
    }
  }, [router, loadConnections]);

  // Real-time updates via Socket.IO per-user room
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const baseUrl = getApiUrl();
    const s = io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connection_updated', (evt: { status?: string }) => {
      // Only refresh on meaningful status transitions and when chat overlay is not open
      const status = evt?.status;
      if ((status === 'accepted' || status === 'rejected') && !isChatOpen && isPageVisible()) {
        if (startingChatId === null) loadConnections(true);
        if (status === 'accepted') setToast({ open: true, msg: 'Connection accepted' });
      }
    });

    s.on('connection_removed', () => {
      if (!isChatOpen && isPageVisible() && startingChatId === null) loadConnections(true);
    });

    return () => {
      s.disconnect();
    };
  }, [isAuthenticated, loadConnections, startingChatId, isChatOpen]);


  const handleStartChat = async (connection: Connection) => {
    console.log("[ConnectionList] handleStartChat called with:", connection);
    try {
      console.log(
        "[ConnectionList] Inside try block, setting startingChatId..."
      );
      setStartingChatId(connection.id);

      // Always create a new chat to ensure it works after deletion
      console.log(
        "[ConnectionList] Always creating new chat (ignoring existing chatId if any)"
      );

      // Otherwise, create (or fetch existing) chat with this user, then open it
      console.log(
        "[ConnectionList] StartChat clicked, connection:",
        connection
      );
      console.log("[ConnectionList] Checking userId...", connection.userId);
      if (!connection.userId) {
        console.error(
          "[ConnectionList] Missing userId for connection",
          connection.id
        );
        alert(
          "Cannot start chat: missing user id for this connection. Please refresh and try again."
        );
        return;
      }
      console.log("[ConnectionList] userId check passed, proceeding...");

      console.log(
        "[ConnectionList] Creating chat with userId:",
        connection.userId
      );
      console.log("[ConnectionList] About to call chatApi.createChat...");
      const res = await chatApi.createChat(connection.userId);
      console.log("[ConnectionList] Create chat response:", res);
      const newChatId = res?.data?.chat?.id ?? res?.chat?.id ?? res?.id;
      if (!newChatId) {
        console.error("Create chat response did not include id:", res);
        throw new Error("Failed to create or fetch chat (no id in response)");
      }

      openChat(newChatId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error starting chat:", message, error);
      alert(`Failed to start chat: ${message}`);
    } finally {
      setStartingChatId(null);
    }
  };

  const handleRemoveConnection = async (connectionId: number) => {
    try {
      // Call API to remove connection from backend
      await connectionsApi.deleteConnection(connectionId.toString());

      // Remove connection from the local list
      setConnections((prev) => prev.filter((conn) => conn.id !== connectionId));
      console.log(`Removed connection ${connectionId}`);
    } catch (error) {
      console.error("Failed to remove connection:", error);
      // You might want to show an error message to the user here
    }
  };

  const handleViewProfile = (connectionId: number) => {
    const conn = connections.find((c) => c.id === connectionId);
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
      <Navigation />

      <Toast open={toast.open} message={toast.msg} variant="success" onClose={() => setToast({open:false, msg:""})} />

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={confirmRemoveId !== null}
        title="Remove Connection"
        message="Are you sure you want to remove this connection?"
        confirmText="Remove"
        cancelText="Cancel"
        onCancel={() => setConfirmRemoveId(null)}
        onConfirm={async () => {
          if (confirmRemoveId !== null) {
            const id = confirmRemoveId;
            setConfirmRemoveId(null);
            await handleRemoveConnection(id);
          }
        }}
      />

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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Your Connections
            </h1>
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
                    {connections.filter((conn) => conn.isOnline).length}
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
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Profile Picture */}
                        <div className="relative">
                          {(() => {
                            const base = getApiUrl().replace(/\/$/, '');
                            const profilePicSrc =
                              connection.profilePicture &&
                              connection.profilePicture.startsWith("http")
                                ? connection.profilePicture
                                : connection.profilePicture &&
                                  connection.profilePicture.startsWith(
                                    "/uploads"
                                  )
                                ? `${base}${connection.profilePicture}`
                                : connection.profilePicture &&
                                  connection.profilePicture.startsWith("/")
                                ? connection.profilePicture
                                : "/sitefiles/default-profile-picture.png";

                            return (
                              <Image
                                src={profilePicSrc}
                                alt={`${connection.firstName} ${connection.lastName}`}
                                width={60}
                                height={60}
                                style={{
                                  borderRadius: "50%",
                                  width: "60px",
                                  height: "60px",
                                  objectFit: "cover",
                                }}
                                className="rounded-full border-2 border-white shadow-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src =
                                    "/sitefiles/default-profile-picture.png";
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
                        <div className="flex-1 min-w-0 sm:pr-6">
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
                            Connected on{" "}
                            {new Date(
                              connection.connectionDate
                            ).toLocaleDateString()}
                            {!connection.isOnline &&
                              ` • Last seen ${connection.lastSeen}`}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 sm:mt-0 flex sm:flex-col flex-row sm:space-y-2 space-y-0 sm:space-x-0 space-x-2 sm:ml-4 shrink-0">
                        <button
                          onClick={() => handleViewProfile(connection.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors px-2 py-1"
                        >
                          View Profile
                        </button>

                        <button
                          onClick={() => {
                            console.log("[ConnectionList] BUTTON CLICKED!");
                            console.log(
                              "[ConnectionList] DEBUG: Starting chat with connection:",
                              connection
                            );
                            console.log(
                              "[ConnectionList] DEBUG: connection.userId:",
                              connection.userId
                            );
                            console.log(
                              "[ConnectionList] DEBUG: startingChatId:",
                              startingChatId
                            );
                            console.log(
                              "[ConnectionList] DEBUG: connection.id:",
                              connection.id
                            );
                            console.log(
                              "[ConnectionList] DEBUG: disabled?",
                              startingChatId === connection.id
                            );
                            handleStartChat(connection);
                          }}
                          disabled={startingChatId === connection.id}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                          {startingChatId === connection.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Starting...</span>
                            </>
                          ) : (
                            <>
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
                              <span>Chat</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setConfirmRemoveId(connection.id)}
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

export default function ConnectionListPage() {
  return (
    <PageErrorBoundary pageName="Connection List">
      <ConnectionListPageContent />
    </PageErrorBoundary>
  );
}
