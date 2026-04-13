import React from 'react';
import { BugAntIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Sentry capture if available
    if (window.Sentry) {
      window.Sentry.captureException(error, { extra: errorInfo });
    }

    toast.error('Something went wrong. Please refresh the page.', {
      duration: 5000,
      position: 'top-right',
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
            <BugAntIcon className="w-24 h-24 text-slate-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Oops! Something broke</h1>
            <p className="text-slate-600 mb-6 leading-relaxed">
              We encountered an unexpected error. Our team has been notified.
            </p>
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <span>Reload App</span>
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full text-slate-600 hover:text-slate-900 font-medium py-3 px-6 rounded-xl transition-colors duration-200 border border-slate-200 hover:bg-slate-50"
              >
                Go Home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 p-4 bg-slate-50 rounded-xl text-left text-sm">
                <summary className="font-medium text-slate-900 cursor-pointer mb-2">Debug Info</summary>
                <pre className="bg-white p-3 rounded text-xs font-mono text-slate-800 overflow-auto max-h-40">
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

