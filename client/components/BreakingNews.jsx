import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBreakingNews } from '../hooks/index.js';
import BreakingNewsCountdown from './shared/BreakingNewsCountdown.jsx';
import { formatDateInConfiguredTimezone } from '../services/timezoneService.js';

const BreakingNews = () => {
  const { data: breakingNewsData, isLoading: loading, error } = useBreakingNews();
  const [breakingNews, setBreakingNews] = useState(null);
  const [formattedDate, setFormattedDate] = useState('');

  // Update local state when useLiveData changes
  useEffect(() => {
    if (breakingNewsData) {
      setBreakingNews(breakingNewsData);
      // Format date in configured timezone
      const formatDateAsync = async () => {
        try {
          const formatted = await formatDate(breakingNewsData.created_at);
          setFormattedDate(formatted);
        } catch (error) {
          console.error('Error formatting date:', error);
          setFormattedDate('');
        }
      };
      formatDateAsync();
    } else {
      setBreakingNews(null);
      setFormattedDate('');
    }
  }, [breakingNewsData]);

  // Note: Real-time updates are now handled by useLiveData hook
  // No need for direct WebSocket subscriptions or hard reloads


  const formatDate = async (dateString) => {
    return await formatDateInConfiguredTimezone(dateString, {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  const getCategoryLabel = (category) => {
    const categories = {
      'announcement': 'Ankündigungen',
      'workshops': 'Workshops',
      'participants': 'Teilnehmer*in',
      'prizes': 'Preise',
      'general': 'Allgemein'
    };
    return categories[category] || category;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'announcement': '📢',
      'workshops': '🎓',
      'participants': '👥',
      'prizes': '🏆',
      'general': '📰'
    };
    return icons[category] || '📰';
  };

  // Don't render anything if loading, error, or no breaking news
  if (loading || error || !breakingNews) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl animate-pulse">🚨</span>
              <span className="font-bold text-sm uppercase tracking-wide">
                Breaking News
              </span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-white/30"></div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {getCategoryIcon(breakingNews.category)}
              </span>
              <span className="text-sm font-medium">
                {getCategoryLabel(breakingNews.category)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="font-medium">{breakingNews.title}</span>
              <span className="ml-2 text-white/80">
                {formattedDate}
              </span>
              {breakingNews.breakingNewsUntil && (
                <BreakingNewsCountdown 
                  breakingNewsUntil={breakingNews.breakingNewsUntil} 
                  variant="default"
                />
              )}
            </div>
            <Link
              to={`/news/${breakingNews.id}`}
              className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors duration-200"
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
