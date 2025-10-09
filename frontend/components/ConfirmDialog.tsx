"use client";
import React from "react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="px-5 py-4 border-b bg-white sticky top-0 z-[1]">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="px-5 py-4 text-gray-700">
            {message}
          </div>
          <div className="px-5 py-4 bg-gray-50 border-t flex justify-end gap-2">
            <button onClick={onCancel} className="px-4 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-100">{cancelText}</button>
            <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700">{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  );
}


