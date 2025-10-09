"use client";
import { useState, useEffect } from "react";
import { connectionsApi, getApiUrl } from "../lib/api";
import { io } from "socket.io-client";

interface PendingRequestsIndicatorProps {
  className?: string;
  showCount?: boolean;
}

export default function PendingRequestsIndicator({ 
  className = "", 
  showCount = true 
}: PendingRequestsIndicatorProps) {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Load pending connection requests count
  const loadPendingRequestsCount = async () => {
    try {
      const count = await connectionsApi.getConnectionRequestsCount();
      setPendingRequestsCount(count);
    } catch (error) {
      console.error('Error loading pending requests count:', error);
      setPendingRequestsCount(0);
    }
  };

  // Initial load and Socket.IO real-time updates
  useEffect(() => {
    loadPendingRequestsCount();

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const baseUrl = getApiUrl();
    const s = io(baseUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    s.on('connection_updated', () => loadPendingRequestsCount());
    s.on('request_created', () => loadPendingRequestsCount());
    s.on('request_deleted', () => loadPendingRequestsCount());
    return () => { s.disconnect(); };
  }, []);

  // Refresh count when page becomes visible (user returns from other pages)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadPendingRequestsCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Don't render anything if no pending requests
  if (!showCount || pendingRequestsCount === 0) {
    return null;
  }

  return (
    <span className={`inline-flex items-center justify-center bg-red-500 text-white text-xs rounded-full h-5 w-5 font-bold ${className}`}>
      {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
    </span>
  );
}
