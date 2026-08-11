import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Admin Dashboard Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px] p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Something Went Wrong</h2>
            <p className="text-sm text-slate-500">
              An error occurred in the admin dashboard. This has been logged and will be investigated.
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-100 rounded-lg text-left">
                <code className="text-[10px] text-rose-600 font-mono break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={this.handleReset}
            >
              Reload Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}