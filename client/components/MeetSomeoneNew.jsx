import React, { useState, useEffect, useMemo } from 'react';
import { useParticipants, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage } from './StatusMessages.jsx';
import { handleLinkClick } from '../utils/linkUtils.js';

export default function MeetSomeoneNew() {
  usePageTitle('Triff jemand Neues');
  
  // Component state
  const [shownIds, setShownIds] = useState([]);
  const [currentParticipant, setCurrentParticipant] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Data fetching
  const { data: participantsResponse, isLoading, error } = useParticipants({ limit: 10000, offset: 0 }, false);
  const participants = participantsResponse?.data || participantsResponse || [];
  
  // Filter participants with Instagram handles
  const participantsWithInstagram = useMemo(() => {
    return participants.filter(p => p.instagram && p.instagram.trim());
  }, [participants]);
  
  // Available participants (not shown yet)
  const availableParticipants = useMemo(() => {
    return participantsWithInstagram.filter(p => !shownIds.includes(p.id));
  }, [participantsWithInstagram, shownIds]);
  
  // Check if all participants have been shown
  const allShown = participantsWithInstagram.length > 0 && availableParticipants.length === 0;
  
  // Random selection logic
  const handleRandomClick = () => {
    if (availableParticipants.length === 0) return;
    
    setIsAnimating(true);
    setShowConfetti(true);
    
    // Add slight delay for button animation
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      const selected = availableParticipants[randomIndex];
      
      setCurrentParticipant(selected);
      setShownIds([...shownIds, selected.id]);
      setIsAnimating(false);
      
      // Hide confetti after animation
      setTimeout(() => setShowConfetti(false), 1000);
    }, 200);
  };
  
  // Reset functionality
  const handleReset = () => {
    setShownIds([]);
    setCurrentParticipant(null);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner size="xl" text="Teilnehmer*innen werden geladen..." />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorMessage 
          error={error} 
          onRetry={() => window.location.reload()} 
        />
      </div>
    );
  }
  
  // No participants with Instagram
  if (participantsWithInstagram.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="page-header-card">
          <h1 className="heading-primary">Triff jemand Neues 🎲</h1>
          <p className="text-body">
            Ziehe eine zufällige Festival-Teilnehmer*in. Durch das Instagram-Profile kannst du direkt sehen, wie die Person aussieht!
          </p>
        </div>
        
        <div className="card-base p-8 text-center">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="heading-secondary mb-4">Teilnehmer*innen kommt bald :)</h2>
          <p className="text-body">
            Bald werden hier alle Poetry Slam Teilnehmer*innen zu sehen sein!
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header - Compact */}
      <div className="text-center mb-4">
        <h1 className="heading-primary text-2xl sm:text-3xl mb-2">Triff jemand Neues! 🎲</h1>
        <p className="text-body text-sm sm:text-base max-w-xl mx-auto">
          Ziehe eine zufällige Festival-Teilnehmer*innen. Durch das Instagram-Profile kannst du direkt sehen, wie die Person aussieht!
        </p>
      </div>
      
      {/* Progress Indicator - Compact */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {shownIds.length} von {participantsWithInstagram.length} gesehen
          </span>
        </div>
      </div>
      
      
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`
                absolute w-3 h-3 rounded-full
                animate-confetti
                ${i % 4 === 0 ? 'bg-yellow-400' : ''}
                ${i % 4 === 1 ? 'bg-pink-400' : ''}
                ${i % 4 === 2 ? 'bg-blue-400' : ''}
                ${i % 4 === 3 ? 'bg-green-400' : ''}
              `}
              style={{
                left: `${Math.random() * 100}%`,
                top: '50%',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random() * 0.5}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Participant Card - Compact */}
      {currentParticipant && (
        <div className="animate-slide-up-spring gpu-accelerated">
          <div className="card-elevated p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-xl"></div>
            
            <div className="relative z-10 text-center">
              {/* Name */}
              <h2 className="heading-secondary text-lg text-gray-900 dark:text-white mb-2">
                {currentParticipant.name}
              </h2>
              
              {/* Role Badge */}
              <div className="mb-3">
                <span className="badge-role text-xs">
                  {currentParticipant.role}
                </span>
              </div>
              
              {/* Details - Horizontal Layout */}
              <div className="flex flex-wrap justify-center gap-3 mb-3 text-sm">
                {currentParticipant.region && (
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500 dark:text-gray-400">📍</span>
                    <span className="text-body">
                      {currentParticipant.region}
                    </span>
                  </div>
                )}
                
                {currentParticipant.pronouns && (
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500 dark:text-gray-400">👤</span>
                    <span className="text-body">
                      {currentParticipant.pronouns}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Instagram Link - Compact */}
              {currentParticipant.instagram && (
                <a
                  href={`https://instagram.com/${currentParticipant.instagram}`}
                  onClick={(e) => {
                    const instagramLink = {
                      url: `https://instagram.com/${currentParticipant.instagram}`,
                      title: `Instagram Profil von ${currentParticipant.name}`,
                      is_external: true
                    };
                    handleLinkClick(instagramLink, e);
                  }}
                  className="inline-flex items-center justify-center px-4 py-2 bg-[#185757] dark:bg-[#A2D2B9] text-white dark:text-gray-900 rounded-full hover:bg-[#0f3a3b] dark:hover:bg-[#8BC4A3] transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                  aria-label={`Instagram Profil von ${currentParticipant.name}`}
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  @{currentParticipant.instagram}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Random Button - Always visible under participant card */}
      <div className="text-center mb-4 pt-6">
        <button
          onClick={handleRandomClick}
          disabled={availableParticipants.length === 0}
          className={`
            btn-primary px-6 py-3 text-base font-semibold rounded-full
            transition-all duration-300 transform
            hover:scale-105 active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
            ${isAnimating ? 'animate-shake' : ''}
            ${availableParticipants.length > 0 ? 'animate-pulse bg-blue-600' : ''}
            gpu-accelerated shadow-lg hover:shadow-xl
          `}
          aria-label="Zufällige Person ziehen"
          aria-live="polite"
        >
          {isAnimating ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Ziehe...
            </span>
          ) : allShown ? (
            'Alle gesehen! 🎉'
          ) : (
            'Zufällig ziehen 🎲'
          )}
        </button>
      </div>
      
      {/* All Shown State - Compact */}
      {allShown && (
        <div className="animate-bounce-in">
          <div className="card-elevated p-4 text-center">
            <div className="text-3xl sm:text-4xl mb-2">🎉</div>
            <h2 className="heading-secondary text-lg text-gray-900 dark:text-white mb-2">Alle gesehen!</h2>
            <p className="text-body text-sm text-gray-600 dark:text-gray-400 mb-3">
              Du hast alle {participantsWithInstagram.length} Teilnehmer*innen kennengelernt!
            </p>
            <button
              onClick={handleReset}
              className="btn-secondary px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
            >
              Zurücksetzen 🔄
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
