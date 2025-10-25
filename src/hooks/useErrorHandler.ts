import { useState, useCallback, useEffect } from 'react';
import { AppError, ErrorHandler } from '@/lib/errorHandler';
import { useToast } from '@/hooks/use-toast';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: AppError) => void;
}

interface UseErrorHandlerReturn {
  error: AppError | null;
  isRetrying: boolean;
  retryCount: number;
  clearError: () => void;
  handleError: (error: unknown, context?: Record<string, string | number | boolean | null | undefined>) => AppError;
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    context?: Record<string, string | number | boolean | null | undefined>
  ) => Promise<{ data: T | null; error: AppError | null }>;
  retry: () => Promise<void>;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn => {
  const {
    showToast = true,
    autoRetry = false,
    maxRetries = 3,
    retryDelay = 1000,
    onError,
  } = options;

  const [error, setError] = useState<AppError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastOperation, setLastOperation] = useState<(() => Promise<unknown>) | null>(null);

  const { toast } = useToast();

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setLastOperation(null);
  }, []);

  const handleError = useCallback((
    error: unknown,
    context?: Record<string, string | number | boolean | null | undefined>
  ): AppError => {
    const appError = ErrorHandler.handle(error, context);
    setError(appError);

    // Show toast notification if enabled
    if (showToast) {
      toast({
        title: 'Error',
        description: appError.userMessage,
        variant: 'destructive',
      });
    }

    // Call custom error handler if provided
    if (onError) {
      onError(appError);
    }

    return appError;
  }, [showToast, toast, onError]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: Record<string, string | number | boolean | null | undefined>
  ): Promise<{ data: T | null; error: AppError | null }> => {
    try {
      setLastOperation(() => operation);
      const data = await operation();
      clearError(); // Clear any previous errors on success
      return { data, error: null };
    } catch (error) {
      const appError = handleError(error, context);
      return { data: null, error: appError };
    }
  }, [handleError, clearError]);

  const retry = useCallback(async () => {
    if (!lastOperation || !error || !error.recoverable) {
      return;
    }

    if (retryCount >= maxRetries) {
      const maxRetriesError = new AppError(
        'UNKNOWN_ERROR',
        `Maximum retry attempts (${maxRetries}) exceeded`,
        'Maximum retry attempts exceeded. Please try again later.',
        false,
        { originalError: error.type, retryCount }
      );
      setError(maxRetriesError);
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Wait before retry with exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, retryDelay * Math.pow(2, retryCount))
      );

      await lastOperation();
      clearError(); // Success - clear error
    } catch (retryError) {
      handleError(retryError, { isRetry: true, retryCount: retryCount + 1 });
    } finally {
      setIsRetrying(false);
    }
  }, [lastOperation, error, retryCount, maxRetries, retryDelay, handleError, clearError]);

  // Auto-retry for recoverable errors
  useEffect(() => {
    if (autoRetry && error && error.recoverable && retryCount < maxRetries && !isRetrying) {
      const timeoutId = setTimeout(() => {
        retry();
      }, retryDelay * Math.pow(2, retryCount));

      return () => clearTimeout(timeoutId);
    }
  }, [autoRetry, error, retryCount, maxRetries, isRetrying, retry, retryDelay]);

  return {
    error,
    isRetrying,
    retryCount,
    clearError,
    handleError,
    executeWithErrorHandling,
    retry,
  };
};

// Hook for global error state management
interface UseGlobalErrorState {
  errors: AppError[];
  addError: (error: AppError) => void;
  removeError: (errorId: string) => void;
  clearAllErrors: () => void;
  hasErrors: boolean;
  criticalErrors: AppError[];
}

let globalErrors: AppError[] = [];
const globalErrorListeners: Set<(errors: AppError[]) => void> = new Set();

const notifyGlobalErrorListeners = () => {
  globalErrorListeners.forEach(listener => listener([...globalErrors]));
};

export const useGlobalErrorState = (): UseGlobalErrorState => {
  const [errors, setErrors] = useState<AppError[]>([...globalErrors]);

  useEffect(() => {
    const listener = (updatedErrors: AppError[]) => {
      setErrors(updatedErrors);
    };

    globalErrorListeners.add(listener);

    return () => {
      globalErrorListeners.delete(listener);
    };
  }, []);

  const addError = useCallback((error: AppError) => {
    globalErrors.push(error);
    
    // Keep only last 50 errors to prevent memory issues
    if (globalErrors.length > 50) {
      globalErrors = globalErrors.slice(-50);
    }
    
    notifyGlobalErrorListeners();
  }, []);

  const removeError = useCallback((errorId: string) => {
    globalErrors = globalErrors.filter(error => error.errorId !== errorId);
    notifyGlobalErrorListeners();
  }, []);

  const clearAllErrors = useCallback(() => {
    globalErrors = [];
    notifyGlobalErrorListeners();
  }, []);

  const hasErrors = errors.length > 0;
  const criticalErrors = errors.filter(error => 
    ['DATABASE_ERROR', 'AI_SERVICE_ERROR', 'AUTHENTICATION_ERROR', 'CONFIGURATION_ERROR'].includes(error.type)
  );

  return {
    errors,
    addError,
    removeError,
    clearAllErrors,
    hasErrors,
    criticalErrors,
  };
};

// Hook for API call error handling
interface UseApiErrorHandlerOptions extends UseErrorHandlerOptions {
  loadingState?: boolean;
}

export const useApiErrorHandler = (options: UseApiErrorHandlerOptions = {}) => {
  const errorHandler = useErrorHandler(options);
  const [isLoading, setIsLoading] = useState(false);

  const executeApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    context?: Record<string, string | number | boolean | null | undefined>
  ): Promise<{ data: T | null; error: AppError | null; isLoading: boolean }> => {
    setIsLoading(true);
    
    const result = await errorHandler.executeWithErrorHandling(apiCall, context);
    
    setIsLoading(false);
    
    return {
      ...result,
      isLoading: false,
    };
  }, [errorHandler]);

  return {
    ...errorHandler,
    isLoading,
    executeApiCall,
  };
};

// Utility hook for form validation errors
export const useFormErrorHandler = () => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const addFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  const removeFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }, []);

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const hasFieldError = useCallback((field: string): boolean => {
    return field in fieldErrors;
  }, [fieldErrors]);

  const getFieldError = useCallback((field: string): string | undefined => {
    return fieldErrors[field];
  }, [fieldErrors]);

  const validateField = useCallback((field: string, value: unknown, rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => string | null;
  }): boolean => {
    const { required, minLength, maxLength, pattern, custom } = rules;

    // Clear existing error first
    removeFieldError(field);

    // Required validation
    if (required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      addFieldError(field, `${field} is required`);
      return false;
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return true;
    }

    // String validations
    if (typeof value === 'string') {
      if (minLength && value.length < minLength) {
        addFieldError(field, `${field} must be at least ${minLength} characters`);
        return false;
      }

      if (maxLength && value.length > maxLength) {
        addFieldError(field, `${field} must be no more than ${maxLength} characters`);
        return false;
      }

      if (pattern && !pattern.test(value)) {
        addFieldError(field, `${field} format is invalid`);
        return false;
      }
    }

    // Custom validation
    if (custom) {
      const customError = custom(value);
      if (customError) {
        addFieldError(field, customError);
        return false;
      }
    }

    return true;
  }, [addFieldError, removeFieldError]);

  return {
    fieldErrors,
    addFieldError,
    removeFieldError,
    clearFieldErrors,
    hasFieldError,
    getFieldError,
    validateField,
    hasErrors: Object.keys(fieldErrors).length > 0,
  };
};