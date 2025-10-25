import { JobExecutionError, JobExecutionException } from './jobExecutor';

// Context type for error metadata
export type ErrorContext = Record<string, string | number | boolean | null | undefined>;

// Enhanced error types for the application
export const AppErrorType = {
  ...JobExecutionError,
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  DATA_INTEGRITY_ERROR: 'DATA_INTEGRITY_ERROR',
} as const;

export type AppErrorType = typeof AppErrorType[keyof typeof AppErrorType];

// Enhanced error class for application-wide error handling
export class AppError extends Error {
  public type: AppErrorType;
  public recoverable: boolean;
  public userMessage: string;
  public context?: ErrorContext;
  public timestamp: string;
  public errorId: string;

  constructor(
    type: AppErrorType,
    message: string,
    userMessage?: string,
    recoverable: boolean = false,
    context?: ErrorContext
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.recoverable = recoverable;
    this.userMessage = userMessage || this.getDefaultUserMessage(type);
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.errorId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultUserMessage(type: AppErrorType): string {
    const messages: Record<AppErrorType, string> = {
      [AppErrorType.JOB_NOT_FOUND]: 'The requested job could not be found.',
      [AppErrorType.INVALID_URL]: 'The URL provided is not valid. Please check and try again.',
      [AppErrorType.NETWORK_ERROR]: 'Network connection error. Please check your internet connection.',
      [AppErrorType.AI_SERVICE_ERROR]: 'AI service is temporarily unavailable. Please try again later.',
      [AppErrorType.DATABASE_ERROR]: 'Database error occurred. Our team has been notified.',
      [AppErrorType.AUTHENTICATION_ERROR]: 'Authentication failed. Please sign in again.',
      [AppErrorType.RATE_LIMIT_ERROR]: 'Too many requests. Please wait a moment and try again.',
      [AppErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
      [AppErrorType.VALIDATION_ERROR]: 'The information provided is not valid. Please check your input.',
      [AppErrorType.PERMISSION_ERROR]: 'You do not have permission to perform this action.',
      [AppErrorType.CONFIGURATION_ERROR]: 'Configuration error. Please contact support.',
      [AppErrorType.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',
      [AppErrorType.TIMEOUT_ERROR]: 'The request timed out. Please try again.',
      [AppErrorType.QUOTA_EXCEEDED]: 'Usage quota exceeded. Please upgrade your plan or try again later.',
      [AppErrorType.DATA_INTEGRITY_ERROR]: 'Data integrity error. Please refresh and try again.',
    };

    return messages[type] || 'An error occurred. Please try again.';
  }

  // Convert to JSON for logging/reporting
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp,
      errorId: this.errorId,
      stack: this.stack,
    };
  }
}

// Error handling utilities
export class ErrorHandler {
  private static errorQueue: AppError[] = [];
  private static maxQueueSize = 100;

  // Handle and log errors consistently
  static handle(error: unknown, context?: ErrorContext): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof JobExecutionException) {
      appError = new AppError(
        error.type,
        error.message,
        undefined,
        error.recoverable,
        context
      );
    } else if (error instanceof Error) {
      appError = this.categorizeError(error, context);
    } else {
      appError = new AppError(
        AppErrorType.UNKNOWN_ERROR,
        String(error),
        undefined,
        false,
        context
      );
    }

    // Add context if provided
    if (context && !appError.context) {
      appError.context = context;
    }

    // Log the error
    this.logError(appError);

    // Add to error queue for analytics
    this.addToQueue(appError);

    return appError;
  }

  // Categorize generic errors into specific types
  private static categorizeError(error: Error, context?: ErrorContext): AppError {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return new AppError(AppErrorType.NETWORK_ERROR, error.message, undefined, true, context);
    }

    if (message.includes('timeout')) {
      return new AppError(AppErrorType.TIMEOUT_ERROR, error.message, undefined, true, context);
    }

    if (message.includes('unauthorized') || message.includes('authentication')) {
      return new AppError(AppErrorType.AUTHENTICATION_ERROR, error.message, undefined, false, context);
    }

    if (message.includes('permission') || message.includes('forbidden')) {
      return new AppError(AppErrorType.PERMISSION_ERROR, error.message, undefined, false, context);
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return new AppError(AppErrorType.VALIDATION_ERROR, error.message, undefined, false, context);
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return new AppError(AppErrorType.RATE_LIMIT_ERROR, error.message, undefined, true, context);
    }

    if (message.includes('quota') || message.includes('limit exceeded')) {
      return new AppError(AppErrorType.QUOTA_EXCEEDED, error.message, undefined, false, context);
    }

    // Default to unknown error
    return new AppError(AppErrorType.UNKNOWN_ERROR, error.message, undefined, false, context);
  }

  // Log errors consistently
  private static logError(error: AppError): void {
    const logLevel = this.getLogLevel(error.type);
    const logData = {
      ...error.toJSON(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    switch (logLevel) {
      case 'error':
        console.error('AppError:', logData);
        break;
      case 'warn':
        console.warn('AppError:', logData);
        break;
      case 'info':
        console.info('AppError:', logData);
        break;
      default:
        console.log('AppError:', logData);
    }

    // In production, send to error reporting service
    if (import.meta.env.PROD) {
      this.reportToService(error);
    }
  }

  // Determine log level based on error type
  private static getLogLevel(type: AppErrorType): 'error' | 'warn' | 'info' | 'debug' {
    const errorLevels: Record<AppErrorType, 'error' | 'warn' | 'info' | 'debug'> = {
      [AppErrorType.DATABASE_ERROR]: 'error',
      [AppErrorType.AI_SERVICE_ERROR]: 'error',
      [AppErrorType.AUTHENTICATION_ERROR]: 'error',
      [AppErrorType.PERMISSION_ERROR]: 'error',
      [AppErrorType.CONFIGURATION_ERROR]: 'error',
      [AppErrorType.DATA_INTEGRITY_ERROR]: 'error',
      [AppErrorType.SERVICE_UNAVAILABLE]: 'warn',
      [AppErrorType.NETWORK_ERROR]: 'warn',
      [AppErrorType.TIMEOUT_ERROR]: 'warn',
      [AppErrorType.RATE_LIMIT_ERROR]: 'warn',
      [AppErrorType.QUOTA_EXCEEDED]: 'warn',
      [AppErrorType.JOB_NOT_FOUND]: 'info',
      [AppErrorType.VALIDATION_ERROR]: 'info',
      [AppErrorType.INVALID_URL]: 'info',
      [AppErrorType.UNKNOWN_ERROR]: 'error',
    };

    return errorLevels[type] || 'error';
  }

  // Add error to queue for analytics
  private static addToQueue(error: AppError): void {
    this.errorQueue.push(error);

    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
  }

  // Report to external error service
  private static reportToService(error: AppError): void {
    // TODO: Implement error reporting service integration
    // Example: Sentry, LogRocket, or custom service
    console.log('Would report to service:', error.toJSON());
  }

  // Get error analytics
  static getErrorAnalytics(): {
    totalErrors: number;
    errorsByType: Record<AppErrorType, number>;
    recentErrors: AppError[];
    errorRate: number;
  } {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentErrors = this.errorQueue.filter(
      error => new Date(error.timestamp).getTime() > now - oneHour
    );

    const errorsByType = this.errorQueue.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<AppErrorType, number>);

    return {
      totalErrors: this.errorQueue.length,
      errorsByType,
      recentErrors: recentErrors.slice(-10), // Last 10 recent errors
      errorRate: recentErrors.length, // Errors per hour
    };
  }

  // Clear error queue (for testing or reset)
  static clearErrorQueue(): void {
    this.errorQueue = [];
  }

  // Retry handler for recoverable errors
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: AppError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.handle(error, { attempt, maxRetries });

        if (!lastError.recoverable || attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1))
        );
      }
    }

    throw lastError!;
  }
}

// Utility functions for common error scenarios
export const errorUtils = {
  // Wrap async operations with error handling
  async safeAsync<T>(
    operation: () => Promise<T>,
    context?: ErrorContext
  ): Promise<{ data: T | null; error: AppError | null }> {
    try {
      const data = await operation();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: ErrorHandler.handle(error, context) };
    }
  },

  // Wrap sync operations with error handling
  safe<T>(
    operation: () => T,
    context?: ErrorContext
  ): { data: T | null; error: AppError | null } {
    try {
      const data = operation();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: ErrorHandler.handle(error, context) };
    }
  },

  // Create validation error
  validationError(message: string, field?: string): AppError {
    return new AppError(
      AppErrorType.VALIDATION_ERROR,
      message,
      undefined,
      false,
      { field }
    );
  },

  // Create network error
  networkError(message: string, url?: string): AppError {
    return new AppError(
      AppErrorType.NETWORK_ERROR,
      message,
      undefined,
      true,
      { url }
    );
  },

  // Create permission error
  permissionError(action: string): AppError {
    return new AppError(
      AppErrorType.PERMISSION_ERROR,
      `Permission denied for action: ${action}`,
      undefined,
      false,
      { action }
    );
  },
};