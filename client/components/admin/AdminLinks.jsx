import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLinks, useDeleteLink } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { ErrorMessage, SuccessMessage } from '../StatusMessages.jsx';
import ConsolidatedAdminTable from './ConsolidatedAdminTable.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import logger from '../../services/logger.js';

const AdminLinks = () => {
  const navigate = useNavigate();
  const { data: linksData, isLoading, error } = useLinks({}, true);
  const deleteLinkMutation = useDeleteLink();
  const { showSuccessToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [success, setSuccess] = useState(null);

  const links = useMemo(() => Array.isArray(linksData) ? linksData : [], [linksData]);

  const categoryOptions = [
    'Medien', 'Musik', 'Kommunikation', 'Dokumente', 'Tools', 'Sonstiges'
  ];

  const colorOptions = [
    { value: 'blue', label: 'Blau', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { value: 'purple', label: 'Lila', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    { value: 'green', label: 'Grün', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { value: 'red', label: 'Rot', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    { value: 'yellow', label: 'Gelb', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' }
  ];

  // Filter and sort links
  const filteredLinks = useMemo(() => {
    let filtered = links;

    if (searchTerm) {
      filtered = filtered.filter(link =>
        link.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(link => link.category === categoryFilter);
    }

    // Sort by sort_order
    return filtered.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [links, searchTerm, categoryFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Möchten Sie diesen Link wirklich löschen?')) return;

    try {
      await deleteLinkMutation.mutateAsync(id);
      showSuccessToast('Link erfolgreich gelöscht!');
    } catch (error) {
      // Error toast is already shown by mutation's onError handler
      logger.error('Delete link error in component', { error: error.message });
    }
  };

  const getColorClass = (color) => {
    return colorOptions.find(c => c.value === color)?.class || colorOptions[0].class;
  };

  if (isLoading) {
    return <LoadingSpinner size="xl" text="Links werden geladen..." />;
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
            <h2 className="heading-primary mb-2">Links verwalten</h2>
            <p className="text-gray-600 dark:text-gray-400">Erstelle und verwalte wichtige Links</p>
          </div>
          <button
            onClick={() => navigate('/admin/links/new')}
            className="w-full sm:w-auto min-h-[44px] btn-primary touch-manipulation active:scale-95"
          >
            Link hinzufügen
          </button>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="Links suchen..."
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
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Links Table */}
        <ConsolidatedAdminTable
          columns={[
            {
              key: 'icon',
              label: 'Icon',
              render: (value) => (
                <span className="text-2xl">{value || '🔗'}</span>
              )
            },
            {
              key: 'title',
              label: 'Titel',
              render: (value, link) => (
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{value}</div>
                  {link.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{link.description}</div>
                  )}
                </div>
              )
            },
            {
              key: 'category',
              label: 'Kategorie',
              render: (value, link) => (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getColorClass(link.color)}`}>
                  {value}
                </span>
              )
            },
            {
              key: 'sort_order',
              label: 'Sortierung',
              render: (value) => (
                <span className="text-sm text-gray-600 dark:text-gray-400">{value || 0}</span>
              )
            },
            {
              key: 'is_external',
              label: 'Extern',
              render: (value) => (
                value ? (
                  <span className="text-sm text-green-600 dark:text-green-400">✓</span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )
              )
            },
            {
              key: 'is_active',
              label: 'Aktiv',
              render: (value) => (
                value ? (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Aktiv
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    Inaktiv
                  </span>
                )
              )
            }
          ]}
          data={filteredLinks}
          actions={(link) => (
            <>
              <button
                onClick={() => navigate(`/admin/links/${link.id}/edit`)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDelete(link.id)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500 rounded"
              >
                Löschen
              </button>
            </>
          )}
        />

        {filteredLinks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine Links gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || categoryFilter !== 'all'
                ? 'Versuche andere Suchkriterien oder füge einen neuen Link hinzu.'
                : 'Erstelle deinen ersten Link.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLinks;
