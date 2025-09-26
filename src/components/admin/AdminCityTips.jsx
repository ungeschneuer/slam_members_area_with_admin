import React, { useState, useEffect } from 'react';
import hybridDataService from '../../services/hybridDataService.js';
import LoadingSpinner from '../LoadingSpinner.jsx';

export default function AdminCityTips() {
  const [cityTips, setCityTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTip, setEditingTip] = useState(null);
  const [newTip, setNewTip] = useState({
    name: '',
    category: 'culture',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    phone: '',
    website: '',
    price_range: '€',
    rating: '',
    tips: '',
    is_featured: false
  });

  const categories = [
    { value: 'culture', label: 'Kultur' },
    { value: 'cafe', label: 'Café' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'bar', label: 'Bar' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'transport', label: 'Transport' }
  ];

  const priceRanges = [
    { value: '€', label: 'Günstig' },
    { value: '€€', label: 'Mittel' },
    { value: '€€€', label: 'Teuer' }
  ];

  useEffect(() => {
    loadCityTips();

    // Subscribe to data changes
    const unsubscribe = hybridDataService.subscribe((dataType) => {
      if (dataType === 'cityTips') {
        console.log('AdminCityTips: Data changed, refreshing...');
        loadCityTips();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadCityTips = async () => {
    try {
      setLoading(true);
      const data = await hybridDataService.getData('city-tips');
      setCityTips(data || []);
    } catch (error) {
      console.error('Error loading city tips:', error);
      setError('Fehler beim Laden der Stadt-Tipps');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTip = async (e) => {
    e.preventDefault();
    try {
      const tipData = {
        ...newTip,
        latitude: parseFloat(newTip.latitude) || 0,
        longitude: parseFloat(newTip.longitude) || 0,
        rating: parseFloat(newTip.rating) || 0
      };
      
      await hybridDataService.setData('city-tips', tipData);
      setNewTip({
        name: '',
        category: 'culture',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        phone: '',
        website: '',
        price_range: '€',
        rating: '',
        tips: '',
        is_featured: false
      });
      setShowAddForm(false);
      // loadCityTips(); // Removed manual reload
    } catch (error) {
      console.error('Error creating city tip:', error);
      alert('Fehler beim Erstellen des Stadt-Tipps');
    }
  };

  const handleUpdateTip = async (e) => {
    e.preventDefault();
    try {
      const tipData = {
        ...editingTip,
        latitude: parseFloat(editingTip.latitude) || 0,
        longitude: parseFloat(editingTip.longitude) || 0,
        rating: parseFloat(editingTip.rating) || 0
      };
      
      await hybridDataService.setData('city-tips', tipData, editingTip.id);
      setEditingTip(null);
      // loadCityTips(); // Removed manual reload
    } catch (error) {
      console.error('Error updating city tip:', error);
      alert('Fehler beim Aktualisieren des Stadt-Tipps');
    }
  };

  const handleDeleteTip = async (id) => {
    if (window.confirm('Möchten Sie diesen Stadt-Tipp wirklich löschen?')) {
      try {
        await hybridDataService.deleteData('city-tips', id);
        // loadCityTips(); // Removed manual reload
      } catch (error) {
        console.error('Error deleting city tip:', error);
        alert('Fehler beim Löschen des Stadt-Tipps');
      }
    }
  };

  const handleEditTip = (tip) => {
    setEditingTip({
      ...tip,
      latitude: tip.latitude?.toString() || '',
      longitude: tip.longitude?.toString() || '',
      rating: tip.rating?.toString() || ''
    });
  };

  const filteredTips = cityTips.filter(tip =>
    tip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tip.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tip.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner size="xl" text="Stadt-Tipps werden geladen..." />;
  if (error) return <div className="text-red-600">Fehler beim Laden der Stadt-Tipps: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stadt-Tipps verwalten</h1>
          <p className="text-gray-600 dark:text-gray-400">Chemnitz Empfehlungen und Locations verwalten</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Formular schließen' : '+ Stadt-Tipp hinzufügen'}
        </button>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Stadt-Tipps suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingTip) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingTip ? 'Stadt-Tipp bearbeiten' : 'Neuen Stadt-Tipp hinzufügen'}
          </h2>
          
          <form onSubmit={editingTip ? handleUpdateTip : handleAddTip} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingTip ? editingTip.name : newTip.name}
                  onChange={(e) => editingTip 
                    ? setEditingTip({ ...editingTip, name: e.target.value })
                    : setNewTip({ ...newTip, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategorie *
                </label>
                <select
                  required
                  value={editingTip ? editingTip.category : newTip.category}
                  onChange={(e) => editingTip 
                    ? setEditingTip({ ...editingTip, category: e.target.value })
                    : setNewTip({ ...newTip, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Beschreibung
              </label>
              <textarea
                value={editingTip ? editingTip.description : newTip.description}
                onChange={(e) => editingTip 
                  ? setEditingTip({ ...editingTip, description: e.target.value })
                  : setNewTip({ ...newTip, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Beschreibung der Location..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse *
                </label>
                <input
                  type="text"
                  required
                  value={editingTip ? editingTip.address : newTip.address}
                  onChange={(e) => editingTip 
                    ? setEditingTip({ ...editingTip, address: e.target.value })
                    : setNewTip({ ...newTip, address: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefon
                </label>
                <input
                  type="text"
                  value={editingTip ? editingTip.phone : newTip.phone}
                  onChange={(e) => editingTip 
                    ? setEditingTip({ ...editingTip, phone: e.target.value })
                    : setNewTip({ ...newTip, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Breitengrad *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingTip ? editingTip.latitude : newTip.latitude}
                  onChange={(e) => editingTip 
                    ? setEditingTip({ ...editingTip, latitude: e.target.value })
                    : setNewTip({ ...newTip, latitude: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Längengrad *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingTip ? editingTip.longitude : newTip.longitude}
                  onChange={(e) => editingTip 
                    ? setEditingTip({ ...editingTip, longitude: e.target.value })
                    : setNewTip({ ...newTip, longitude: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={editingTip ? editingTip.website : newTip.website}
                  onChange={(e) => editingTip 
                    ? setEditingTip({ ...editingTip, website: e.target.value })
                    : setNewTip({ ...newTip, website: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preiskategorie
                </label>
                <select
                  value={editingTip ? editingTip.price_range : newTip.price_range}
                  onChange={(e) => editingTip 
                    ? setEditingTip({ ...editingTip, price_range: e.target.value })
                    : setNewTip({ ...newTip, price_range: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {priceRanges.map(price => (
                    <option key={price.value} value={price.value}>{price.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bewertung (0-5)
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={editingTip ? editingTip.rating : newTip.rating}
                  onChange={(e) => editingTip 
                    ? setEditingTip({ ...editingTip, rating: e.target.value })
                    : setNewTip({ ...newTip, rating: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={editingTip ? editingTip.is_featured : newTip.is_featured}
                  onChange={(e) => editingTip 
                    ? setEditingTip({ ...editingTip, is_featured: e.target.checked })
                    : setNewTip({ ...newTip, is_featured: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_featured" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Empfohlen
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipps & Empfehlungen
              </label>
              <textarea
                value={editingTip ? editingTip.tips : newTip.tips}
                onChange={(e) => editingTip 
                  ? setEditingTip({ ...editingTip, tips: e.target.value })
                  : setNewTip({ ...newTip, tips: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Besondere Tipps und Empfehlungen für Besucher..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingTip(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingTip ? 'Änderungen speichern' : 'Stadt-Tipp hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">
          Zeige {filteredTips.length} von {cityTips.length} Stadt-Tipps
        </p>
      </div>

      {/* City Tips List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTips.map((tip) => (
          <div key={tip.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{tip.name}</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tip.category === 'culture' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                    tip.category === 'cafe' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    tip.category === 'restaurant' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    tip.category === 'bar' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    tip.category === 'shopping' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    tip.category === 'hotel' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {categories.find(c => c.value === tip.category)?.label || tip.category}
                  </span>
                  {tip.is_featured && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      ⭐ Empfohlen
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{tip.description}</p>
            
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <div className="flex items-center">
                <span className="w-4">📍</span>
                <span className="ml-2">{tip.address}</span>
              </div>
              {tip.phone && (
                <div className="flex items-center">
                  <span className="w-4">📞</span>
                  <span className="ml-2">{tip.phone}</span>
                </div>
              )}
              {tip.website && (
                <div className="flex items-center">
                  <span className="w-4">🌐</span>
                  <a href={tip.website} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 dark:text-blue-400 hover:underline">
                    Website
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-500">★</span>
                  <span>{tip.rating || 'N/A'}</span>
                </div>
                <span className="text-gray-400">{tip.price_range}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => handleEditTip(tip)}
                className="px-3 py-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDeleteTip(tip.id)}
                className="px-3 py-1 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTips.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🗺️</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Stadt-Tipps gefunden</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff.' : 'Fügen Sie den ersten Stadt-Tipp hinzu.'}
          </p>
        </div>
      )}
    </div>
  );
}
