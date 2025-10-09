"use client";

import ErrorBoundaryTest from "../../components/ErrorBoundaryTest";
import PageErrorBoundary from "../../components/PageErrorBoundary";

export default function TestErrorsPage() {
  return (
    <PageErrorBoundary pageName="Error Boundary Test">
      <div className="min-h-screen bg-gray-50">
        <div className="py-8">
          <ErrorBoundaryTest />
        </div>
      </div>
    </PageErrorBoundary>
  );
}
