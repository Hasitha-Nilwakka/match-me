"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { authApi, chatApi } from "../lib/api";
import ChatPopup from "./ChatPopup";
import { useChat } from "../context/ChatContext";

interface ChatToggleButtonProps {
  unreadCount: number;
  onClick: () => void;
}

function ChatToggleButton({ unreadCount, onClick }: ChatToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105 z-40 transform-gpu"
      title="Open chat"
    >
      <div className="relative">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {/* Floating badge always visible when there are unread messages */}
        <span
          className={`absolute -top-2 -right-2 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center transition-opacity ${
            unreadCount > 0 ? 'bg-red-500 opacity-100' : 'opacity-0'
          }`}
          aria-hidden={unreadCount === 0}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      </div>
    </button>
  );
}

interface GlobalChatProviderProps {
  children: React.ReactNode;
}

export default function GlobalChatProvider({ children }: GlobalChatProviderProps) {
  const pathname = usePathname();
  const { isChatOpen, openChat, closeChat, unreadCount, setUnreadCount } = useChat();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount and path changes
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authApi.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        loadUnreadCount();
      }
    };

    checkAuth();
  }, [pathname]);

  // Load unread message count
  const loadUnreadCount = async () => {
    try {
      // Check if user is authenticated before making API calls
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[GlobalChatProvider] User not authenticated, skipping unread count load');
        setUnreadCount(0);
        return;
      }

      let res;
      try {
        res = await chatApi.getAllChats();
      } catch (error) {
        console.error('Failed to fetch chats:', error);
        setUnreadCount(0);
        return;
      }

      // Normalize various response shapes to an array of chats
      let chatsArray: { unreadCount?: number; unread?: number }[] = [];
      if (Array.isArray(res)) {
        chatsArray = res;
      } else if (res?.chats && Array.isArray(res.chats)) {
        chatsArray = res.chats;
      } else if (res?.data?.chats && Array.isArray(res.data.chats)) {
        chatsArray = res.data.chats;
      } else if (res?.data && Array.isArray(res.data)) {
        chatsArray = res.data;
      }

      const total = chatsArray.reduce((sum: number, c: { unreadCount?: number; unread?: number }) => {
        const count = c?.unreadCount ?? c?.unread ?? 0;
        return sum + (typeof count === 'number' ? count : 0);
      }, 0);

      setUnreadCount(total);
    } catch (error) {
      console.error('Error loading unread count:', error);
      setUnreadCount(0);
    }
  };

  // Periodically refresh unread count when authenticated and popup is closed
  useEffect(() => {
    if (!isAuthenticated) return;
    // Always refresh once on mount/path changes
    loadUnreadCount();

    // Poll every 5s, but pause while chat is open
    const id = setInterval(() => {
      if (!isChatOpen) {
        loadUnreadCount();
      }
    }, 5000);

    // Refresh when tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !isChatOpen) {
        loadUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, isChatOpen, pathname]);

  // When chat closes, immediately refresh unread count
  useEffect(() => {
    if (!isChatOpen && isAuthenticated) {
      loadUnreadCount();
    }
  }, [isChatOpen, isAuthenticated]);

  // Don't show chat on login page or if not authenticated
  const shouldShowChat = isAuthenticated && pathname !== '/';

  return (
    <>
      {children}
      {shouldShowChat && (
        <>
          <ChatToggleButton 
            unreadCount={unreadCount} 
            onClick={openChat} 
          />
          <ChatPopup 
            isOpen={isChatOpen} 
            onClose={closeChat} 
          />
        </>
      )}
    </>
  );
}
