import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useNewsItem } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner.jsx';

const NewsDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: article, isLoading: loading, error } = useNewsItem(slug);

  const getCategoryLabel = (category) => {
    // Debug: log the category type to see what we're getting
    if (import.meta.env.DEV) {
      console.log('NewsDetail - Category type received:', category);
    }
    
    const categories = {
      'announcement': 'Ankündigungen',
      'workshops': 'Workshops',
      'participants': 'Teilnehmer*innen',
      'prizes': 'Preise',
      'general': 'Allgemein',
      'news': 'Nachrichten',
      'update': 'Updates',
      'info': 'Informationen'
    };
    return categories[category] || category;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'announcement': '📢',
      'workshops': '🎓',
      'participants': '👥',
      'prizes': '🏆',
      'general': '📰',
      'news': '📰',
      'update': '🔄',
      'info': 'ℹ️'
    };
    return icons[category] || '📰';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Europe/Berlin'
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button 
              onClick={() => navigate('/news')}
              className="mt-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
            >
              Zurück zu News & Updates
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Artikel nicht gefunden
            </h1>
            <button 
              onClick={() => navigate('/news')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
            >
              Zurück zu News & Updates
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <Link to="/news" className="hover:text-blue-600 dark:hover:text-blue-400">
                News & Updates
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 dark:text-white">{article.title}</li>
          </ol>
        </nav>

        {/* Article Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <div className="flex items-start space-x-6 mb-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-2xl">
                  {getCategoryIcon(article.category)}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-4">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                  {article.title}
                </h1>
                <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                  {getCategoryLabel(article.category)}
                </span>
              </div>
              <div className="flex items-center text-base text-gray-500 dark:text-gray-400 space-x-4">
                <span>Von SLAM25 Team</span>
                <span>•</span>
                <span>{formatDate(article.created_at)}</span>
                {article.publishedAt && (
                  <>
                    <span>•</span>
                    <span>Veröffentlicht: {formatDate(article.publishedAt)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-base">
              {article.content}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/news')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            ← Zurück zu News & Updates
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsDetail;