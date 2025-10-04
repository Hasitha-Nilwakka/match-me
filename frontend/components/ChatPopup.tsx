"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { authApi, chatApi } from "../lib/api";
import { useChat } from "../context/ChatContext";

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
  isTyping?: boolean;
}

interface ChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onChatDeleted?: (chatId: number) => void;
}

export default function ChatPopup({ isOpen, onClose, onChatDeleted }: ChatPopupProps) {
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recentWsAtRef = useRef<number>(0);
  const currentUser = authApi.getCurrentUser();
  const mode = "real" as const;
  const { targetChatId, clearTargetChat } = useChat();

  // Debug mode changes for chat popup
  useEffect(() => {
    console.log('[ChatPopup] Data mode is', mode);
  }, [mode]);

  // Load/reload chats when popup opens or data mode changes
  useEffect(() => {
    if (isOpen) {
      // Reset state when switching modes to avoid stale mock/live data
      setActiveChat(null);
      setMessages([]);
      setChats([]);
      loadChats();
      
      // Mark user as online when chat popup opens
      console.log('[ChatPopup] Setting user online');
      authApi.updateOnlineStatus(true).then(() => {
        console.log('[ChatPopup] Successfully set user online');
      }).catch((error) => {
        console.error('[ChatPopup] Failed to set user online:', error);
      });
    }
  }, [isOpen, mode]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-scroll when typing indicator appears/disappears
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [otherUserTyping]);

  // Live refresh of chats (and online indicators) while popup is open
  useEffect(() => {
    if (!isOpen) return;
    const intervalId = setInterval(() => {
      // Silent refresh of chat list to get updated isOnline/lastSeen
      loadChats();
    }, 10000); // 10s
    return () => clearInterval(intervalId);
  }, [isOpen, mode]);

  // Auto-open target chat when chats are loaded and targetChatId is set
  useEffect(() => {
    console.log('[ChatPopup] Auto-open useEffect triggered, targetChatId:', targetChatId, 'chats.length:', chats.length);
    if (targetChatId && chats.length > 0) {
      const targetChat = chats.find(chat => chat.id === targetChatId);
      console.log('[ChatPopup] Found target chat:', targetChat);
      if (targetChat) {
        console.log('[ChatPopup] Setting activeChat to:', targetChatId);
        setActiveChat(targetChatId);
        loadChatMessages(targetChatId);
        // Clear the targetChatId after opening to prevent auto-opening on subsequent popup opens
        clearTargetChat();
      }
    }
  }, [targetChatId, chats, clearTargetChat]);

  // Load user's chats
  const loadChats = async () => {
    try {
      // Check if user is authenticated before making API calls
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[ChatPopup] User not authenticated, skipping chat load');
        setChats([]);
        return;
      }

      // Real API call
      const data = await chatApi.getAllChats();
      console.log('[ChatPopup] Raw API response:', data);
      const chatsData = Array.isArray(data) ? data : (data?.chats || []);
      console.log('[ChatPopup] Processed chats data:', chatsData);
      
      // Debug profile pictures in the response
      chatsData.forEach((chat: Chat, index: number) => {
        console.log(`[ChatPopup] Chat ${index} otherUser:`, chat.otherUser);
        if (chat.otherUser) {
          console.log(`[ChatPopup] Chat ${index} profilePicture:`, chat.otherUser.profilePicture);
        }
      });
      
      setChats(chatsData);
    } catch (error) {
      console.error('[ChatPopup] Error loading chats:', error);
      // Show empty chats on error
      setChats([]);
    }
  };

  // Load messages for a specific chat
  const loadChatMessages = async (chatId: number) => {
    try {
      // Real API call
      const data = await chatApi.getChatMessages(chatId.toString());
      console.log('[ChatPopup] Raw messages API response for chat', chatId, ':', data);
      const messagesData = Array.isArray(data) ? data : (data?.messages || []);
      console.log('[ChatPopup] Processed messages data:', messagesData);
      // Sort messages by creation time (oldest first)
      const sortedMessages = messagesData.sort((a: { createdAt: string }, b: { createdAt: string }) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      console.log('[ChatPopup] Sorted messages:', sortedMessages);
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  // Open a specific chat
  const openChat = (chatId: number) => {
    console.log('[ChatPopup] openChat called with chatId:', chatId);
    setActiveChat(chatId);
    setIsMinimized(false);
    loadChatMessages(chatId);
    // Refresh chat list to ensure new chats appear
    loadChats();
    // Mark as read immediately when opening and zero unread locally
    chatApi.markAsRead(chatId.toString())
      .then(() => {
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
      })
      .catch((err) => console.error('Failed to mark messages as read:', err));
  };

  // WebSocket connection for active chat
  useEffect(() => {
    console.log('[ChatPopup] WebSocket useEffect triggered, activeChat:', activeChat);
    console.log('[ChatPopup] isOpen:', isOpen);
    console.log('[ChatPopup] chats.length:', chats.length);
    
    // Cleanup any existing connection
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* noop */ }
      wsRef.current = null;
    }

    if (!activeChat) {
      console.log('[ChatPopup] No active chat, skipping WebSocket setup');
      return;
    }
    
    console.log('[ChatPopup] Setting up WebSocket for chat:', activeChat);
    console.log('[ChatPopup] Current user ID:', currentUser?.id);
    console.log('[ChatPopup] Token exists:', !!localStorage.getItem('token'));
    
    try {
      const ws = chatApi.createWebSocketConnection(
        activeChat.toString(), 
        (incoming: unknown) => {
          console.log('[ChatPopup] WebSocket message received:', incoming);
          console.log('[ChatPopup] WebSocket connection state:', ws?.readyState);
          
          // Expecting ChatMessage shape
          const msg = incoming as Message;
          if (!msg || typeof msg !== 'object') {
            console.log('[ChatPopup] Invalid message format:', msg);
            return;
          }
          
          console.log('[ChatPopup] Adding message to state:', msg);
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(m => m.id === msg.id);
            if (exists) {
              console.log('[ChatPopup] Message already exists, skipping:', msg.id);
              return prev;
            }
            const newMessage = {
              id: msg.id,
              chatId: activeChat,
              senderId: msg.senderId,
              content: msg.content,
              isRead: Boolean(msg.isRead),
              createdAt: msg.createdAt,
              senderName: msg.senderName,
            };
            // Insert in correct sorted position (oldest first)
            const updated = [...prev, newMessage];
            recentWsAtRef.current = Date.now();
            return updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });

          // If the incoming message belongs to the active chat and is from the other user,
          // immediately mark as read and keep unread badge at zero
          const fromOtherUser = msg.senderId !== currentUser?.id;
          if (fromOtherUser) {
            chatApi.markAsRead(activeChat.toString()).catch(() => {});
          }
          setChats(prev => prev.map(c => c.id === activeChat ? { ...c, unreadCount: 0 } : c));
        },
        (typingData: unknown) => {
          const data = typingData as { isTyping: boolean; userId: number; chatId: number };
          if (data && data.userId !== currentUser?.id) {
            setOtherUserTyping(data.isTyping);
            
            // Update typing status in chat list
            setChats(prev => {
              const updated = prev.map(chat => 
                chat.id === data.chatId 
                  ? { ...chat, isTyping: data.isTyping }
                  : chat
              );
              return updated;
            });
          }
        }
      );
      wsRef.current = ws;
    } catch (error) {
      console.error('[ChatPopup] Failed to open WebSocket for chat', activeChat, error);
    }

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* noop */ }
        wsRef.current = null;
      }
    };
  }, [activeChat, currentUser?.id]);

  // Disabled polling - using WebSocket only for real-time updates
  // useEffect(() => {
  //   if (!activeChat || !isOpen) return;
  //   // Polling disabled to prevent message order conflicts
  // }, [activeChat, isOpen]);

  // Filter chats based on search query
  const filteredChats = React.useMemo(() => {
    if (!chatSearchQuery.trim()) return chats;
    
    const query = chatSearchQuery.toLowerCase().trim();
    return chats.filter(chat => {
      // Search in user name
      const userNameMatch = chat.otherUser.name.toLowerCase().includes(query);
      
      // Search in last message content
      const messageMatch = chat.lastMessage?.content.toLowerCase().includes(query) || false;
      
      return userNameMatch || messageMatch;
    });
  }, [chats, chatSearchQuery]);

  // Filter messages based on search query
  const filteredMessages = React.useMemo(() => {
    if (!messageSearchQuery.trim()) return messages;
    
    const query = messageSearchQuery.toLowerCase().trim();
    return messages.filter(message => 
      message.content.toLowerCase().includes(query)
    );
  }, [messages, messageSearchQuery]);

  // Find all message indices that match the search query
  const searchMatches = React.useMemo(() => {
    if (!messageSearchQuery.trim()) return [];
    
    const query = messageSearchQuery.toLowerCase().trim();
    const matches: number[] = [];
    
    messages.forEach((message, index) => {
      if (message.content.toLowerCase().includes(query)) {
        matches.push(index);
      }
    });
    
    return matches;
  }, [messages, messageSearchQuery]);

  // Handle search navigation
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;
    
    if (direction === 'next') {
      setCurrentSearchIndex(prev => 
        prev === -1 ? 0 : (prev + 1) % searchMatches.length
      );
    } else {
      setCurrentSearchIndex(prev => 
        prev === -1 ? searchMatches.length - 1 : (prev - 1 + searchMatches.length) % searchMatches.length
      );
    }
  };

  // Highlight search terms in message content
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F to open message search
      if (e.ctrlKey && e.key === 'f' && activeChat && isOpen) {
        e.preventDefault();
        setShowMessageSearch(true);
        setMessageSearchQuery("");
      }
      
      // Escape to close search
      if (e.key === 'Escape') {
        setShowMessageSearch(false);
        setMessageSearchQuery("");
        setCurrentSearchIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeChat, isOpen]);

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
      
      // If this was the active chat, close it and clear targetChatId
      if (activeChat === chatId) {
        setActiveChat(null);
        setMessages([]);
        // Clear the targetChatId from context so new chats can be opened
        clearTargetChat();
      }
      
      // Notify parent component that chat was deleted
      onChatDeleted?.(chatId);
      
      console.log('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !activeChat) return;

    const messageContent = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      chatApi.sendTypingIndicator(wsRef.current!, false);
    }
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      setIsSending(true);
      
      // Real API call
      const sentMessage = await chatApi.sendMessage(activeChat.toString(), messageContent);
      console.log('Message sent successfully:', sentMessage);
      
      // Add message to local state immediately with server response data
      if (sentMessage && sentMessage.data) {
        const serverMessage = sentMessage.data;
        setMessages(prev => {
          // Check if already exists to avoid duplicates
          const exists = prev.some(m => m.id === serverMessage.id);
          if (exists) {
            return prev;
          }
          const newMessage = {
            id: serverMessage.id,
            chatId: activeChat,
            senderId: serverMessage.senderId,
            content: serverMessage.content,
            isRead: Boolean(serverMessage.isRead),
            createdAt: serverMessage.createdAt,
            senderName: serverMessage.senderName,
          };
          // Insert in correct sorted position (oldest first)
          const updated = [...prev, newMessage];
          return updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message if sending failed
      setNewMessage(messageContent);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing indicator
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && e.target.value.trim()) {
      console.log('[ChatPopup] Starting typing indicator');
      setIsTyping(true);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        chatApi.sendTypingIndicator(wsRef.current, true);
        console.log('[ChatPopup] Sent typing start via WebSocket');
      } else {
        console.log('[ChatPopup] WebSocket not ready, cannot send typing indicator');
      }
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        console.log('[ChatPopup] Stopping typing indicator (timeout)');
        setIsTyping(false);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          chatApi.sendTypingIndicator(wsRef.current, false);
          console.log('[ChatPopup] Sent typing stop via WebSocket');
        }
      }
    }, 1000);
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  // Robust date parsing: respect provided timezone; if none, treat as local
  const parseServerDate = (dateString: string) => {
    if (!dateString) return null as unknown as Date;
    // If backend includes timezone (Z or +hh:mm) use it; otherwise parse as local time
    return new Date(dateString);
  };

  // Format time for clock display (HH:MM)
  const formatClockTime = (dateString: string) => {
    if (!dateString) return "";
    
    const date = parseServerDate(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "";
    }
    
    // Use local timezone instead of 'en-US' to get correct timezone
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false // Use 24-hour format
    });
  };

  // Format date for date separators
  const formatDateSeparator = (dateString: string) => {
    if (!dateString) return "";
    
    const date = parseServerDate(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "";
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return "Today";
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  // Check if two dates are on different days
  const isDifferentDay = (date1: string, date2: string) => {
    if (!date1 || !date2) return true;
    
    const d1 = parseServerDate(date1);
    const d2 = parseServerDate(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return true;
    
    return d1.toDateString() !== d2.toDateString();
  };

  // Normalize chats to an array to avoid runtime errors and apply search filter
  const chatsArray: Chat[] = Array.isArray(filteredChats) ? filteredChats : [];

  // Get total unread count
  const totalUnreadCount = chatsArray.reduce((total, chat) => total + chat.unreadCount, 0);

  // Get current chat user
  const currentChatUser = activeChat ? chatsArray.find(chat => chat.id === activeChat)?.otherUser : null;

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
                  {(() => {
                    console.log('[ChatPopup] Current chat user profile picture:', currentChatUser.profilePicture);
                    console.log('[ChatPopup] Current chat user:', currentChatUser);
                    
                    // Handle different profile picture formats
                    let profilePicSrc = "/sitefiles/default-profile-picture.png"; // Default fallback
                    
                    if (currentChatUser.profilePicture) {
                      // Check if it's an emoji (like 👤) or empty string
                      if (currentChatUser.profilePicture === '👤' || currentChatUser.profilePicture.trim() === '') {
                        profilePicSrc = "/sitefiles/default-profile-picture.png";
                      }
                      // Check if it's a full HTTP URL
                      else if (currentChatUser.profilePicture.startsWith('http')) {
                        profilePicSrc = currentChatUser.profilePicture;
                      }
                      // Check if it's an upload path
                      else if (currentChatUser.profilePicture.startsWith('/uploads')) {
                        profilePicSrc = `http://192.168.101.115:8080${currentChatUser.profilePicture}`;
                      }
                      // Check if it's a local path
                      else if (currentChatUser.profilePicture.startsWith('/')) {
                        profilePicSrc = currentChatUser.profilePicture;
                      }
                      // For any other case, use default
                      else {
                        profilePicSrc = "/sitefiles/default-profile-picture.png";
                      }
                    }
                    
                    console.log('[ChatPopup] Final profile picture src:', profilePicSrc);
                    
                    return (
                      <Image
                        src={profilePicSrc}
                        alt={currentChatUser.name}
                        width={24}
                        height={24}
                        className="rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/sitefiles/default-profile-picture.png";
                        }}
                      />
                    );
                  })()}
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
                {/* Chat Header with Search */}
                <div className="p-3 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setActiveChat(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="font-medium text-gray-900">
                        {currentChatUser?.name || 'Chat'}
                      </span>
                    </div>
                    
                    {/* Message Search Button */}
                    <button
                      onClick={() => setShowMessageSearch(!showMessageSearch)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Search messages (Ctrl+F)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>

                  {/* Message Search Bar */}
                  {showMessageSearch && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Search messages..."
                            value={messageSearchQuery}
                            onChange={(e) => {
                              setMessageSearchQuery(e.target.value);
                              setCurrentSearchIndex(-1);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            autoFocus
                          />
                        </div>
                        
                        {messageSearchQuery && searchMatches.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">
                              {currentSearchIndex + 1} of {searchMatches.length}
                            </span>
                            <button
                              onClick={() => navigateSearch('prev')}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Previous match"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => navigateSearch('next')}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Next match"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        )}
                        
                        <button
                          onClick={() => {
                            setShowMessageSearch(false);
                            setMessageSearchQuery("");
                            setCurrentSearchIndex(-1);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Close search"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {messageSearchQuery && searchMatches.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">No messages found</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {(() => {
                    const safeMessages = Array.isArray(messageSearchQuery ? filteredMessages : messages) ? 
                      (messageSearchQuery ? filteredMessages : messages).filter((m) => !!m) : [];
                    return safeMessages
                      .slice()
                      // Don't reverse - show newest at bottom (oldest first)
                      .map((message, index, reversedMessages) => {
                        const originalIndex = messages.findIndex(m => m.id === message.id);
                        const isHighlighted = messageSearchQuery && 
                          currentSearchIndex >= 0 && 
                          searchMatches[currentSearchIndex] === originalIndex;
                      const isOwnMessage = message.senderId === currentUser?.id;
                      const clockTime = formatClockTime(message.createdAt);
                      
                      // Check if we need a date separator
                      const showDateSeparator = index === 0 || 
                        isDifferentDay(message.createdAt, reversedMessages[index - 1].createdAt);
                      
                      return (
                        <React.Fragment key={`${message?.id ?? 'm'}-${index}`}>
                          {/* Date Separator */}
                          {showDateSeparator && (
                            <div className="flex justify-center my-4">
                              <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                                {formatDateSeparator(message.createdAt)}
                              </div>
                            </div>
                          )}
                          
                          {/* Message */}
                          <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end space-x-2 ${
                            isHighlighted ? 'bg-yellow-100 rounded-lg p-2' : ''
                          }`}>
                            {!isOwnMessage && (
                              <div className="text-xs text-gray-500 mb-1 min-w-[40px]">
                                {clockTime}
                              </div>
                            )}
                            
                            <div
                              className={`max-w-[200px] px-3 py-2 rounded-lg text-sm ${
                                isOwnMessage
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p>
                                {messageSearchQuery ? 
                                  highlightSearchTerm(message.content, messageSearchQuery) : 
                                  message.content
                                }
                              </p>
                              {isOwnMessage && (
                                <div className="text-xs mt-1 text-blue-100 flex items-center justify-between">
                                  <span>
                                    {message.isRead ? '✓✓' : '✓'}
                                  </span>
                                  <span className="ml-2">
                                    {clockTime}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {isOwnMessage && (
                              <div className="text-xs text-gray-500 mb-1 min-w-[40px]">
                                {/* Empty space for alignment */}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                  
                  {/* Typing Indicator */}
                  {otherUserTyping && (
                    <div className="flex justify-start mb-2">
                      <div className="bg-gray-200 rounded-lg px-3 py-2 max-w-xs">
                        <div className="flex items-center space-x-1">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-xs text-gray-500 ml-2">typing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t p-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleTyping}
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
              <div className="h-full flex flex-col">
                {/* Chat List Search */}
                <div className="p-3 border-b border-gray-200">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search chats..."
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    {chatSearchQuery && (
                      <button
                        onClick={() => setChatSearchQuery("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {chatsArray.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center p-4">
                    <div>
                      <div className="text-gray-400 mb-2">
                        <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600">
                        {chatSearchQuery ? "No chats found" : "No conversations yet"}
                      </p>
                      {chatSearchQuery && (
                        <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="divide-y">
                    {chatsArray.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => openChat(chat.id)}
                        className="p-3 hover:bg-gray-50 cursor-pointer transition group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            {(() => {
                              // Handle different profile picture formats for chat list
                              let profilePicSrc = "/sitefiles/default-profile-picture.png"; // Default fallback
                              
                              if (chat.otherUser.profilePicture) {
                                // Check if it's an emoji (like 👤) or empty string
                                if (chat.otherUser.profilePicture === '👤' || chat.otherUser.profilePicture.trim() === '') {
                                  profilePicSrc = "/sitefiles/default-profile-picture.png";
                                }
                                // Check if it's a full HTTP URL
                                else if (chat.otherUser.profilePicture.startsWith('http')) {
                                  profilePicSrc = chat.otherUser.profilePicture;
                                }
                                // Check if it's an upload path
                                else if (chat.otherUser.profilePicture.startsWith('/uploads')) {
                                  profilePicSrc = `http://192.168.101.115:8080${chat.otherUser.profilePicture}`;
                                }
                                // Check if it's a local path
                                else if (chat.otherUser.profilePicture.startsWith('/')) {
                                  profilePicSrc = chat.otherUser.profilePicture;
                                }
                                // For any other case, use default
                                else {
                                  profilePicSrc = "/sitefiles/default-profile-picture.png";
                                }
                              }
                              
                              return (
                                <Image
                                  src={profilePicSrc}
                                  alt={chat.otherUser.name}
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 rounded-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "/sitefiles/default-profile-picture.png";
                                  }}
                                />
                              );
                            })()}
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
                            {chat.isTyping ? (
                              <p className="text-xs text-blue-600 italic">
                                {chat.otherUser.name} is typing...
                              </p>
                            ) : chat.lastMessage ? (
                              <p className="text-xs text-gray-600 truncate">
                                {chat.lastMessage.content}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
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
