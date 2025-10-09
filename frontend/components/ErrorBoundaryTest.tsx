"use client";

import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Test component that throws an error when clicked
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('This is a test error to demonstrate error boundaries!');
  }
  
  return (
    <div className="p-4 bg-green-100 rounded-lg">
      <p className="text-green-800">✅ Component is working normally</p>
    </div>
  );
};

// Test component for demonstrating different error boundary levels
export const ErrorBoundaryTest = () => {
  const [shouldThrowApp, setShouldThrowApp] = useState(false);
  const [shouldThrowPage, setShouldThrowPage] = useState(false);
  const [shouldThrowComponent, setShouldThrowComponent] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Error Boundary Test</h2>
      <p className="text-gray-600 mb-8">
        Click the buttons below to test different error boundary levels. 
        In development mode, you&apos;ll see detailed error information.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* App Level Error Boundary Test */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">App Level</h3>
          <p className="text-sm text-gray-600 mb-4">
            This error will be caught by the app-level error boundary and show a full-page error UI.
          </p>
          <button
            onClick={() => setShouldThrowApp(!shouldThrowApp)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {shouldThrowApp ? 'Reset' : 'Throw App Error'}
          </button>
          <div className="mt-4">
            <ErrorBoundary level="app" name="Test App">
              <ErrorThrowingComponent shouldThrow={shouldThrowApp} />
            </ErrorBoundary>
          </div>
        </div>

        {/* Page Level Error Boundary Test */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Page Level</h3>
          <p className="text-sm text-gray-600 mb-4">
            This error will be caught by a page-level error boundary with retry functionality.
          </p>
          <button
            onClick={() => setShouldThrowPage(!shouldThrowPage)}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            {shouldThrowPage ? 'Reset' : 'Throw Page Error'}
          </button>
          <div className="mt-4">
            <ErrorBoundary level="page" name="Test Page">
              <ErrorThrowingComponent shouldThrow={shouldThrowPage} />
            </ErrorBoundary>
          </div>
        </div>

        {/* Component Level Error Boundary Test */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Component Level</h3>
          <p className="text-sm text-gray-600 mb-4">
            This error will be caught by a component-level error boundary with a compact fallback.
          </p>
          <button
            onClick={() => setShouldThrowComponent(!shouldThrowComponent)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {shouldThrowComponent ? 'Reset' : 'Throw Component Error'}
          </button>
          <div className="mt-4">
            <ErrorBoundary level="component" name="Test Component">
              <ErrorThrowingComponent shouldThrow={shouldThrowComponent} />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Error Boundary Features:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Automatic error catching and graceful fallback UI</li>
          <li>• Different UI levels (app, page, component) for different contexts</li>
          <li>• Retry functionality for recoverable errors</li>
          <li>• Development mode shows detailed error information</li>
          <li>• Production mode logs errors securely</li>
          <li>• Custom error reporting hooks for external services</li>
        </ul>
      </div>
    </div>
  );
};

export default ErrorBoundaryTest;
