import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log the error
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service (if configured)
    this.reportErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  private reportErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to a service like Sentry
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorId: this.state.errorId,
    };

    // For now, just log to console
    console.error('Error Report:', errorReport);
    
    // TODO: Send to error reporting service
    // Example: Sentry.captureException(error, { extra: errorReport });
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    }, 100);
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private getErrorMessage = (error: Error): string => {
    // Provide user-friendly error messages
    if (error.message.includes('ChunkLoadError')) {
      return 'The application failed to load properly. This usually happens after an update.';
    }
    
    if (error.message.includes('Network Error')) {
      return 'There was a network error. Please check your connection and try again.';
    }

    if (error.message.includes('Loading chunk')) {
      return 'A component failed to load. Please refresh the page to get the latest version.';
    }

    return 'An unexpected error occurred. Our team has been notified.';
  };

  private getErrorSuggestion = (error: Error): string => {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'Try refreshing the page or clearing your browser cache.';
    }
    
    if (error.message.includes('Network Error')) {
      return 'Check your internet connection and try again.';
    }

    return 'Please try again or contact support if the problem persists.';
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-800 dark:text-red-200">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription className="text-red-600 dark:text-red-300">
                {this.getErrorMessage(error)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                  <strong>Suggestion:</strong> {this.getErrorSuggestion(error)}
                </p>
                {import.meta.env.DEV && (
                  <details className="mt-3">
                    <summary className="text-sm font-medium text-red-800 dark:text-red-200 cursor-pointer">
                      Technical Details
                    </summary>
                    <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/40 rounded text-xs font-mono text-red-900 dark:text-red-100 whitespace-pre-wrap">
                      {error.message}
                      {error.stack && `\n\nStack trace:\n${error.stack}`}
                    </div>
                  </details>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="flex-1"
                  variant="outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Error ID: {this.state.errorId}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// Convenience wrapper for functional components
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P & ErrorBoundaryWrapperProps) => {
    const { fallback, onError, ...componentProps } = props;
    
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...(componentProps as P)} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};