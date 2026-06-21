import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="bg-[#1A1A1A] border border-red-900/50 rounded-xl p-8 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center mx-auto">
              <AlertTriangle size={22} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Something went wrong</h2>
              {this.state.error?.message && (
                <p className="text-[#666] text-sm mt-2 font-mono break-words">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#D62B2B] text-white rounded-lg text-sm font-medium hover:bg-[#B92323] transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
