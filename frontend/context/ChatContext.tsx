"use client";
import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  isChatOpen: boolean;
  openChat: (targetChatId?: number) => void;
  closeChat: () => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  targetChatId: number | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [targetChatId, setTargetChatId] = useState<number | null>(null);

  const openChat = (chatId?: number) => {
    setTargetChatId(chatId || null);
    setIsChatOpen(true);
  };
  const closeChat = () => {
    setIsChatOpen(false);
    setTargetChatId(null);
  };

  return (
    <ChatContext.Provider value={{
      isChatOpen,
      openChat,
      closeChat,
      unreadCount,
      setUnreadCount,
      targetChatId
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
