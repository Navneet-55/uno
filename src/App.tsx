// src/App.tsx

import React, { useEffect, ErrorBoundary } from 'react';
// import { TestComponent } from './TestComponent';
import { GameTable } from './components/GameTable';
import './index.css';

// Error Boundary Component
class GameErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Game Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-400 via-red-500 to-red-600 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center max-w-md w-full mx-4">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Game Error</h1>
            <p className="text-gray-700 mb-4">
              Something went wrong with the UNO game. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <pre className="text-xs text-gray-600 mt-2 overflow-auto">
                  {this.state.error.message}
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

function App() {
  // Respect user's motion preferences
  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.style.setProperty(
          '--animation-duration',
          e.matches ? '0.01s' : '0.3s'
        );
      };

      // Set initial value
      handleChange({ matches: mediaQuery.matches } as MediaQueryListEvent);
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch (error) {
      console.warn('Could not set up motion preferences:', error);
    }
  }, []);

  return (
    <GameErrorBoundary>
      <div className="App">
        <GameTable />
      </div>
    </GameErrorBoundary>
  );
}

export default App;