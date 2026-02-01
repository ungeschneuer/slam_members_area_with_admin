import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

export default function UserPasswordGate({ children }) {
  const { isUserAuthenticated, isAdmin, userLogin } = useAuth();
  const [isProtected, setIsProtected] = useState(null); // null = loading, true/false = status
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if password protection is enabled
  useEffect(() => {
    const checkProtectionStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/settings/user-password/status`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Runtime validation of API response
        if (data && typeof data === 'object' && 
            data.success === true && 
            data.data && 
            typeof data.data === 'object' && 
            typeof data.data.isProtected === 'boolean') {
          setIsProtected(data.data.isProtected);
        } else {
          // Invalid API response format
          setIsProtected(false); // Default to no protection on invalid response
        }
      } catch (error) {
        // Failed to check protection status
        // Show error state instead of defaulting to no protection
        setIsProtected('error');
      }
    };

    checkProtectionStatus();
  }, []);

  // If still loading protection status
  if (isProtected === null) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Lade...</p>
        </div>
      </div>
    );
  }

  // If API error occurred
  if (isProtected === 'error') {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verbindungsfehler</h2>
            <p className="text-gray-600 mb-4">Es gab ein Problem beim Laden der Schutz-Status.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-[#185657] text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no protection enabled, show children
  if (!isProtected) {
    return children;
  }

  // If user is authenticated (admin or user), show children
  if (isUserAuthenticated || isAdmin) {
    return children;
  }

  // Show password gate
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Bitte Passwort eingeben');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await userLogin(password);
      
      // Runtime validation of login result
      if (result && typeof result === 'object' && result.success === true) {
        // Success - component will re-render and show children
        setPassword('');
      } else if (result && typeof result === 'object' && result.success === false) {
        setError(result.error || 'Falsches Passwort');
      } else {
        // Invalid login response format
        setError('Ungültige Server-Antwort');
      }
    } catch (error) {
      // Login error
      setError('Netzwerkfehler');
    } finally {
      setIsLoading(false);
    }
  };

  return (
            <ErrorBoundary name="UserPasswordGate" fallback={
              <div className="min-h-screen bg-accent flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                  {/* Conference Badge Error State */}
                  <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Badge Header with Logo */}
                    <div className="bg-[#185657] p-6 text-center">
                      <div className="mb-4">
                        <img 
                          src="/slam25.png" 
                          alt="SLAM25 Logo" 
                          className="w-32 h-32 mx-auto object-contain bg-white rounded-full p-2"
                        />
                      </div>
                      <h1 className="text-white text-xl font-bold">Szene-Bereich</h1>
                    </div>

                    {/* Badge Body with Error */}
                    <div className="p-6 text-center">
                      <div className="text-red-600 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">Fehler beim Laden</h2>
                      <p className="text-gray-600 mb-4">Es gab ein Problem beim Laden der Passwort-Eingabe.</p>
                      <button 
                        onClick={() => window.location.reload()} 
                        className="w-full bg-[#185657] text-white py-3 px-4 rounded-lg hover:bg-primary-hover focus:ring-2 focus:ring-[#185657] focus:ring-offset-2 transition-colors font-medium"
                      >
                        Seite neu laden
                      </button>
                    </div>

                    {/* Badge Footer */}
                    <div className="bg-gray-50 px-6 py-3 text-center">
                      <p className="text-gray-600 text-sm">Spektakel Kollektiv Chemnitz e.V.</p>
                    </div>
                  </div>
                </div>
              </div>
            }>
      <div className="min-h-screen bg-accent flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Conference Badge */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Badge Header with Logo */}
            <div className="bg-[#185657] p-6 text-center">
              <div className="mb-4">
                <img 
                  src="/slam25.png" 
                  alt="SLAM25 Logo" 
                  className="w-32 h-32 mx-auto object-contain bg-white rounded-full p-2"
                />
              </div>
              <h1 className="text-white text-xl font-bold">Szene-Bereich</h1>
            </div>

            {/* Badge Body with Password Form */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Passwort eingeben"
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      disabled={isLoading}
                    >
                      {showPassword ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#185657] text-white py-3 px-4 rounded-lg hover:bg-primary-hover focus:ring-2 focus:ring-[#185657] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? 'Prüfe...' : 'Eintreten'}
                </button>
              </form>
            </div>

            {/* Badge Footer */}
            <div className="bg-gray-50 px-6 py-3 text-center">
              <p className="text-gray-600 text-sm">Spektakel Kollektiv Chemnitz e.V.</p>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
