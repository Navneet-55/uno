// src/App.tsx

import React, { useEffect } from 'react';
import { GameTable } from './components/GameTable';
import './index.css';

function App() {
  // Respect user's motion preferences
  useEffect(() => {
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
  }, []);

  return (
    <div className="App">
      <GameTable />
    </div>
  );
}

export default App;