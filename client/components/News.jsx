import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNews, usePageTitle } from '../hooks/index.js';
import pwaService from '../services/pwaService.js';
import LoadingSpinner from './LoadingSpinner';
import { ErrorMessage, SuccessMessage } from './StatusMessages.jsx';
import { getAvailablePublishedFilterOptions, validateFilterValue } from '../utils/filterUtils.js';
import { getNewsCategoryFilterOptions, getNewsCategoryLabel, getNewsCategoryIcon } from '../utils/newsCategories.js';

export default function News() {
  usePageTitle('Neuigkeiten');
  const { data: news = [], isLoading: loading, error } = useNews();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState(null);
  const [sortBy, setSortBy] = useState('date');

  // Use centralized category definitions
  const baseCategories = [
    { id: 'all', name: 'Alle Nachrichten', icon: '📰' },
    { id: 'participants', name: 'Teilnehmer*innen', icon: '👥' }
  ];
  const newsCategories = getNewsCategoryFilterOptions();
  const predefinedCategories = [...baseCategories, ...newsCategories];

  // Dynamic categories based on published content
  const categories = useMemo(() => {
    return getAvailablePublishedFilterOptions(news, predefinedCategories, 'category');
  }, [news]);

  // Auto-reset selected category if it no longer exists
  useEffect(() => {
    const validCategory = validateFilterValue(selectedCategory, categories);
    if (validCategory !== selectedCategory) {
      setSelectedCategory(validCategory);
    }
  }, [categories]); // Only depend on categories, not selectedCategory to prevent loops

  const filteredNews = news.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const publishedNews = filteredNews.filter(item => item.status === 'PUBLISHED' || item.is_published);
  
  // Apply sorting to the published news
  const sortedNews = publishedNews.sort((a, b) => {
    switch (sortBy) {
      case 'date':
        // Newest first (default)
        return new Date(b.created_at || b.published_at || b.date) - new Date(a.created_at || a.published_at || a.date);
      case 'date-asc':
        // Oldest first
        return new Date(a.created_at || a.published_at || a.date) - new Date(b.created_at || b.published_at || b.date);
      case 'title':
        // Alphabetical by title
        return (a.title || '').localeCompare(b.title || '');
      case 'priority':
        // Priority sorting (breaking news first, then by date)
        const aIsBreaking = a.is_breaking_news || a.isBreakingNews;
        const bIsBreaking = b.is_breaking_news || b.isBreakingNews;
        
        if (aIsBreaking && !bIsBreaking) return -1;
        if (!aIsBreaking && bIsBreaking) return 1;
        
        // If both or neither are breaking, sort by date (newest first)
        return new Date(b.created_at || b.published_at || b.date) - new Date(a.created_at || a.published_at || a.date);
      default:
        return 0;
    }
  });
  
  // All news are treated equally now
  const regularNews = sortedNews;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCategoryLabel = (type) => {
    return getNewsCategoryLabel(type);
  };

  const getCategoryIconLocal = (type) => {
    return getNewsCategoryIcon(type);
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
    <div data-testid="news-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Neuigkeiten & Updates</h1>
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
            {newsCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value="participants">Teilnehmer*innen</option>
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


        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {regularNews.map((item) => (
            <Link
              key={item.id}
              to={`/news/${item.slug}`}
              className="bg-white dark:bg-gray-700 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 block group"
            >
              <div className="flex items-start space-x-5 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-xl">{getCategoryIconLocal(item.category)}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight text-lg">{item.title}</h3>
                  <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                    {getCategoryLabel(item.category)}
                  </span>
                </div>
              </div>
              
              {/* Featured Image */}
              {item.featured_image_url && (
                <div className="mb-4">
                  {item.featured_image_url.toLowerCase().includes('.pdf') ? (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-600 rounded-lg">
                      <span className="text-3xl">📄</span>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">PDF-Dokument</p>
                        <a 
                          href={item.featured_image_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          PDF anzeigen
                        </a>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={item.featured_image_url} 
                      alt={item.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>
              )}
              
              <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-4 leading-relaxed text-base">{item.content}</p>
              
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>Von SLAM25 Team</span>
                  <span>•</span>
                  <span>{new Date(item.published_at || item.created_at).toLocaleDateString('de-DE', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    timeZone: 'Europe/Berlin'
                  })}</span>
                </div>
                <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:text-blue-800 dark:group-hover:text-blue-200 transition-colors">
                  <span>Weiterlesen</span>
                  <svg className="ml-1 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
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
