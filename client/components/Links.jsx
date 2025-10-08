import React, { useState, useEffect } from 'react';
import { FadeIn, StaggeredContainer, HoverTransition, OpacityTransition } from './Transitions.jsx';
import { useLinks } from '../hooks/index.js';
import './Links.css';

const Links = () => {
  const { data: linksData, isLoading: loading, error } = useLinks();
  const [links, setLinks] = useState([]);

  // Update local state when useLiveData changes
  useEffect(() => {
    if (linksData) {
      setLinks(Array.isArray(linksData) ? linksData : []);
    } else if (error) {
      // Fallback to default links on error
      setLinks(getDefaultLinks());
    }
  }, [linksData, error]);

  const getDefaultLinks = () => [
    {
      id: 1,
      title: 'Photo Cloud',
      description: 'Teile und entdecke Fotos vom Poetry Slam',
      url: 'https://photos.google.com',
      icon: '📸',
      category: 'Medien',
      isExternal: true,
      color: 'blue'
    },
    {
      id: 2,
      title: 'Social Media Slides',
      description: 'Folien und Präsentationen für Social Media',
      url: 'https://slides.google.com',
      icon: '📱',
      category: 'Medien',
      isExternal: true,
      color: 'purple'
    },
    {
      id: 3,
      title: 'Spotify Playlist',
      description: 'Die offizielle SLAM25 Playlist',
      url: 'https://open.spotify.com',
      icon: '🎵',
      category: 'Musik',
      isExternal: true,
      color: 'green'
    },
    {
      id: 4,
      title: 'Telegram Channel',
      description: 'Bleibe auf dem Laufenden mit unserem Telegram Kanal',
      url: 'https://t.me/slam25',
      icon: '💬',
      category: 'Kommunikation',
      isExternal: true,
      color: 'blue'
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
    };
    return colorMap[color] || colorMap.blue;
  };

  const getGradientClasses = (color) => {
    const gradientMap = {
      blue: 'from-blue-500 via-blue-600 to-indigo-600',
      purple: 'from-purple-500 via-purple-600 to-pink-600',
      green: 'from-green-500 via-emerald-600 to-teal-600',
      red: 'from-red-500 via-rose-600 to-pink-600',
      yellow: 'from-yellow-500 via-amber-600 to-orange-600',
      indigo: 'from-indigo-500 via-blue-600 to-purple-600'
    };
    return gradientMap[color] || gradientMap.blue;
  };

  const handleLinkClick = (link, e) => {
    // Check if link is empty or invalid
    if (!link.url || link.url === '#' || link.url === '' || link.url === 'javascript:void(0)') {
      e.preventDefault();
      
      // Show a toast notification or alert
      alert(`Der Link "${link.title}" ist noch nicht verfügbar. Bitte versuche es später erneut.`);
      return;
    }
    
    if (link.isExternal) {
      // Track external link clicks
      console.log(`External link clicked: ${link.title} -> ${link.url}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg animate-pulse">
              <span className="text-3xl">🔗</span>
            </div>
            <div className="h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent rounded-lg w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-lg w-96 mx-auto animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="relative p-0 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse"></div>
                <div className="relative p-8 bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/30">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-2xl animate-pulse"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="relative inline-block mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-6xl">⚠️</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-white text-sm">!</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Fehler beim Laden der Links
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {error?.message || error}
            </p>
            <HoverTransition className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full h-full"
              >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Erneut versuchen
              </button>
            </HoverTransition>
          </div>
        </div>
      </div>
    );
  }

  // Group links by category - ensure links is an array
  const groupedLinks = (Array.isArray(links) ? links : []).reduce((acc, link) => {
    const category = link.category || 'Sonstiges';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(link);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <FadeIn>
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <span className="text-3xl">🔗</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text bg-clip-text text-transparent mb-4">
              Wichtige Links
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Alle wichtigen Links und Ressourcen für SLAM25 auf einen Blick
            </p>
            <div className="mt-6 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full pulse-dot"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full pulse-dot"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full pulse-dot"></div>
            </div>
          </div>

          <StaggeredContainer>
            {Object.entries(groupedLinks).map(([category, categoryLinks], categoryIndex) => (
              <div key={category} className="mb-12">
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <span className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3 shadow-sm"></span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {category}
                    </h2>
                  </div>
                  <div className="h-px bg-gradient-to-r from-gray-300 dark:from-gray-600 to-transparent"></div>
                </div>
                
                <div className="space-y-6">
                  {categoryLinks.map((link, linkIndex) => (
                    <FadeIn key={link.id} delay={linkIndex * 100}>
                      <HoverTransition className="links-card">
                        <a
                          href={link.url}
                          target={link.isExternal ? '_blank' : '_self'}
                          rel={link.isExternal ? 'noopener noreferrer' : undefined}
                          onClick={(e) => handleLinkClick(link, e)}
                          className="group relative block p-0 rounded-2xl overflow-hidden focus:outline-none"
                          aria-label={`${link.title} - ${link.description}`}
                        >
                        {/* Background gradient based on color */}
                        <OpacityTransition isVisible={true} className={`absolute inset-0 bg-gradient-to-br ${getGradientClasses(link.color)} opacity-90 group-hover:opacity-100`}></OpacityTransition>
                        
                        {/* Glass morphism overlay */}
                        <div className="relative p-8 bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 glass-effect">
                          <div className="flex items-center space-x-6">
                            <div className="flex-shrink-0">
                              <div className="w-20 h-20 bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl shadow-lg border border-white/30 dark:border-gray-600/30">
                                {link.icon}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-2xl font-bold text-white group-hover:text-white/90 transition-colors">
                                  {link.title}
                                </h3>
                                {link.isExternal && (
                                  <OpacityTransition isVisible={false} className="transform group-hover:translate-x-1">
                                    <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </OpacityTransition>
                                )}
                              </div>
                              
                              <p className="text-white/80 text-lg leading-relaxed mb-4">
                                {link.description}
                              </p>
                              
                              <div className="flex items-center justify-end">
                                <span className="text-sm text-white/60 font-medium">
                                  {link.isExternal ? 'Externer Link' : 'Interner Link'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Hover effect overlay */}
                          <OpacityTransition isVisible={false} className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></OpacityTransition>
                        </div>
                        </a>
                      </HoverTransition>
                    </FadeIn>
                  ))}
                </div>
              </div>
            ))}
          </StaggeredContainer>

          {(!Array.isArray(links) || links.length === 0) && (
            <div className="text-center py-20">
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-8 shadow-lg">
                  <span className="text-6xl opacity-50">🔗</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">!</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Keine Links verfügbar
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                Momentan sind keine Links verfügbar. Schaue später nochmal vorbei!
              </p>
              <div className="mt-8 flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full pulse-dot"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full pulse-dot"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full pulse-dot"></div>
              </div>
            </div>
          )}
        </FadeIn>
      </div>
    </div>
  );
};

export default Links;
