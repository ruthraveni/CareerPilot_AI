import { useRouteError } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function ErrorBoundaryPage() {
  const error = useRouteError();

  return (
    <div className="min-h-screen bg-[var(--cp-bg)] flex flex-col items-center justify-center p-6 text-[var(--cp-text)]">
      <div className="max-w-md w-full bg-[var(--cp-surface)] border border-red-200 rounded-3xl p-8 shadow-xl text-center">
        <div className="bg-red-100 p-4 rounded-full inline-flex mb-6">
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-black mb-2 text-[var(--cp-text)]">Something went wrong</h1>
        <p className="text-[var(--cp-text-muted)] font-medium mb-6">
          We encountered an unexpected error while loading this page.
        </p>
        <div className="bg-red-50 text-red-800 text-xs text-left p-4 rounded-xl overflow-x-auto mb-8 border border-red-100 font-mono">
          {error?.statusText || error?.message || "Unknown error occurred"}
        </div>
        <button
          onClick={() => window.location.href = "/"}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md w-full"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
