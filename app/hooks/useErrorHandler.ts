import { useState, useCallback } from 'react';

interface UseErrorHandlerReturn {
  error: Error | null;
  setError: (error: Error | null) => void;
  clearError: () => void;
  handleError: (error: unknown) => void;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof Error) {
      setError(error);
    } else if (typeof error === 'string') {
      setError(new Error(error));
    } else {
      setError(new Error('An unexpected error occurred'));
    }
  }, []);

  return {
    error,
    setError,
    clearError,
    handleError,
  };
}
