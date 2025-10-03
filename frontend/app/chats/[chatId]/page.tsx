"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { authApi, chatApi } from "../../../lib/api";

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName?: string;
}

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

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentUser = authApi.getCurrentUser();

  // Format time display
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

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check authentication and load chat data
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      loadChatData();
      connectWebSocket();
    }

    // Cleanup WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [router, chatId]);

  // Load chat messages and user info
  const loadChatData = async () => {
    try {
      setIsLoading(true);
      
      // Real API calls
      const [messagesData, chatData] = await Promise.all([
        chatApi.getChatMessages(chatId),
        chatApi.getAllChats() // Get chat info to find other user
      ]);
      
      setMessages(messagesData);
      // Extract other user from chat data
      const chat = chatData.find((c: Chat) => c.id === parseInt(chatId));
      if (chat) {
        setOtherUser(chat.otherUser);
      }
      
      // Mark messages as read
      await chatApi.markAsRead(chatId);
      
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to WebSocket for real-time messaging
  const connectWebSocket = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // TODO: Connect to real WebSocket endpoint
      // Use environment-aware WebSocket URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + `/chats/${chatId}/ws`;
      // const ws = new WebSocket(wsUrl);
      // For now, just log the connection attempt
      console.log(`Would connect to WebSocket: ${wsUrl}`);
      
      // Mock WebSocket setup
      // wsRef.current = ws;
      
      // ws.onopen = () => {
      //   console.log('WebSocket connected');
      // };
      
      // ws.onmessage = (event) => {
      //   const message = JSON.parse(event.data);
      //   setMessages(prev => [...prev, message]);
      // };
      
      // ws.onclose = () => {
      //   console.log('WebSocket disconnected');
      // };
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      
      // Real API call
      const sentMessage = await chatApi.sendMessage(chatId, newMessage);
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage("");
      
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Delete chat
  const handleDeleteChat = async () => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await chatApi.deleteChat(chatId);
      console.log('Chat deleted successfully');
      router.push('/chats'); // Redirect to chat list
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link 
              href="/chats"
              className="text-gray-500 hover:text-gray-700 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            {otherUser && (
              <>
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
                    {otherUser.profilePicture}
                  </div>
                  {otherUser.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{otherUser.name}</h2>
                  <p className="text-sm text-gray-500">
                    {otherUser.isOnline ? "Online" : `Last seen ${otherUser.lastSeen ? formatTime(otherUser.lastSeen) : "recently"}`}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/profile"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View Profile
            </Link>
            <button
              onClick={handleDeleteChat}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
              title="Delete conversation"
            >
              Delete Chat
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.senderId === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span>{formatTime(message.createdAt)}</span>
                      {isOwnMessage && (
                        <span className="ml-2">
                          {message.isRead ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t bg-white p-4">
            <div className="flex space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                className={`px-6 py-2 rounded-full font-medium transition ${
                  !newMessage.trim() || isSending
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
