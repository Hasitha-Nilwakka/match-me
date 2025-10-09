"use client";
import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
  variant?: "success" | "error" | "info";
  durationMs?: number;
}

export default function Toast({ message, open, onClose, variant = "info", durationMs = 2500 }: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(id);
  }, [open, onClose, durationMs]);

  if (!open) return null;

  const bg = variant === "success" ? "bg-green-600" : variant === "error" ? "bg-red-600" : "bg-gray-800";

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[9999] px-4 py-2 rounded-lg shadow-lg text-white text-sm sm:text-base"
         style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}>
      <div className={`${bg} px-4 py-2 rounded-lg max-w-[90vw] sm:max-w-md shadow-xl`}>{message}</div>
    </div>
  );
}


