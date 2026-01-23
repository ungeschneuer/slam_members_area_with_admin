import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle, useLinks } from '../hooks/index.js';
import { getLinkProps, handleLinkClick } from '../utils/linkUtils.js';

export default function Fun() {
  usePageTitle('Fun');
  const { data: linksData, isLoading: linksLoading, error: linksError } = useLinks();
  const [links, setLinks] = useState([]);

  // Update local state when links data changes
  useEffect(() => {
    if (linksData) {
      setLinks(Array.isArray(linksData) ? linksData : []);
    } else if (linksError) {
      // Fallback to default links on error
      setLinks(getDefaultLinks());
    }
  }, [linksData, linksError]);

  const getDefaultLinks = () => [
    {
      id: 1,
      title: 'Photo Cloud',
      description: 'Teile und entdecke Fotos vom Poetry Slam',
      url: 'https://photos.google.com',
      icon: '📸',
      category: 'Medien',
      is_external: true,
      color: 'blue',
      isActive: true
    },
    {
      id: 2,
      title: 'Social Media Slides',
      description: 'Folien und Präsentationen für Social Media',
      url: 'https://slides.google.com',
      icon: '📱',
      category: 'Medien',
      is_external: true,
      color: 'purple',
      isActive: true
    },
    {
      id: 3,
      title: 'Spotify Playlist',
      description: 'Die offizielle SLAM25 Playlist',
      url: 'https://open.spotify.com',
      icon: '🎵',
      category: 'Musik',
      is_external: true,
      color: 'green',
      isActive: true
    },
    {
      id: 4,
      title: 'Telegram Channel',
      description: 'Bleibe auf dem Laufenden mit unserem Telegram Kanal',
      url: 'https://t.me/slam25',
      icon: '💬',
      category: 'Kommunikation',
      is_external: true,
      color: 'blue',
      isActive: true
    }
  ];

  // Filter active links and sort by sortOrder
  const activeLinks = (Array.isArray(links) ? links : [])
    .filter(link => link.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="page-header-card text-center">
        <h1 className="heading-primary mb-4">Fun & Weiteres ✨</h1>
        <p className="text-body max-w-2xl mx-auto">
          Alles Weitere, was nicht auf die anderen Seite passt!
        </p>
      </div>
      
      {/* Fun Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Meet Someone New - Temporarily disabled
        <Link 
          to="/fun/meet" 
          className="card-elevated p-6 text-center hover:scale-105 transition-all duration-300 transform hover:shadow-xl group"
        >
          <div className="text-6xl mb-4 group-hover:animate-float">🎲</div>
          <h2 className="heading-secondary mb-3">Triff jemand Neues</h2>
          <p className="text-body text-gray-600 dark:text-gray-400">
            Entdecke zufällig Poetry Slam Teilnehmer*innen mit Instagram-Profilen und lerne neue Menschen kennen!
          </p>
          <div className="mt-4 text-blue-600 dark:text-blue-400 font-semibold group-hover:text-blue-800 dark:group-hover:text-blue-300">
            Jetzt entdecken →
          </div>
        </Link>
        */}
        
        {/* Foto Challenge */}
        <a 
          href="https://challenge.slam25.de" 
          onClick={(e) => {
            const fotoChallengeLink = {
              url: 'https://challenge.slam25.de',
              title: 'Foto Challenge',
              is_external: true
            };
            handleLinkClick(fotoChallengeLink, e);
          }}
          className="card-elevated p-6 text-center hover:scale-105 transition-all duration-300 transform hover:shadow-xl group col-span-2"
        >
          <div className="text-6xl mb-4 group-hover:animate-float">📸</div>
          <h2 className="heading-secondary mb-3">Foto Challenge</h2>
          <p className="text-body text-gray-600 dark:text-gray-400">
            Nimm an der SLAM25 Foto Challenge teil und teile deine kreativen Momente mit der Community!
          </p>
          <div className="mt-4 text-blue-600 dark:text-blue-400 font-semibold group-hover:text-blue-800 dark:group-hover:text-blue-300">
            Challenge starten →
          </div>
        </a>
      </div>

      {/* Links Section */}
      <div className="mt-8">
        <h2 className="heading-secondary mb-4">Wichtige Links</h2>
        
        {linksLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Lade Links...</p>
          </div>
        )}

        {linksError && !linksLoading && (
          <div className="text-center py-8">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Fehler beim Laden der Links
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {!linksLoading && !linksError && activeLinks.length > 0 && (
          <div className="space-y-2">
            {activeLinks.map(link => {
              const linkProps = getLinkProps(link.url, link.is_external);
              
              return (
                <a
                  key={link.id}
                  href={link.url}
                  onClick={(e) => handleLinkClick(link, e)}
                  target={linkProps.target}
                  rel={linkProps.rel}
                  aria-label={`${link.title} - ${link.description}`}
                  className="card-elevated p-3 flex items-center space-x-3 hover:shadow-lg transition-shadow"
                >
                <span className="text-2xl">{link.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">{link.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{link.description}</div>
                </div>
              </a>
              );
            })}
          </div>
        )}

        {!linksLoading && !linksError && activeLinks.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <span className="text-4xl">🔗</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Keine Links verfügbar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
