import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useInfoPages, useInfoPageBySlug, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import { translateCategory } from '../utils/categoryTranslations.js';
import MarkdownRenderer from './shared/MarkdownRenderer.jsx';

const Info = () => {
  usePageTitle('Info');
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: pagesData, isLoading: loading, error } = useInfoPages();
  const { data: currentPage, isLoading: pageLoading, error: pageError } = useInfoPageBySlug(slug);
  const [pages, setPages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Use centralized category translation
  const translateCategoryLocal = (category) => translateCategory(category, 'info');

  // Update local state when useLiveData changes
  useEffect(() => {
    if (pagesData) {
      setPages(Array.isArray(pagesData) ? pagesData : []);
    }
  }, [pagesData]);


  const filteredPages = selectedCategory === 'all' 
    ? pages 
    : pages.filter(page => page.category === selectedCategory);

  const categories = [...new Set(pages.map(page => page.category))];

  if (loading || pageLoading) {
    return <LoadingSpinner />;
  }

  if (error || pageError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error || pageError}</p>
            <button 
              onClick={() => navigate('/info')}
              className="mt-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
            >
              Zurück zur Übersicht
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show individual page
  if (currentPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <Link to="/info" className="hover:text-blue-600 dark:hover:text-blue-400">
                  Info
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900 dark:text-white">{currentPage.title}</li>
            </ol>
          </nav>

          {/* Page Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {currentPage.title}
            </h1>
            {currentPage.excerpt && (
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                {currentPage.excerpt}
              </p>
            )}
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                {translateCategoryLocal(currentPage.category)}
              </span>
            </div>
          </div>

          {/* Page Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <MarkdownRenderer content={currentPage.content} />
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-6">
            <button
              onClick={() => navigate('/info')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              ← Zurück zur Übersicht
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show overview
  return (
    <div data-testid="info-pages" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Info-Bereich</h1>
          <p className="text-gray-600 dark:text-gray-400">Hier findest du alle wichtigen Informationen, Regeln und Richtlinien für SLAM25.</p>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Alle
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {translateCategoryLocal(category)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pages Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        {filteredPages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Keine Info-Seiten gefunden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPages.map(page => (
              <Link
                key={page.id}
                to={`/info/${page.slug}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                    {translateCategoryLocal(page.category)}
                  </span>
                  {page.order > 0 && (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">#{page.order}</span>
                  )}
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2">
                  {page.title}
                </h3>
                
                {/* Featured Image */}
                {page.featured_image_url && (
                  <div className="mb-4">
                    {page.featured_image_url.toLowerCase().includes('.pdf') ? (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">PDF-Dokument</p>
                          <a 
                            href={page.featured_image_url} 
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
                        src={page.featured_image_url} 
                        alt={page.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    )}
                  </div>
                )}
                
                {page.excerpt && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    {page.excerpt}
                  </p>
                )}
                
                <div className="flex items-center justify-end text-sm text-gray-500 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    Lesen →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


export default Info;
