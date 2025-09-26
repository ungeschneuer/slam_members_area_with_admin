import React, { useState, useEffect } from 'react';
import hybridDataService from '../services/hybridDataService.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './ErrorBoundary.jsx';

export default function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState(null);
  const [sortBy, setSortBy] = useState('date');

  const categories = [
    { id: 'all', name: 'Alle Nachrichten', icon: '📰' },
    { id: 'announcement', name: 'Ankündigungen', icon: '📢' },
    { id: 'jury', name: 'Jury', icon: '👨‍⚖️' },
    { id: 'workshops', name: 'Workshops', icon: '🎓' },
    { id: 'participants', name: 'Teilnehmer', icon: '👥' },
    { id: 'prizes', name: 'Preise', icon: '🏆' }
  ];

  // Load news data
  useEffect(() => {
    const loadNews = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await hybridDataService.getData('news');
        setNews(data || []);
      } catch (error) {
        console.error('Error loading news:', error);
        setError('Fehler beim Laden der Nachrichten');
      } finally {
        setLoading(false);
      }
    };

    loadNews();

    // Subscribe to data changes
    const unsubscribe = hybridDataService.subscribe((dataType) => {
      if (dataType === 'news') {
        console.log('News: Data changed, refreshing...');
        loadNews();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredNews = news.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const publishedNews = filteredNews.filter(item => item.status === 'PUBLISHED' || item.isPublished);
  
  // Separate high priority and regular news
  const highPriorityNews = publishedNews.filter(item => item.category === 'announcement');
  const regularNews = publishedNews.filter(item => item.category !== 'announcement');

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCategoryLabel = (type) => {
    const category = categories.find(c => c.id === type);
    return category ? category.name : type;
  };

  const getCategoryIcon = (type) => {
    const category = categories.find(c => c.id === type);
    return category ? category.icon : '📰';
  };

  if (loading) {
    return <LoadingSpinner size="xl" text="Nachrichten werden geladen..." />;
  }

  if (error) {
    return (
      <ErrorMessage 
        error={error} 
        onRetry={() => window.location.reload()} 
        className="max-w-4xl mx-auto"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Error and Success Messages */}
      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={() => window.location.reload()} 
          className="max-w-4xl mx-auto"
        />
      )}
      
      {success && (
        <SuccessMessage 
          message={success} 
          onDismiss={() => setSuccess(null)} 
          className="max-w-4xl mx-auto"
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">News & Updates</h1>
          <p className="text-gray-600 dark:text-gray-400">Aktuelle Informationen und Ankündigungen zum SLAM25 Event</p>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="News durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Alle Kategorien</option>
            <option value="announcement">Ankündigungen</option>
            <option value="jury">Jury</option>
            <option value="workshops">Workshops</option>
            <option value="participants">Teilnehmer</option>
            <option value="prizes">Preise</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="date">Neueste zuerst</option>
            <option value="date-asc">Älteste zuerst</option>
            <option value="title">Titel A-Z</option>
            <option value="priority">Priorität</option>
          </select>
        </div>

        {/* High Priority News */}
        {highPriorityNews.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Wichtige Ankündigungen</h2>
            <div className="space-y-4">
              {highPriorityNews.map((item) => (
                <div key={item.id} className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        <span className="text-red-600 dark:text-red-400 text-xl">📢</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">{item.title}</h3>
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium rounded-full">
                          {getCategoryLabel(item.category)}
                        </span>
                      </div>
                      <p className="text-red-800 dark:text-red-200 mb-3">{item.content}</p>
                      <div className="flex items-center justify-between text-sm text-red-600 dark:text-red-400">
                        <span>Von SLAM25 Team</span>
                        <span>{new Date(item.created_at).toLocaleDateString('de-DE', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          timeZone: 'Europe/Berlin'
                        })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regularNews.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:-translate-y-1">
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-lg">{getCategoryIcon(item.category)}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{item.title}</h3>
                                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                      {getCategoryLabel(item.category)}
                    </span>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{item.content}</p>
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Von SLAM25 Team</span>
                <span>{new Date(item.created_at).toLocaleDateString('de-DE', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  timeZone: 'Europe/Berlin'
                })}</span>
              </div>
            </div>
          ))}
        </div>

        {publishedNews.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📰</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine News gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Versuchen Sie andere Suchkriterien oder schauen Sie später wieder vorbei.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
