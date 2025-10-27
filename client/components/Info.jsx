import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { usePublishedInfoPages, useInfoPageBySlug, usePageTitle } from '../hooks/index.js';
import LoadingSpinner from './LoadingSpinner.jsx';
import { translateCategory } from '../utils/categoryTranslations.js';
import MarkdownRenderer from './shared/MarkdownRenderer.jsx';
import PDFDisplay from './shared/PDFDisplay.jsx';
import { getPDFUrl, hasPDF } from '../utils/pdfUtils.js';
import { handleLinkClick } from '../utils/linkUtils.js';

const Info = () => {
  usePageTitle('Info');
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: pagesData, isLoading: loading, error } = usePublishedInfoPages();
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
                <Link to="/info" className="hover:text-[#185757] dark:hover:text-[#A2D2B9]">
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
              <span className="bg-[#A2D2B9]/20 dark:bg-[#185757]/30 text-[#185757] dark:text-[#A2D2B9] px-2 py-1 rounded-full text-xs font-medium">
                {translateCategoryLocal(currentPage.category)}
              </span>
            </div>
          </div>

          {/* Universal File Display */}
          {currentPage.file_url && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              {currentPage.file_type === 'image' ? (
                <div>
                  <img 
                    src={currentPage.file_url} 
                    alt={currentPage.file_description || currentPage.title}
                    className="w-full rounded-lg mb-4"
                  />
                  {currentPage.file_description && (
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {currentPage.file_description}
                    </p>
                  )}
                </div>
              ) : (
                <PDFDisplay 
                  pdfUrl={currentPage.file_url}
                  title={currentPage.file_description || "PDF-Dokument"}
                  description={currentPage.file_description || "Zugehöriges PDF-Dokument zu dieser Seite"}
                  variant="default"
                />
              )}
            </div>
          )}

          {/* Page Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <MarkdownRenderer content={currentPage.content} />
            </div>
          </div>

          {/* Additional Links */}
          {currentPage.additional_links && currentPage.additional_links.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weiterführende Links</h3>
              <div className="space-y-2">
                {currentPage.additional_links.map((link, idx) => {
                  const additionalLink = {
                    url: link.url,
                    title: link.title || 'Link',
                    is_external: true
                  };
                  
                  return (
                    <a
                      key={idx}
                      href={link.url}
                      onClick={(e) => handleLinkClick(additionalLink, e)}
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                    <span className="text-blue-600 dark:text-blue-400 mr-2">🔗</span>
                    <span className="flex-1 text-gray-900 dark:text-white">{link.title}</span>
                    <span className="text-gray-400">→</span>
                  </a>
                  );
                })}
              </div>
            </div>
          )}

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
                  ? 'bg-[#185757] text-white'
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
                    ? 'bg-[#185757] text-white'
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
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Info-Seiten kommt bald :)
            </h3>
            <p className="text-gray-500 dark:text-gray-400">Bald gibt es hier wichtige Informationen zum SLAM25!</p>
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
                  <span className="bg-[#A2D2B9]/20 dark:bg-[#185757]/30 text-[#185757] dark:text-[#A2D2B9] px-2 py-1 rounded-full text-xs font-medium">
                    {translateCategoryLocal(page.category)}
                  </span>
                  {page.order > 0 && (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">#{page.order}</span>
                  )}
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2">
                  {page.title}
                </h3>
                
                {/* Universal File Display */}
                {page.file_url ? (
                  <div className="mb-4">
                    {page.file_type === 'image' ? (
                      <img 
                        src={page.file_url} 
                        alt={page.file_description || page.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div className="text-center">
                          <span className="text-4xl mb-2 block">📄</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">PDF-Datei</span>
                        </div>
                      </div>
                    )}
                    {page.file_description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {page.file_description}
                      </p>
                    )}
                  </div>
                ) : null}
                
                {page.excerpt && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    {page.excerpt}
                  </p>
                )}
                
                <div className="flex items-center justify-end text-sm text-gray-500 dark:text-gray-400">
                  <span className="text-[#185757] dark:text-[#A2D2B9] hover:text-[#0f3a3b] dark:hover:text-[#8BC4A3]">
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
