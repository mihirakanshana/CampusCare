import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('UniFix ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && parsed.error && parsed.operationType) {
          friendlyMessage = `Database ${parsed.operationType} permission check failed on "${parsed.path || 'resource'}": ${parsed.error}`;
        }
      } catch {
        // Non-JSON error
      }

      return (
        <div className="min-h-screen uf-ambient-canvas flex items-center justify-center p-6">
          <div className="max-w-lg w-full glass-panel rounded-2xl p-8">
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-5">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <h1 className="text-xl font-bold text-[#064E3B] font-display">
              Unable to complete operation
            </h1>
            <p className="text-sm text-[#52635D] mt-2 leading-relaxed break-words">
              {friendlyMessage}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  window.location.href = '/';
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
