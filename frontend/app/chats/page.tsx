"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, chatApi } from "../../lib/api";
import { useDataMode } from "../../context/DataModeContext";

interface ChatUser {
  id: number;
  name: string;
  profilePicture: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface Chat {
  id: number;
  connectionId: number;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage?: {
    id: number;
    content: string;
    senderId: number;
    createdAt: string;
  };
  otherUser: ChatUser;
}

export default function ChatsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const { mode } = useDataMode();

  // Load user's chats
  const loadChats = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (mode === "mock") {
        // Mock data for now
        const mockChats: Chat[] = [
          {
            id: 1,
            connectionId: 1,
            createdAt: "2024-01-15T10:30:00Z",
            updatedAt: "2024-01-15T14:45:00Z",
            unreadCount: 2,
            lastMessage: {
              id: 5,
              content: "Hey! How's your day going?",
              senderId: 2,
              createdAt: "2024-01-15T14:45:00Z"
            },
            otherUser: {
              id: 2,
              name: "Sarah Johnson",
              profilePicture: "👤",
              isOnline: true
            }
          },
          {
            id: 2,
            connectionId: 2,
            createdAt: "2024-01-14T09:15:00Z",
            updatedAt: "2024-01-14T16:20:00Z",
            unreadCount: 0,
            lastMessage: {
              id: 8,
              content: "Thanks for the recommendation!",
              senderId: 1,
              createdAt: "2024-01-14T16:20:00Z"
            },
            otherUser: {
              id: 3,
              name: "Mike Chen",
              profilePicture: "👤",
              isOnline: false,
              lastSeen: "2024-01-14T18:30:00Z"
            }
          }
        ];
        
        setChats(mockChats);
      } else {
        // Real API call to GET /chats
        const response = await chatApi.getAllChats();
        if (response.success && response.data && response.data.chats) {
          setChats(response.data.chats);
        } else {
          setChats([]);
        }
      }
    } catch (error) {
      console.error('Error loading chats:', error);
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
      loadChats();
    }
  }, [router, loadChats]);

  const handleLogout = () => {
    authApi.logout();
    router.push('/');
  };


  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleChatClick = (chatId: number) => {
    router.push(`/chats/${chatId}`);
  };

  // Delete a chat
  const handleDeleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await chatApi.deleteChat(chatId.toString());
      
      // Remove chat from local state
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      console.log('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chats...</p>
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
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition"
                >
                  Front Page
                </Link>
                <Link
                  href="/profile"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition"
                >
                  Profile
                </Link>
                <Link
                  href="/connectionlist"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition"
                >
                  Connections
                </Link>
                <Link
                  href="/connectionrequests"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition"
                >
                  Requests
                </Link>
                <span className="px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700">
                  Chats
                </span>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-2">
            Chat with your connections. Most recent conversations appear first.
          </p>
        </div>

        {/* Chat List */}
        {chats.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-600">
              Start connecting with people to begin chatting!
            </p>
            <Link
              href="/connectionlist"
              className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              View Connections
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border divide-y">
            {Array.isArray(chats) ? chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleChatClick(chat.id)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition group"
              >
                <div className="flex items-center space-x-4">
                  {/* Profile Picture */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
                      {chat.otherUser.profilePicture}
                    </div>
                    {/* Online Status */}
                    {chat.otherUser.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {chat.otherUser.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {chat.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {chat.unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : formatTime(chat.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1">
                      {chat.lastMessage ? (
                        <p className="text-sm text-gray-600 truncate">
                          {chat.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          No messages yet
                        </p>
                      )}
                    </div>
                    {!chat.otherUser.isOnline && chat.otherUser.lastSeen && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last seen {formatTime(chat.otherUser.lastSeen)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all p-2"
                      title="Delete conversation"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <div className="text-gray-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500">
                <p>Unable to load chats. Please try refreshing the page.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
