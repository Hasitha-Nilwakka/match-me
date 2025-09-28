"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { chatApi } from "../lib/api";
import UserSearchBox from "./UserSearchBox";

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

interface ChatBoxProps {
  selectedChat: {
    id: number;
    otherUser: ChatUser;
  } | null;
  messages: Message[];
  onMessageSend: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  isTyping: boolean;
  currentUserId: number;
  onCreateChat: (userId: number) => void;
}

export default function ChatBox({
  selectedChat,
  messages,
  onMessageSend,
  onTypingStart,
  onTypingStop,
  isTyping,
  currentUserId,
  onCreateChat
}: ChatBoxProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Send typing start event
    if (value.length > 0 && !typingTimeoutRef.current) {
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout for typing stop
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
      typingTimeoutRef.current = null;
    }, 1000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await onMessageSend(newMessage.trim());
      setNewMessage("");
      onTypingStop(); // Stop typing indicator
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleUserSelect = (user: { id: number }) => {
    onCreateChat(user.id);
    setShowUserSearch(false);
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full">
      {selectedChat ? (
        <>
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {selectedChat.otherUser.profilePicture && selectedChat.otherUser.profilePicture.startsWith('/') ? (
                  <Image
                    src={selectedChat.otherUser.profilePicture}
                    alt={selectedChat.otherUser.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                    {selectedChat.otherUser.profilePicture || '👤'}
                  </div>
                )}
                {selectedChat.otherUser.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{selectedChat.otherUser.name}</h3>
                <p className="text-sm text-gray-500">
                  {selectedChat.otherUser.isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p>No messages yet</p>
                <p className="text-sm mt-1">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === currentUserId
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={`flex items-center justify-end mt-1 space-x-1 ${
                      message.senderId === currentUserId ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">{formatMessageTime(message.createdAt)}</span>
                      {message.senderId === currentUserId && (
                        <span className="text-xs">
                          {message.isRead ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a chat to start messaging</h3>
            <p className="text-gray-500 mb-6">Choose a conversation from the sidebar or search for someone new</p>
            
            <button
              onClick={() => setShowUserSearch(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Start New Chat
            </button>
          </div>
        </div>
      )}

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Start New Chat</h3>
              <button
                onClick={() => setShowUserSearch(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <UserSearchBox
              onUserSelect={handleUserSelect}
              onCreateChat={onCreateChat}
            />
          </div>
        </div>
      )}
    </div>
  );
}
