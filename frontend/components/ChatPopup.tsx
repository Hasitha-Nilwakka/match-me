"use client";
import { useState, useEffect, useRef } from "react";
import { authApi, chatApi } from "../lib/api";
import { useDataMode } from "../context/DataModeContext";

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
  unreadCount: number;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  otherUser: ChatUser;
}

interface ChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPopup({ isOpen, onClose }: ChatPopupProps) {
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = authApi.getCurrentUser();
  const { mode } = useDataMode();

  // Load chats when popup opens
  useEffect(() => {
    if (isOpen && chats.length === 0) {
      loadChats();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Load user's chats
  const loadChats = async () => {
    try {
      if (mode === "mock") {
        const mockChats: Chat[] = [
          {
            id: 1,
            connectionId: 1,
            unreadCount: 2,
            lastMessage: {
              content: "Hey! How's your day going?",
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
            unreadCount: 0,
            lastMessage: {
              content: "Thanks for the recommendation!",
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
        // Real API call
        const data = await chatApi.getAllChats();
        setChats(data);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  // Load messages for a specific chat
  const loadChatMessages = async (chatId: number) => {
    try {
      if (mode === "mock") {
        const mockMessages: Message[] = [
          {
            id: 1,
            chatId: chatId,
            senderId: 2,
            content: "Hi there! Nice to meet you!",
            isRead: true,
            createdAt: "2024-01-15T10:30:00Z",
            senderName: "Sarah Johnson"
          },
          {
            id: 2,
            chatId: chatId,
            senderId: currentUser?.id || 1,
            content: "Hey! Nice to meet you too. How are you doing?",
            isRead: true,
            createdAt: "2024-01-15T10:32:00Z",
            senderName: "You"
          },
          {
            id: 3,
            chatId: chatId,
            senderId: 2,
            content: "I'm doing great! Just got back from a hiking trip.",
            isRead: true,
            createdAt: "2024-01-15T10:35:00Z",
            senderName: "Sarah Johnson"
          }
        ];
        setMessages(mockMessages);
      } else {
        // Real API call
        const data = await chatApi.getChatMessages(chatId.toString());
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Open a specific chat
  const openChat = (chatId: number) => {
    setActiveChat(chatId);
    setIsMinimized(false);
    loadChatMessages(chatId);
  };

  // Delete a chat
  const handleDeleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening chat when clicking delete
    
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await chatApi.deleteChat(chatId.toString());
      
      // Remove chat from local state
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      // If this was the active chat, close it
      if (activeChat === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
      
      console.log('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !activeChat) return;

    try {
      setIsSending(true);
      
      if (mode === "mock") {
        const mockMessage: Message = {
          id: Date.now(),
          chatId: activeChat,
          senderId: currentUser?.id || 1,
          content: newMessage,
          isRead: false,
          createdAt: new Date().toISOString(),
          senderName: "You"
        };
        
        setMessages(prev => [...prev, mockMessage]);
        setNewMessage("");
      } else {
        // Real API call
        const sentMessage = await chatApi.sendMessage(activeChat.toString(), newMessage);
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage("");
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format time
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

  // Get total unread count
  const totalUnreadCount = chats.reduce((total, chat) => total + chat.unreadCount, 0);

  // Get current chat user
  const currentChatUser = activeChat ? chats.find(chat => chat.id === activeChat)?.otherUser : null;

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Popup Window */}
      <div className={`bg-white rounded-lg shadow-2xl border transition-all duration-300 ${
        isMinimized ? 'h-14' : 'h-96 w-80'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            {activeChat && currentChatUser ? (
              <>
                <button
                  onClick={() => setActiveChat(null)}
                  className="text-white hover:text-blue-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="relative">
                  <span className="text-lg">{currentChatUser.profilePicture}</span>
                  {currentChatUser.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium">{currentChatUser.name}</h3>
                  <p className="text-xs text-blue-100">
                    {currentChatUser.isOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Messages</span>
                {totalUnreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {totalUnreadCount}
                  </span>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:text-blue-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d={isMinimized ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="h-80 flex flex-col">
            {activeChat ? (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.map((message) => {
                    const isOwnMessage = message.senderId === currentUser?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[200px] px-3 py-2 rounded-lg text-sm ${
                            isOwnMessage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p>{message.content}</p>
                          <div className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.createdAt)}
                            {isOwnMessage && (
                              <span className="ml-1">
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
                <div className="border-t p-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition ${
                        !newMessage.trim() || isSending
                          ? 'bg-gray-300 text-gray-500'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Chat List */
              <div className="h-full overflow-y-auto">
                {chats.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center p-4">
                    <div>
                      <div className="text-gray-400 mb-2">
                        <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600">No conversations yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y">
                    {chats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => openChat(chat.id)}
                        className="p-3 hover:bg-gray-50 cursor-pointer transition group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                              {chat.otherUser.profilePicture}
                            </div>
                            {chat.otherUser.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 border border-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {chat.otherUser.name}
                              </h4>
                              <div className="flex items-center space-x-2">
                                {chat.unreadCount > 0 && (
                                  <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[16px] text-center">
                                    {chat.unreadCount}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => handleDeleteChat(chat.id, e)}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all p-1"
                                  title="Delete conversation"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {chat.lastMessage && (
                              <p className="text-xs text-gray-600 truncate">
                                {chat.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Chat Toggle Button Component
export function ChatToggleButton({ 
  onClick, 
  unreadCount = 0 
}: { 
  onClick: () => void; 
  unreadCount?: number; 
}) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
    >
      <div className="relative">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </button>
  );
}
