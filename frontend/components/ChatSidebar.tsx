"use client";
import Image from "next/image";
import { useState } from "react";
import { chatApi } from "../lib/api";

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

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId: number | null;
  onChatSelect: (chatId: number) => void;
  onChatDelete: (chatId: number) => void;
  currentUserId: number;
}

export default function ChatSidebar({
  chats,
  selectedChatId,
  onChatSelect,
  onChatDelete,
  currentUserId
}: ChatSidebarProps) {
  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);

  const handleDeleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    setDeletingChatId(chatId);
    
    try {
      await chatApi.deleteChat(chatId.toString());
      onChatDelete(chatId);
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    } finally {
      setDeletingChatId(null);
    }
  };

  const formatLastMessageTime = (dateString: string) => {
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

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No chats yet</p>
            <p className="text-sm mt-1">Start a conversation with someone!</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors relative group ${
                  selectedChatId === chat.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Profile Picture */}
                  <div className="relative">
                    <Image
                      src={chat.otherUser.profilePicture || "/sitefiles/default-profile-picture.png"}
                      alt={chat.otherUser.name}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                    {/* Online Status */}
                    {chat.otherUser.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {chat.otherUser.name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {chat.lastMessage ? formatLastMessageTime(chat.lastMessage.createdAt) : ""}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 truncate">
                        {chat.lastMessage ? (
                          chat.lastMessage.senderId === currentUserId ? (
                            <span className="text-gray-500">You: {truncateMessage(chat.lastMessage.content)}</span>
                          ) : (
                            truncateMessage(chat.lastMessage.content)
                          )
                        ) : (
                          "No messages yet"
                        )}
                      </p>
                      
                      {/* Unread Count */}
                      {chat.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    disabled={deletingChatId === chat.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                    title="Delete chat"
                  >
                    {deletingChatId === chat.id ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
