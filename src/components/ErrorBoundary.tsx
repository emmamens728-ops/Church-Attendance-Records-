import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border-2 border-yellow-400 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-blue-950 mb-1">
              HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
            </h2>
            <p className="text-xs font-bold text-yellow-600 mb-4">
              LOCATION: MANKESSIM
            </p>
            <p className="text-xs text-gray-600 mb-4">
              The application encountered a display issue. Tap below to reload the attendance register.
            </p>
            <p className="text-[11px] text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-200 text-left font-mono break-all">
              {this.state.error?.message || 'Unexpected application error.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-3 rounded-xl bg-blue-900 text-yellow-300 font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-blue-800 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
