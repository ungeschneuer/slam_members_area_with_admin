import React from 'react';

// Proper React error boundary component following project simplicity principles
export default class FormErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('Form section error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback || (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 dark:text-red-400 mr-2">⚠️</span>
            <span className="text-red-800 dark:text-red-200 font-medium">
              Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
