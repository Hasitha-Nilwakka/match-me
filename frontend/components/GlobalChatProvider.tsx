"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { authApi, chatApi } from "../lib/api";
import ChatPopup from "./ChatPopup";
import { useDataMode } from "../context/DataModeContext";

interface ChatToggleButtonProps {
  unreadCount: number;
  onClick: () => void;
}

function ChatToggleButton({ unreadCount, onClick }: ChatToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105 z-40"
      title="Open chat"
    >
      <div className="relative">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
    </button>
  );
}

interface GlobalChatProviderProps {
  children: React.ReactNode;
}

export default function GlobalChatProvider({ children }: GlobalChatProviderProps) {
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { mode } = useDataMode();

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
  }, [pathname, mode]);

  // Load unread message count
  const loadUnreadCount = async () => {
    try {
      if (mode === "mock") {
        setUnreadCount(0);
        return;
      }
      const chats = await chatApi.getAllChats();
      const total = Array.isArray(chats)
        ? chats.reduce((sum: number, c: { unreadCount?: number }) => sum + (c?.unreadCount || 0), 0)
        : 0;
      setUnreadCount(total);
    } catch (error) {
      console.error('Error loading unread count:', error);
      setUnreadCount(0);
    }
  };

  // Don't show chat on login page or if not authenticated
  const shouldShowChat = isAuthenticated && pathname !== '/';

  return (
    <>
      {children}
      {shouldShowChat && (
        <>
          <ChatToggleButton 
            unreadCount={unreadCount} 
            onClick={() => setIsChatOpen(true)} 
          />
          <ChatPopup 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
          />
        </>
      )}
    </>
  );
}
