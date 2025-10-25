import React from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGlobalErrorState } from '@/hooks/useErrorHandler';
import { AppError } from '@/lib/errorHandler';

interface ErrorStatusProps {
  className?: string;
}

export const ErrorStatus: React.FC<ErrorStatusProps> = ({ className = '' }) => {
  const { errors, removeError, clearAllErrors, hasErrors, criticalErrors } = useGlobalErrorState();

  if (!hasErrors) {
    return null;
  }

  const recentErrors = errors.slice(-3); // Show last 3 errors

  return (
    <div className={`fixed bottom-4 right-4 z-50 space-y-2 max-w-md ${className}`}>
      {/* Critical Errors - Show prominently */}
      {criticalErrors.map((error) => (
        <ErrorCard
          key={error.errorId}
          error={error}
          onDismiss={() => removeError(error.errorId)}
          variant="critical"
        />
      ))}

      {/* Recent Non-Critical Errors */}
      {recentErrors
        .filter(error => !criticalErrors.includes(error))
        .map((error) => (
          <ErrorCard
            key={error.errorId}
            error={error}
            onDismiss={() => removeError(error.errorId)}
            variant="warning"
          />
        ))}

      {/* Clear All Button - Show if more than 1 error */}
      {errors.length > 1 && (
        <Card className="bg-muted border-muted-foreground/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {errors.length} total errors
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllErrors}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface ErrorCardProps {
  error: AppError;
  onDismiss: () => void;
  variant: 'critical' | 'warning';
}

const ErrorCard: React.FC<ErrorCardProps> = ({ error, onDismiss, variant }) => {
  const cardClass = variant === 'critical' 
    ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800' 
    : 'bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800';

  const iconClass = variant === 'critical'
    ? 'text-red-600 dark:text-red-400'
    : 'text-yellow-600 dark:text-yellow-400';

  const textClass = variant === 'critical'
    ? 'text-red-800 dark:text-red-200'
    : 'text-yellow-800 dark:text-yellow-200';

  const isRecoverable = error.recoverable;

  return (
    <Card className={`${cardClass} shadow-lg transition-all duration-300 hover:shadow-xl`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 ${iconClass} flex-shrink-0 mt-0.5`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={variant === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                {error.type.replace(/_/g, ' ')}
              </Badge>
              {isRecoverable && (
                <Badge variant="outline" className="text-xs">
                  Recoverable
                </Badge>
              )}
            </div>
            
            <p className={`text-sm font-medium ${textClass} mb-1`}>
              {error.userMessage}
            </p>
            
            <p className="text-xs text-muted-foreground">
              {new Date(error.timestamp).toLocaleTimeString()}
            </p>

            {import.meta.env.DEV && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                  Technical Details
                </summary>
                <div className="mt-1 p-2 bg-muted/50 rounded text-xs font-mono whitespace-pre-wrap">
                  {error.message}
                </div>
              </details>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isRecoverable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // TODO: Implement retry logic
                  console.log('Retry error:', error.errorId);
                }}
                className="h-6 w-6 p-0"
                title="Retry"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0"
              title="Dismiss"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Global error overlay for critical system errors
interface GlobalErrorOverlayProps {
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const GlobalErrorOverlay: React.FC<GlobalErrorOverlayProps> = ({
  onRetry,
  onDismiss,
}) => {
  const { criticalErrors } = useGlobalErrorState();

  // Only show overlay for critical authentication or system errors
  const systemErrors = criticalErrors.filter(error => 
    ['AUTHENTICATION_ERROR', 'CONFIGURATION_ERROR', 'DATABASE_ERROR'].includes(error.type)
  );

  if (systemErrors.length === 0) {
    return null;
  }

  const primaryError = systemErrors[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800">
        <CardContent className="p-6 text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 dark:bg-red-900/50 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            System Error
          </h3>
          
          <p className="text-red-700 dark:text-red-300 mb-4">
            {primaryError.userMessage}
          </p>

          <div className="flex gap-3 justify-center">
            {onRetry && primaryError.recoverable && (
              <Button onClick={onRetry} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            
            {onDismiss && (
              <Button onClick={onDismiss} variant="outline">
                Dismiss
              </Button>
            )}
          </div>

          <p className="text-xs text-red-600 dark:text-red-400 mt-4">
            Error ID: {primaryError.errorId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};