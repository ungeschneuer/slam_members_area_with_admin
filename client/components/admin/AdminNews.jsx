import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNews, useDeleteNews } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../StatusMessages.jsx';
import ConsolidatedAdminTable from './ConsolidatedAdminTable.jsx';
import { formatDate } from '../../utils/detailViewUtils.js';
import { getNewsCategoryLabel } from '../../utils/newsCategories.js';

export default function AdminNews() {
  const navigate = useNavigate();
  const { data: newsData, isLoading, error } = useNews({}, true);
  const deleteNewsMutation = useDeleteNews();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [success, setSuccess] = useState(null);

  const news = Array.isArray(newsData) ? newsData : [];

  // Filter and sort news
  const filteredNews = useMemo(() => {
    let filtered = news;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Sort by published date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.published_at || a.created_at);
      const dateB = new Date(b.published_at || b.created_at);
      return dateB - dateA;
    });
  }, [news, searchTerm, categoryFilter, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Bist du sicher, dass du diese Nachricht löschen möchtest?')) return;

    try {
      await deleteNewsMutation.mutateAsync(id);
      setSuccess('Nachricht erfolgreich gelöscht!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting news:', error);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'PUBLISHED') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Veröffentlicht</span>;
    }
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Entwurf</span>;
  };

  if (isLoading) {
    return <LoadingSpinner size="xl" text="News werden geladen..." />;
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
      {success && (
        <SuccessMessage
          message={success}
          onDismiss={() => setSuccess(null)}
          className="max-w-4xl mx-auto"
        />
      )}

      {/* Header */}
      <div className="card-base p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div>
            <h2 className="heading-primary mb-2">News verwalten</h2>
            <p className="text-gray-600 dark:text-gray-400">Erstelle und verwalte News-Beiträge</p>
          </div>
          <button
            onClick={() => navigate('/admin/news/new')}
            className="w-full sm:w-auto min-h-[44px] btn-primary touch-manipulation active:scale-95"
          >
            Nachricht hinzufügen
          </button>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="News suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#185757] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#185757] focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Alle Kategorien</option>
            <option value="announcement">Ankündigungen</option>
            <option value="workshops">Workshops</option>
            <option value="prizes">Preise</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#185757] focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Alle Status</option>
            <option value="PUBLISHED">Veröffentlicht</option>
            <option value="DRAFT">Entwurf</option>
          </select>
        </div>

        {/* News Table */}
        <ConsolidatedAdminTable
          columns={[
            {
              key: 'title',
              label: 'Titel',
              render: (value, item) => (
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{value}</div>
                  {item.is_breaking_news && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 mt-1">
                      Breaking News
                    </span>
                  )}
                </div>
              )
            },
            {
              key: 'category',
              label: 'Kategorie',
              render: (value) => (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {getNewsCategoryLabel(value)}
                </span>
              )
            },
            {
              key: 'status',
              label: 'Status',
              render: (value) => getStatusBadge(value)
            },
            {
              key: 'date',
              label: 'Datum',
              render: (value) => (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(value)}
                </span>
              )
            },
            {
              key: 'featured_image_url',
              label: 'Bild/PDF',
              render: (value) => (
                value ? (
                  <span className="text-sm text-green-600 dark:text-green-400">✓</span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )
              )
            }
          ]}
          data={filteredNews}
          actions={(item) => (
            <>
              <button
                onClick={() => navigate(`/admin/news/${item.id}/edit`)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500 rounded"
              >
                Löschen
              </button>
            </>
          )}
        />

        {filteredNews.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📰</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine News gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Versuche andere Suchkriterien oder füge eine neue Nachricht hinzu.'
                : 'Erstelle deine erste Nachricht.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
