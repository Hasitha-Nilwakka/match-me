"use client";

import React, { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface Props {
  children: ReactNode;
}

const RecommendationsErrorFallback = () => (
  <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
    <div className="text-center">
      <svg
        className="mx-auto h-16 w-16 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-gray-900">Recommendations Unavailable</h3>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        We couldn&apos;t load your recommendations right now. This might be due to a temporary issue.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Refresh Page
        </button>
        <button
          onClick={() => window.location.href = '/profile'}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Complete Profile
        </button>
      </div>
    </div>
  </div>
);

const RecommendationsErrorBoundary: React.FC<Props> = ({ children }) => {
  return (
    <ErrorBoundary
      level="component"
      name="Recommendations"
      fallback={<RecommendationsErrorFallback />}
      onError={(error, errorInfo) => {
        console.error('Recommendations Error:', error);
        console.error('Recommendations Error Info:', errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default RecommendationsErrorBoundary;
