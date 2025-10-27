import React, { createContext, useContext, useState, useEffect } from 'react';

const UIContext = createContext();

export function UIProvider({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // Static areas configuration
  const areas = ['Teilnehmer*innen', 'Runden', 'Zeitplan', 'Neuigkeiten', 'Stadt-Tipps', 'Info', 'Fun'];

  // Auto-set config as loaded after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setConfigLoaded(true);
    }, 100); // Small delay to ensure proper initialization
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <UIContext.Provider value={{ 
      mobileMenuOpen, 
      setMobileMenuOpen,
      configLoaded,
      setConfigLoaded,
      areas
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
