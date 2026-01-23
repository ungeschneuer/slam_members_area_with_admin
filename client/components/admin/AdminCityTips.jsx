import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCityTips, useDeleteCityTip } from '../../hooks/useCityTips.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { ErrorMessage, SuccessMessage } from '../StatusMessages.jsx';
import ConsolidatedAdminTable from './ConsolidatedAdminTable.jsx';
import { getCategoryOptions } from '../../../shared/constants/categories.js';
import { getCategoryIcon, getCategoryColor } from '../../utils/categoryUtils.js';

export default function AdminCityTips() {
  const navigate = useNavigate();
  const { data: cityTipsData, isLoading, error } = useCityTips({}, true);
  const deleteCityTipMutation = useDeleteCityTip();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [success, setSuccess] = useState(null);

  const cityTips = useMemo(() => Array.isArray(cityTipsData) ? cityTipsData : [], [cityTipsData]);
  const categories = getCategoryOptions();

  // Filter tips
  const filteredTips = useMemo(() => {
    let filtered = cityTips;

    if (searchTerm) {
      filtered = filtered.filter(tip =>
        tip.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tip.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tip.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(tip => tip.category === categoryFilter);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [cityTips, searchTerm, categoryFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Möchten Sie diesen Stadt-Tipp wirklich löschen?')) return;

    try {
      await deleteCityTipMutation.mutateAsync(id);
      setSuccess('Stadt-Tipp erfolgreich gelöscht!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting city tip:', error);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'ACTIVE') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Aktiv</span>;
    }
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Inaktiv</span>;
  };

  if (isLoading) {
    return <LoadingSpinner size="xl" text="Stadt-Tipps werden geladen..." />;
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
            <h2 className="heading-primary mb-2">Stadt-Tipps verwalten</h2>
            <p className="text-gray-600 dark:text-gray-400">Erstelle und verwalte Stadt-Tipps</p>
          </div>
          <button
            onClick={() => navigate('/admin/city-tips/new')}
            className="w-full sm:w-auto min-h-[44px] btn-primary touch-manipulation active:scale-95"
          >
            Stadt-Tipp hinzufügen
          </button>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="Stadt-Tipps suchen..."
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
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* City Tips Table */}
        <ConsolidatedAdminTable
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (value) => (
                <div className="text-sm font-medium text-gray-900 dark:text-white">{value}</div>
              )
            },
            {
              key: 'category',
              label: 'Kategorie',
              render: (value) => {
                const icon = getCategoryIcon(value);
                const categoryLabel = categories.find(c => c.value === value)?.label || value;
                return (
                  <div className="flex items-center space-x-2">
                    <span>{icon}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{categoryLabel}</span>
                  </div>
                );
              }
            },
            {
              key: 'address',
              label: 'Adresse',
              render: (value) => (
                <span className="text-sm text-gray-600 dark:text-gray-400">{value || '-'}</span>
              )
            },
            {
              key: 'price_range',
              label: 'Preis',
              render: (value) => (
                <span className="text-sm text-gray-600 dark:text-gray-400">{value || '-'}</span>
              )
            },
            {
              key: 'status',
              label: 'Status',
              render: (value) => getStatusBadge(value)
            }
          ]}
          data={filteredTips}
          actions={(tip) => (
            <>
              <button
                onClick={() => navigate(`/admin/city-tips/${tip.id}/edit`)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDelete(tip.id)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500 rounded"
              >
                Löschen
              </button>
            </>
          )}
        />

        {filteredTips.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine Stadt-Tipps gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || categoryFilter !== 'all'
                ? 'Versuche andere Suchkriterien oder füge einen neuen Stadt-Tipp hinzu.'
                : 'Erstelle deinen ersten Stadt-Tipp.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
