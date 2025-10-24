import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBreakingNews } from '../hooks/index.js';
import BreakingNewsCountdown from './shared/BreakingNewsCountdown.jsx';
import { formatDateInConfiguredTimezone } from '../services/timezoneService.js';
import { getNewsCategoryLabel, getNewsCategoryIcon } from '../utils/newsCategories.js';

const BreakingNews = () => {
  const { data: breakingNews = null, isLoading: loading, error } = useBreakingNews();
  const [formattedDate, setFormattedDate] = useState('');

  // Format date when breaking news data changes
  useEffect(() => {
    if (breakingNews && (breakingNews.published_at || breakingNews.created_at)) {
      // Format date in configured timezone
      const formatDateAsync = async () => {
        try {
          const dateToFormat = breakingNews.published_at || breakingNews.created_at;
          const formatted = await formatDateInTimezone(dateToFormat);
          setFormattedDate(formatted);
        } catch (error) {
          console.error('Error formatting date:', error);
          setFormattedDate('');
        }
      };
      formatDateAsync();
    } else {
      setFormattedDate('');
    }
  }, [breakingNews]);

  // Note: Real-time updates are now handled by useLiveData hook
  // No need for direct WebSocket subscriptions or hard reloads

  const formatDateInTimezone = async (dateString) => {
    try {
      return await formatDateInConfiguredTimezone(dateString, {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Failed to format date in timezone, using fallback:', error);
      // Fallback to simple date formatting
      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      } catch (fallbackError) {
        console.warn('Fallback date formatting also failed:', fallbackError);
      }
      return '';
    }
  };

  const getCategoryLabel = (category) => {
    return getNewsCategoryLabel(category);
  };

  const getCategoryIconLocal = (category) => {
    return getNewsCategoryIcon(category);
  };

  // Don't render anything if loading, error, or no breaking news
  if (loading || error || !breakingNews) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile Layout */}
        <div className="block sm:hidden py-3">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl animate-pulse">🚨</span>
            <span className="font-bold text-sm uppercase tracking-wide">
              Eilmeldung
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <div className="text-sm font-medium truncate">
                {breakingNews.title}
              </div>
              {formattedDate && (
                <div className="text-xs text-white/80 mt-1">
                  {formattedDate}
                </div>
              )}
              {breakingNews.breaking_news_until && (
                <div className="mt-1">
                  <BreakingNewsCountdown 
                    breakingNewsUntil={breakingNews.breaking_news_until} 
                    variant="compact"
                  />
                </div>
              )}
            </div>
            <Link
              to={`/news/${breakingNews.slug}`}
              className="inline-flex items-center px-2 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors duration-200 flex-shrink-0 whitespace-nowrap"
            >
              Lesen →
            </Link>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl animate-pulse">🚨</span>
              <span className="font-bold text-sm uppercase tracking-wide">
                Eilmeldung
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="font-medium">{breakingNews.title}</span>
              <span className="ml-2 text-white/80">
                {formattedDate}
              </span>
              {breakingNews.breaking_news_until && (
                <BreakingNewsCountdown 
                  breakingNewsUntil={breakingNews.breaking_news_until} 
                  variant="default"
                />
              )}
            </div>
            <Link
              to={`/news/${breakingNews.slug}`}
              className="inline-flex items-center px-2 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors duration-200 whitespace-nowrap"
            >
              Lesen →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakingNews;
