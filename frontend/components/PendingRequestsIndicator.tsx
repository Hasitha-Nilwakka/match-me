"use client";
import { useState, useEffect } from "react";
import { connectionsApi } from "../lib/api";

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

  // Load count on component mount
  useEffect(() => {
    loadPendingRequestsCount();
  }, []);

  // Lightweight periodic refresh (near real-time) while app is open
  useEffect(() => {
    const id = setInterval(() => {
      loadPendingRequestsCount();
    }, 4000);
    return () => clearInterval(id);
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
