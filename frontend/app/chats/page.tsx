"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, chatApi } from "../../lib/api";
import PendingRequestsIndicator from "../../components/PendingRequestsIndicator";
import ChatSidebar from "../../components/ChatSidebar";
import ChatBox from "../../components/ChatBox";

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

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName?: string;
}

export default function ChatsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("chats");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const currentUser = authApi.getCurrentUser();

  // Check authentication on page load
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      loadChats();
    }
  }, [router]);

  // Load user's chats
  const loadChats = async () => {
    try {
      const response = await chatApi.getAllChats();
      if (response.success && response.data) {
        setChats(response.data.chats || []);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages for selected chat
  const loadMessages = async (chatId: number) => {
    try {
      const response = await chatApi.getChatMessages(chatId.toString());
      if (response.success && response.data) {
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Handle chat selection
  const handleChatSelect = async (chatId: number) => {
    setSelectedChatId(chatId);
    await loadMessages(chatId);
    
    // Mark messages as read
    try {
      await chatApi.markAsRead(chatId.toString());
      // Update unread count in chat list
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }

    // Setup WebSocket connection
    setupWebSocketConnection(chatId);
  };

  // Setup WebSocket connection for real-time features
  const setupWebSocketConnection = (chatId: number) => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = chatApi.createWebSocketConnection(chatId.toString(), (message: any) => {
        console.log('WebSocket message received:', message);
        
        switch (message.type) {
          case 'new_message':
            setMessages(prev => [...prev, message.data]);
            // Update chat list with new last message
            setChats(prev => prev.map(chat => 
              chat.id === chatId 
                ? { 
                    ...chat, 
                    lastMessage: message.data,
                    unreadCount: message.data.senderId !== currentUser?.id 
                      ? chat.unreadCount + 1 
                      : chat.unreadCount
                  }
                : chat
            ));
            break;
          case 'typing_start':
            if (message.userId !== currentUser?.id) {
              setOtherUserTyping(true);
            }
            break;
          case 'typing_stop':
            if (message.userId !== currentUser?.id) {
              setOtherUserTyping(false);
            }
            break;
          case 'message_read':
            // Update message read status
            setMessages(prev => prev.map(msg => 
              msg.id === message.messageId ? { ...msg, isRead: true } : msg
            ));
            break;
        }
      });

      wsRef.current = ws;
    } catch (error) {
      console.error('Error setting up WebSocket connection:', error);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!selectedChatId) return;

    try {
      const response = await chatApi.sendMessage(selectedChatId.toString(), content);
      if (response.success && response.data) {
        // Message will be added via WebSocket
        console.log('Message sent successfully');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Handle chat deletion
  const handleChatDelete = (chatId: number) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
      setMessages([]);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  };

  // Handle creating new chat
  const handleCreateChat = async (userId: number) => {
    try {
      // For now, we'll find an existing chat or create a new one
      // In a real implementation, you'd have a dedicated API endpoint
      const existingChat = chats.find(chat => 
        chat.otherUser.id === userId
      );
      
      if (existingChat) {
        handleChatSelect(existingChat.id);
      } else {
        // Create new chat logic would go here
        console.log('Creating new chat with user:', userId);
        // For now, just reload chats
        await loadChats();
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  // Handle typing indicators
  const handleTypingStart = () => {
    // Send typing start event via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing_start',
        chatId: selectedChatId
      }));
    }
  };

  const handleTypingStop = () => {
    // Send typing stop event via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing_stop',
        chatId: selectedChatId
      }));
    }
  };

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleNavigation = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case "profile":
        router.push("/profile");
        break;
      case "connections":
        router.push("/connectionlist");
        break;
      case "requests":
        router.push("/connectionrequests");
        break;
      case "frontpage":
        router.push("/frontpage");
        break;
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push('/');
  };

  const selectedChat = selectedChatId ? chats.find(chat => chat.id === selectedChatId) : null;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/frontpage" className="flex items-center">
                <Image
                  src="/sitefiles/site-logo-web.png"
                  alt="Match Me"
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                />
                <span className="ml-2 text-xl font-bold text-gray-900">Match Me</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
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
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition relative"
                >
                  Requests
                  <PendingRequestsIndicator className="absolute -top-1 -right-1" />
                </Link>
                <button
                  onClick={() => handleNavigation("chats")}
                  className="px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700"
                >
                  Chats
                </button>
              </div>
            </div>

            {/* Logout Button */}
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-gray-100 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/frontpage"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            >
              Front Page
            </Link>
            <Link
              href="/profile"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            >
              Profile
            </Link>
            <Link
              href="/connectionlist"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            >
              Connections
            </Link>
            <Link
              href="/connectionrequests"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 relative"
            >
              Requests
              <PendingRequestsIndicator className="absolute top-1 right-1" />
            </Link>
            <button
              onClick={() => handleNavigation("chats")}
              className="block px-3 py-2 rounded-md text-base font-medium bg-blue-100 text-blue-700 w-full text-left"
            >
              Chats
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Chat Sidebar */}
        <ChatSidebar
          chats={chats}
          selectedChatId={selectedChatId}
          onChatSelect={handleChatSelect}
          onChatDelete={handleChatDelete}
          currentUserId={currentUser?.id || 0}
        />

        {/* Chat Box */}
        <ChatBox
          selectedChat={selectedChat}
          messages={messages}
          onMessageSend={handleSendMessage}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          isTyping={otherUserTyping}
          currentUserId={currentUser?.id || 0}
          onCreateChat={handleCreateChat}
        />
      </div>
    </div>
  );
}