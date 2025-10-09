"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { authApi, chatApi, getApiUrl } from "../lib/api";
import { useChat } from "../context/ChatContext";
import type { Socket } from "socket.io-client";

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Track previous message count to detect new messages
  const prevMessageCountRef = useRef<number>(0);
  // Auto-clear for typing indicator to avoid phantom bubble
  const typingClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Chat list lightweight Socket.IO refs for typing indicators
  const listSocketsRef = useRef<Record<number, Socket>>({});
  const listTypingTimersRef = useRef<Record<number, NodeJS.Timeout>>({});

  // Minimal auto-scroll: only when explicitly requested via flag
  const scrollToBottom = (behavior: ScrollBehavior) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    // Only auto-scroll when message count increases (new message)
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;
    
    if (currentCount > prevCount) {
      // New message detected - scroll to bottom
      scrollToBottom('smooth');
    }
    
    // Update the ref for next comparison
    prevMessageCountRef.current = currentCount;
  }, [messages]);
  const socketRef = useRef<Socket | null>(null);
  const activeChatRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recentWsAtRef = useRef<number>(0);
  const currentUser = authApi.getCurrentUser();
  const mode = "real" as const;
  const { targetChatId, clearTargetChat } = useChat();
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  // Do not auto-scroll on typing indicator; user may be reading history

  // Live refresh of chats (and online indicators) while popup is open
  useEffect(() => {
    if (!isOpen) return;
    const intervalId = setInterval(() => {
      // Silent refresh of chat list to get updated isOnline/lastSeen
      loadChats();
    }, 10000); // 10s
    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Lightweight typing listeners for chat list (top 5 recent chats) - Socket.IO version
  useEffect(() => {
    // Only when popup is open and no active chat (list view)
    if (!isOpen || activeChat) {
      // Cleanup any existing list sockets
      Object.values(listSocketsRef.current).forEach((socket) => {
        try { socket.disconnect(); } catch {}
      });
      listSocketsRef.current = {};
      return;
    }

    // Choose up to 5 most recent chats (fallback to current order)
    const topChats = [...chats]
      .sort((a, b) => {
        const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bt - at;
      })
      .slice(0, 5);

    const currentIds = new Set(topChats.map(c => c.id));

    // Close sockets that are no longer in top set
    Object.entries(listSocketsRef.current).forEach(([idStr, socket]) => {
      const id = Number(idStr);
      if (!currentIds.has(id)) {
        try { socket.disconnect(); } catch {}
        delete listSocketsRef.current[id];
      }
    });

    // Open Socket.IO connections for new top chats
    topChats.forEach((chat) => {
      if (listSocketsRef.current[chat.id]) return; // already open
      try {
        const socket = chatApi.createSocketIOConnection(
          String(chat.id),
          () => {}, // No message handling needed for list view
          (typingData: unknown) => {
            const data = typingData as { isTyping: boolean; userId: number; chatId: number };
            if (!data || data.chatId !== chat.id) return;
            // Update chat list isTyping
            setChats(prev => prev.map(c => (
              c.id === chat.id ? { ...c, isTyping: Boolean(data.isTyping) } : c
            )));
            // Auto-clear after 2.5s
            if (listTypingTimersRef.current[chat.id]) {
              clearTimeout(listTypingTimersRef.current[chat.id]);
            }
            if (data.isTyping) {
              listTypingTimersRef.current[chat.id] = setTimeout(() => {
                setChats(prev => prev.map(c => (
                  c.id === chat.id ? { ...c, isTyping: false } : c
                )));
              }, 2500);
            }
          }
        );
        listSocketsRef.current[chat.id] = socket;
      } catch (e) {
        console.error('[ChatPopup] Failed to open list Socket.IO for chat', chat.id, e);
      }
    });

    return () => {
      // Cleanup on unmount/list leave
      Object.values(listSocketsRef.current).forEach((socket) => {
        try { socket.disconnect(); } catch {}
      });
      listSocketsRef.current = {};
    };
  }, [isOpen, activeChat, chats]);

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
      
      // Filter out empty chats (deleted chats with no messages)
      // Unless they're being actively opened via targetChatId
      const filteredChats = chatsData.filter((chat: Chat) => {
        // Always show if there's a last message
        if (chat.lastMessage) return true;
        // Show if this is the target chat being opened from connections
        if (targetChatId && chat.id === targetChatId) return true;
        // Otherwise hide empty chats (deleted)
        return false;
      });
      
      setChats(filteredChats);
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

  // Ensure read receipts fire immediately when viewing a chat with unread incoming messages
  useEffect(() => {
    if (!activeChat || messages.length === 0) return;
    const hasUnreadFromOther = messages.some(m => !m.isRead && m.senderId !== currentUser?.id);
    if (hasUnreadFromOther) {
      // Optimistically update UI
      setMessages(prev => prev.map(m => m.senderId !== currentUser?.id ? { ...m, isRead: true } : m));
      setChats(prev => prev.map(c => c.id === activeChat ? { ...c, unreadCount: 0 } : c));
      // Notify backend to broadcast read event to the sender
      chatApi.markAsRead(String(activeChat)).catch(() => {});
    }
  }, [activeChat, messages, currentUser?.id]);

  // Open a specific chat
  const openChat = (chatId: number) => {
    console.log('[ChatPopup] openChat called with chatId:', chatId);
    setActiveChat(chatId);
    setIsMinimized(false);
    activeChatRef.current = chatId;
    // Reset message count tracker when switching chats
    prevMessageCountRef.current = 0;
    // Perform an immediate scroll after initial messages load as a fallback
    setTimeout(() => {
      if (activeChatRef.current === chatId) {
        const el = messagesContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }
    }, 0);
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

  // Socket.IO connection for active chat
  useEffect(() => {
    console.log('[ChatPopup] Socket.IO useEffect triggered, activeChat:', activeChat);
    console.log('[ChatPopup] isOpen:', isOpen);
    console.log('[ChatPopup] chats.length:', chats.length);
    
    // Cleanup any existing connection
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch { /* noop */ }
      socketRef.current = null;
    }
    activeChatRef.current = activeChat;

    if (!activeChat) {
      console.log('[ChatPopup] No active chat, skipping Socket.IO setup');
      setConnectionState('disconnected');
      return;
    }
    
    console.log('[ChatPopup] Setting up Socket.IO for chat:', activeChat);
    console.log('[ChatPopup] Current user ID:', currentUser?.id);
    console.log('[ChatPopup] Token exists:', !!localStorage.getItem('token'));
    
    try {
      setConnectionState('reconnecting');
      const socket = chatApi.createSocketIOConnection(
        activeChat.toString(), 
        (incoming: unknown) => {
          console.log('[ChatPopup] Socket.IO message received:', incoming);
          console.log('[ChatPopup] Socket.IO connection state:', socket.connected);
          
          // Handle read receipts
          const msgData = incoming as { type?: string; chatId?: number; lastReadMessageId?: number };
          if (msgData && msgData.type === 'read') {
            console.log('[ChatPopup] Read event received:', msgData);
            const chatId = msgData.chatId;
            const lastReadId = msgData.lastReadMessageId;
            setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
            if (chatId === activeChatRef.current) {
              setMessages(prev => prev.map(m => {
                const shouldMark = m.senderId === currentUser?.id && (!lastReadId || m.id <= lastReadId);
                return shouldMark ? { ...m, isRead: true } : m;
              }));
            }
            return;
          }
          
          // Handle regular chat messages
          const msg = incoming as Message;
          if (!msg || typeof msg !== 'object' || !msg.id) {
            console.log('[ChatPopup] Invalid message format:', msg);
            return;
          }
          
          console.log('[ChatPopup] Adding message to state:', msg);
          // Auto-scroll happens automatically via message count detection
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
          if (!data || data.userId === currentUser?.id) return;
          console.log('[ChatPopup] Typing event:', data);
          // Show typing directly; rely on sender to send stop event
          setOtherUserTyping(Boolean(data.isTyping));

          // Update typing status in chat list
          setChats(prev => prev.map(chat => (
            chat.id === data.chatId ? { ...chat, isTyping: Boolean(data.isTyping) } : chat
          )));
        }
      );
      
      // Add connection state listeners
      socket.on('connect', () => {
        console.log('[ChatPopup] Socket.IO connected');
        setConnectionState('connected');
      });
      
      socket.on('disconnect', () => {
        console.log('[ChatPopup] Socket.IO disconnected');
        setConnectionState('disconnected');
      });
      
      socket.on('reconnecting', () => {
        console.log('[ChatPopup] Socket.IO reconnecting');
        setConnectionState('reconnecting');
      });
      
      socket.on('reconnect', () => {
        console.log('[ChatPopup] Socket.IO reconnected');
        setConnectionState('connected');
      });
      
      socketRef.current = socket;
    } catch (error) {
      console.error('[ChatPopup] Failed to open Socket.IO connection for chat', activeChat, error);
      setConnectionState('disconnected');
    }

    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch { /* noop */ }
        socketRef.current = null;
      }
      setConnectionState('disconnected');
    };
  }, [activeChat, currentUser?.id, isOpen, chats.length]);

  // Clear typing state on chat switch or popup close
  useEffect(() => {
    setOtherUserTyping(false);
    if (typingClearTimeoutRef.current) {
      clearTimeout(typingClearTimeoutRef.current);
      typingClearTimeoutRef.current = null;
    }
  }, [activeChat, isOpen]);

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
      if (socketRef.current) {
        chatApi.sendSocketIOTypingIndicator(socketRef.current, false);
      }
    }
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      setIsSending(true);
      
      // Real API call
      // Auto-scroll happens automatically via message count detection
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
      if (socketRef.current && socketRef.current.connected) {
        chatApi.sendSocketIOTypingIndicator(socketRef.current, true);
        console.log('[ChatPopup] Sent typing start via Socket.IO');
      } else {
        console.log('[ChatPopup] Socket.IO not connected, cannot send typing indicator');
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
        if (socketRef.current && socketRef.current.connected) {
          chatApi.sendSocketIOTypingIndicator(socketRef.current, false);
          console.log('[ChatPopup] Sent typing stop via Socket.IO');
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
    <div className="fixed bottom-4 right-4 z-50 transform-gpu">
      {/* Chat Popup Window */}
      <div className={`bg-white rounded-lg shadow-2xl border transition-all duration-300 ${
        isMinimized ? 'h-14' : 'h-96 w-80 max-w-[calc(100vw-2rem)]'
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
                    const base = getApiUrl().replace(/\/$/, '');
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
                        profilePicSrc = `${base}${currentChatUser.profilePicture}`;
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
                      <span className="font-medium text-gray-900">
                        {currentChatUser?.name || 'Chat'}
                      </span>
                      {/* Connection Status Indicator */}
                      {connectionState === 'reconnecting' && (
                        <span className="text-xs text-yellow-600 flex items-center">
                          <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Reconnecting...
                        </span>
                      )}
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
                <div className="flex-1 overflow-y-auto p-3 space-y-2" ref={messagesContainerRef}>
                  {(() => {
                    const source = messageSearchQuery ? filteredMessages : messages;
                    const safeMessages = Array.isArray(source)
                      ? source.filter((m) => !!m && typeof m.content === 'string' && m.content.trim().length > 0)
                      : [];
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
                          {showDateSeparator && (() => {
                            const label = formatDateSeparator(message.createdAt);
                            return (
                              <div className="my-3 flex items-center text-[10px] uppercase tracking-wide text-gray-400">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="mx-2 whitespace-nowrap">{label}</span>
                                <div className="flex-1 h-px bg-gray-200" />
                              </div>
                            );
                          })()}
                          
                          {/* Message */}
                          <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end space-x-2 ${
                            isHighlighted ? 'bg-yellow-100 rounded-lg p-2' : ''
                          }`}>
                            {/* Left-side clock removed to avoid empty placeholders */}
                            
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
                              {/* Footer: show time for all messages; ticks only for own */}
                              <div className={`text-xs mt-1 flex ${isOwnMessage ? 'justify-between text-blue-100' : 'justify-end text-gray-500'}`}>
                                {isOwnMessage && (
                                  <span>{message.isRead ? '✓✓' : '✓'}</span>
                                )}
                                <span className={isOwnMessage ? 'ml-2' : ''}>{clockTime}</span>
                              </div>
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
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator - revert to in-list position to keep original UX */}
                {otherUserTyping && (
                  <div className="px-3 py-1 text-xs text-gray-500 italic">Typing...</div>
                )}

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
                              const base = getApiUrl().replace(/\/$/, '');
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
                                  profilePicSrc = `${base}${chat.otherUser.profilePicture}`;
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
      className="fixed bottom-4 right-4 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 transform-gpu"
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
