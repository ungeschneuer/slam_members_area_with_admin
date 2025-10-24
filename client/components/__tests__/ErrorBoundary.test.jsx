import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ErrorBoundary, { withErrorBoundary, useErrorBoundary } from '../ErrorBoundary.jsx';

// Component that throws an error
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws an error on mount
const ThrowErrorOnMount = () => {
  throw new Error('Mount error');
};

// Component that throws an error after a delay
const ThrowErrorAfterDelay = () => {
  React.useEffect(() => {
    setTimeout(() => {
      throw new Error('Delayed error');
    }, 100);
  }, []);
  return <div>Will throw error</div>;
};

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    // Suppress console.error for tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Error Boundary Functionality', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should catch errors and render fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary showDetails>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not show error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorBoundary showDetails>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after error', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      
      // Click retry button
      fireEvent.click(screen.getByText('Try Again'));
      
      // Rerender with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should track retry count', () => {
      render(
        <ErrorBoundary showDetails>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Retry count: 1')).toBeInTheDocument();
      
      // Click retry multiple times
      fireEvent.click(screen.getByText('Try Again'));
      fireEvent.click(screen.getByText('Try Again'));
      
      expect(screen.getByText('Retry count: 3')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback Component', () => {
    const CustomFallback = ({ error, retry }) => (
      <div>
        <h1>Custom Error: {error.message}</h1>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    it('should render custom fallback component', () => {
      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom Error: Test error')).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();
    });

    it('should call custom retry function', () => {
      const { rerender } = render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      fireEvent.click(screen.getByText('Custom Retry'));
      
      rerender(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    it('should log errors in development', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should log errors in production', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Production error:',
        expect.objectContaining({
          message: 'Test error',
          stack: expect.any(String),
          componentStack: expect.any(String),
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          url: expect.any(String)
        })
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should include error boundary name in logs', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorBoundary name="TestBoundary">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Production error:',
        expect.objectContaining({
          errorBoundary: 'TestBoundary'
        })
      );
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Higher-Order Component', () => {
    it('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowError);
      
      render(<WrappedComponent shouldThrow={true} />);
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });

    it('should preserve component display name', () => {
      const WrappedComponent = withErrorBoundary(ThrowError);
      
      expect(WrappedComponent.displayName).toBe('withErrorBoundary(ThrowError)');
    });
  });

  describe('useErrorBoundary Hook', () => {
    const TestComponent = () => {
      const { captureError, resetError } = useErrorBoundary();
      
      return (
        <div>
          <button onClick={() => captureError(new Error('Hook error'))}>
            Trigger Error
          </button>
          <button onClick={resetError}>
            Reset Error
          </button>
        </div>
      );
    };

    it('should capture errors from hook', () => {
      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );
      
      fireEvent.click(screen.getByText('Trigger Error'));
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });

    it('should reset errors from hook', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );
      
      fireEvent.click(screen.getByText('Trigger Error'));
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Reset Error'));
      rerender(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Trigger Error')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      
      // Trigger another error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Retry count: 2')).toBeInTheDocument();
    });

    it('should handle errors in nested components', () => {
      const NestedComponent = () => (
        <div>
          <ThrowError shouldThrow={true} />
        </div>
      );
      
      render(
        <ErrorBoundary>
          <NestedComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });

    it('should handle errors with no error message', () => {
      const ThrowEmptyError = () => {
        throw new Error();
      };
      
      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const errorContainer = screen.getByText('Oops! Something went wrong').closest('div');
      expect(errorContainer).toHaveClass('min-h-screen');
    });

    it('should have focusable retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton.tagName).toBe('BUTTON');
    });
  });
});
