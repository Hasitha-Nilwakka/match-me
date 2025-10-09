"use client";

import React, { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface Props {
  children: ReactNode;
}

const ChatErrorFallback = () => (
  <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
    <div className="text-center">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">Chat Error</h3>
      <p className="mt-1 text-sm text-gray-500">
        The chat encountered an error and couldn&apos;t load properly.
      </p>
      <div className="mt-4">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Refresh Chat
        </button>
      </div>
    </div>
  </div>
);

const ChatErrorBoundary: React.FC<Props> = ({ children }) => {
  return (
    <ErrorBoundary
      level="component"
      name="Chat"
      fallback={<ChatErrorFallback />}
      onError={(error, errorInfo) => {
        console.error('Chat Error:', error);
        console.error('Chat Error Info:', errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ChatErrorBoundary;
