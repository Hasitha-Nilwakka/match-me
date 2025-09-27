"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authApi, chatApi } from "../../lib/api";
import { useDataMode } from "../../context/DataModeContext";
import PendingRequestsIndicator from "../../components/PendingRequestsIndicator";
import ChatSidebar from "../../components/ChatSidebar";
import UserSearchBox from "../../components/UserSearchBox";
import ChatBox from "../../components/ChatBox";
import DataModeToggle from "../../components/DataModeToggle";

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
    isRead: boolean;
    isDelivered: boolean;
  };
  otherUser: ChatUser;
}

export default function ChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const { mode } = useDataMode();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: number; email: string } | null>(null);
  const [messages, setMessages] = useState<Array<{
    id: number;
    chatId: number;
    content: string;
    senderId: number;
    createdAt: string;
    isRead: boolean;
    senderName?: string;
  }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Load messages for selected chat
  const loadMessages = useCallback(async (chatId: number) => {
    try {
      console.log('Loading messages for chat:', chatId);
      if (!chatId || chatId === undefined || chatId === null) {
        console.error('Invalid chatId provided to loadMessages:', chatId);
        setMessages([]);
        return;
      }
      const response = await chatApi.getChatMessages(chatId.toString());
      console.log('Messages response:', response);
      if (response.success && response.data && response.data.messages) {
        setMessages(response.data.messages);
        console.log('Messages loaded:', response.data.messages);
      } else {
        setMessages([]);
        console.log('No messages found');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  }, []);

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
              createdAt: "2024-01-15T14:45:00Z",
              isRead: false,
              isDelivered: true,
            },
            otherUser: {
              id: 2,
              name: "Sarah Johnson",
              profilePicture: "/sitefiles/default-profile-picture.png",
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
              createdAt: "2024-01-14T16:20:00Z",
              isRead: true,
              isDelivered: true,
            },
            otherUser: {
              id: 3,
              name: "Mike Chen",
              profilePicture: "/sitefiles/default-profile-picture.png",
              isOnline: false,
              lastSeen: "2024-01-14T18:30:00Z"
            }
          }
        ];
        
        setChats(mockChats);
      } else {
        // Real API call to GET /chats
        console.log('Loading real chats...');
        const response = await chatApi.getAllChats();
        console.log('Chats response:', response);
        if (response.success && response.data && response.data.chats) {
          setChats(response.data.chats);
          console.log('Chats loaded:', response.data.chats);
        } else {
          setChats([]);
          console.log('No chats found');
        }
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats([]);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  // Check authentication on page load
  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (!user) {
      router.push('/');
    } else {
      setCurrentUser(user);
      loadChats();
    }
  }, [router, loadChats]);

  const handleCreateChat = useCallback(async (userId: number) => {
    try {
      setIsCreatingChat(true);
      console.log('Creating chat with user:', userId);
      const response = await chatApi.createChat(userId);
      console.log('Create chat response:', response);
      if (response.success && response.data && response.data.chat) {
        const newChat = response.data.chat;
        console.log('New chat created:', newChat);
        console.log('New chat ID:', newChat.id, 'Type:', typeof newChat.id);
        
        // Validate that the chat has a valid ID
        if (!newChat.id || newChat.id === undefined || newChat.id === null) {
          console.error('Chat created but has no valid ID:', newChat);
          alert('Chat created but has no valid ID. Please refresh the page.');
          return;
        }
        
        setChats(prevChats => [newChat, ...prevChats]);
        setSelectedChatId(newChat.id);
        // Load messages for the new chat
        console.log('About to load messages for chat ID:', newChat.id);
        // Only load messages if we have a valid chat ID
        if (newChat.id && typeof newChat.id === 'number') {
          loadMessages(newChat.id);
        } else {
          console.warn('Skipping message load due to invalid chat ID:', newChat.id);
        }
        // Clear URL parameters
        router.replace('/chats');
      } else {
        console.error('Failed to create chat:', response);
        alert('Failed to create chat. Please try again.');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat. Please try again.');
    } finally {
      setIsCreatingChat(false);
    }
  }, [loadMessages, router]);

  // Handle URL parameters for creating new chats
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId && !isCreatingChat) {
      console.log('URL parameter userId found:', userId);
      const userIdNum = parseInt(userId);
      if (!isNaN(userIdNum)) {
        handleCreateChat(userIdNum);
      }
    }
  }, [searchParams, isCreatingChat, handleCreateChat]);

  // Auto-select first chat when chats are loaded
  useEffect(() => {
    console.log('Auto-select effect triggered:', { chatsLength: chats.length, selectedChatId });
    if (chats.length > 0 && !selectedChatId && !searchParams.get('userId')) {
      const firstChat = chats[0];
      console.log('Auto-selecting first chat:', firstChat);
      setSelectedChatId(firstChat.id);
      loadMessages(firstChat.id);
    }
  }, [chats, selectedChatId, loadMessages, searchParams]);

  const handleLogout = () => {
    authApi.logout();
    router.push("/");
  };

  const handleChatClick = (chatId: number) => {
    setSelectedChatId(chatId);
    // Load messages for the selected chat
    loadMessages(chatId);
    // Mark messages as read when chat is selected
    chatApi.markAsRead(chatId.toString()).then(() => {
      setChats(prevChats => prevChats.map(chat =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ));
    }).catch(console.error);
  };

  const handleDeleteChat = async (chatIdToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting chat when deleting
    if (window.confirm("Are you sure you want to delete this chat? This action cannot be undone.")) {
      try {
        await chatApi.deleteChat(chatIdToDelete.toString());
        setChats(prevChats => prevChats.filter(chat => chat.id !== chatIdToDelete));
        if (selectedChatId === chatIdToDelete) {
          setSelectedChatId(null);
        }
        // Reload chats to ensure UI consistency
        loadChats();
      } catch (error) {
        console.error("Error deleting chat:", error);
        alert("Failed to delete chat. Please try again.");
      }
    }
  };

  const handleMessageSend = async (content: string) => {
    if (!selectedChatId) return;
    try {
      await chatApi.sendMessage(selectedChatId.toString(), content);
      // Reload messages to show the new message
      loadMessages(selectedChatId);
      // Reload chats to update last message
      loadChats();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTypingStart = () => {
    setIsTyping(true);
  };

  const handleTypingStop = () => {
    setIsTyping(false);
  };

  if (isLoading || isCreatingChat) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isCreatingChat ? 'Creating new chat...' : 'Loading chats...'}
          </p>
        </div>
      </div>
    );
  }

  const selectedChat = chats.find(chat => chat.id === selectedChatId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
                  Connection List
                </Link>
                <Link
                  href="/connectionrequests"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition relative"
                >
                  Connection Requests
                  <PendingRequestsIndicator className="absolute -top-1 -right-1" />
                </Link>
                <Link
                  href="/chats"
                  className="px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700"
                >
                  Chats
                </Link>
              </div>
            </div>

            {/* Data Mode Toggle + Logout */}
            <div className="flex items-center gap-4">
              <DataModeToggle />
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
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/frontpage"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 w-full text-left"
            >
              Front Page
            </Link>
            <Link
              href="/profile"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 w-full text-left"
            >
              Profile
            </Link>
            <Link
              href="/connectionlist"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 w-full text-left"
            >
              Connection List
            </Link>
            <Link
              href="/connectionrequests"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 w-full text-left relative"
            >
              Connection Requests
              <PendingRequestsIndicator className="absolute top-1 right-1" />
            </Link>
            <Link
              href="/chats"
              className="block px-3 py-2 rounded-md text-base font-medium w-full text-left bg-blue-100 text-blue-700"
            >
              Chats
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      {chats.length === 0 ? (
        /* Empty State - No Chats */
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-500 mb-6">
              Start a conversation with your connections or search for users to chat with.
            </p>
            <div className="space-y-3">
              <Link
                href="/connectionlist"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Go to Connections
              </Link>
              <div className="text-sm text-gray-500">
                Or use the search box below to find users to chat with
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Chat List */}
          <ChatSidebar
            chats={chats}
            selectedChatId={selectedChatId}
            onChatSelect={handleChatClick}
            onChatDelete={(chatId) => handleDeleteChat(chatId, {} as React.MouseEvent)}
            currentUserId={currentUser?.id || 0}
          />

          {/* Right Side - Chat Box */}
          <div className="flex-1 flex flex-col bg-white border-l border-gray-200">
            <UserSearchBox 
              onUserSelect={(user) => console.log('User selected:', user)}
              onCreateChat={handleCreateChat}
            />
            <ChatBox
              selectedChat={selectedChat ? { id: selectedChat.id, otherUser: selectedChat.otherUser } : null}
              messages={messages}
              onMessageSend={handleMessageSend}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              isTyping={isTyping}
              currentUserId={currentUser?.id || 0}
              onCreateChat={handleCreateChat}
            />
          </div>
        </div>
      )}

      {/* Always show UserSearchBox at bottom for empty state */}
      {chats.length === 0 && (
        <div className="bg-white border-t border-gray-200 p-4">
          <UserSearchBox 
            onUserSelect={(user) => console.log('User selected:', user)}
            onCreateChat={handleCreateChat}
          />
        </div>
      )}
    </div>
  );
}