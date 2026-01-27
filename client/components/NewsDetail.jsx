import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useNewsItem, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import { getNewsCategoryLabel, getNewsCategoryIcon } from "../../shared/constants/categories.js";
import { getContentTypeIcon, getContentTypeGradient } from '../utils/detailViewUtils.js';
import { getCategoryByValue } from '../../shared/constants/categories.js';
import BackButton from './shared/BackButton.jsx';
import MarkdownRenderer from './shared/MarkdownRenderer.jsx';
import PDFDisplay from './shared/PDFDisplay.jsx';

const NewsDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: article, isLoading: loading, error } = useNewsItem(slug);
  
  // Set dynamic page title
  usePageTitle(article?.title || 'Laden...');

  const getCategoryLabel = (category) => {
    return getNewsCategoryLabel(category);
  };

  const getCategoryIconLocal = (category) => {
    return getNewsCategoryIcon(category);
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
            <p className="text-red-800 dark:text-red-200">{error?.message || error}</p>
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
          <div className="flex items-start space-x-4">
            <div className={`w-16 h-16 bg-${getContentTypeGradient('news')} rounded-full flex items-center justify-center text-white text-2xl font-bold`}>
              {getContentTypeIcon('news')}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {article.title}
              </h1>
              <div className="flex items-center space-x-3 mb-3">
                <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                  {getCategoryLabel(article.category)}
                </span>
              </div>
              <div className="flex items-center text-base text-gray-500 dark:text-gray-400 space-x-4">
                <span>Von SLAM25 Team</span>
                <span>•</span>
                <span>{formatDate(article.published_at || article.created_at)}</span>
                {article.published_at && article.published_at !== article.created_at && (
                  <>
                    <span>•</span>
                    <span>Erstellt: {formatDate(article.created_at)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {article.featured_image_url && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
            {article.featured_image_url.toLowerCase().includes('.pdf') ? (
              <PDFDisplay 
                pdfUrl={article.featured_image_url}
                title="PDF-Dokument"
                description="Zugehöriges PDF-Dokument zu diesem Artikel"
                variant="default"
              />
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bild</h2>
                <img
                  src={article.featured_image_url}
                  alt={article.title}
                  className="w-full max-w-2xl mx-auto rounded-lg shadow-md"
                />
              </div>
            )}
          </div>
        )}

        {/* Article Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <MarkdownRenderer content={article.content} />
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <BackButton onClick={() => navigate('/news')}>
            Zurück zu News & Updates
          </BackButton>
        </div>
      </div>
    </div>
  );
};

export default NewsDetail;