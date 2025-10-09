"use client";

import React, { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  pageName?: string;
}

const PageErrorFallback = ({ pageName = 'Page' }: { pageName?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      {/* Error Icon */}
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
        <svg
          className="h-8 w-8 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>

      {/* Error Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {pageName} Error
      </h1>

      {/* Error Description */}
      <p className="text-gray-600 mb-8">
        Something went wrong while loading this page. Don&apos;t worry, this usually gets fixed quickly.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Try Again
        </button>
        
        <Link
          href="/"
          className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          Go Home
        </Link>
      </div>

      {/* Help Text */}
      <p className="text-sm text-gray-500 mt-6">
        If this problem continues, please{' '}
        <a
          href="mailto:support@example.com"
          className="text-blue-600 hover:text-blue-500"
        >
          contact support
        </a>
      </p>
    </div>
  </div>
);

const PageErrorBoundary: React.FC<Props> = ({ children, pageName }) => {
  return (
    <ErrorBoundary
      level="page"
      name={pageName || 'Page'}
      fallback={<PageErrorFallback pageName={pageName} />}
      onError={(error, errorInfo) => {
        console.error(`${pageName || 'Page'} Error:`, error);
        console.error(`${pageName || 'Page'} Error Info:`, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PageErrorBoundary;
