import React, { useState, useMemo, useEffect } from 'react';
import { useCityTips, useCreateCityTip, useUpdateCityTip, useDeleteCityTip } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { getCategoryIcon } from '../../utils/categoryTranslations.js';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import TextareaInput from '../forms/TextareaInput.jsx';
import CheckboxInput from '../forms/CheckboxInput.jsx';
import SearchFilters from '../forms/SearchFilters.jsx';
import { useFormManager } from '../../hooks/useFormManager.js';
import { createValidationSchema, getDefaultValues } from '../../../shared/schemas/validationFactory.js';
import { ErrorMessage, SuccessMessage } from '../shared/ErrorMessage.jsx';
import { getAvailableContentFilterOptions, validateFilterValue } from '../../utils/filterUtils.js';

// Use centralized validation schema
const cityTipSchema = createValidationSchema('cityTip');

export default function AdminCityTips() {
  const { data: cityTipsData, isLoading: loading, error } = useCityTips({}, true); // isAdmin = true
  const createCityTip = useCreateCityTip();
  const updateCityTip = useUpdateCityTip();
  const deleteCityTip = useDeleteCityTip();
  
  // Form management with centralized error handling
  const { 
    form, 
    error: componentError, 
    isSubmitting, 
    submitForm, 
    resetForm, 
    setFormValues,
    clearError 
  } = useFormManager(cityTipSchema, { 
    defaultValues: getDefaultValues('cityTip') 
  });
  
  const [successMessage, setSuccessMessage] = useState(null);
  const cityTips = useMemo(() => Array.isArray(cityTipsData) ? cityTipsData : [], [cityTipsData]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTip, setEditingTip] = useState(null);

  // Handle editing tip
  useEffect(() => {
    if (editingTip) {
      setFormValues({
        name: editingTip.name || '',
        slug: editingTip.slug || '',
        category: editingTip.category || 'culture',
        description: editingTip.description || '',
        address: editingTip.address || '',
        latitude: editingTip.latitude?.toString() || '',
        longitude: editingTip.longitude?.toString() || '',
        // REMOVED: phone field - database table doesn't have this column
        website: editingTip.website || '',
        price_range: editingTip.price_range || '€',
        tips: editingTip.tips || '',
        // REMOVED: is_featured field - removed from form
        status: editingTip.status || 'ACTIVE',
        opening_hours: typeof editingTip.opening_hours === 'string' ? editingTip.opening_hours : JSON.stringify(editingTip.opening_hours || {}, null, 2),
        contact_info_email: editingTip.contact_info?.email || ''
      });
    }
  }, [editingTip, setFormValues]);

  // Auto-generate slug from name
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'name' && value?.name && !editingTip) {
        const slug = value.name
          .toLowerCase()
          .replace(/[äöü]/g, char => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[char]))
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 200);
        form.setValue('slug', slug);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, form.setValue, editingTip]);

  const predefinedCategories = [
    { value: 'culture', label: 'Kultur', icon: '🎭', color: 'bg-purple-500' },
    { value: 'cafe', label: 'Café', icon: '☕', color: 'bg-yellow-500' },
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️', color: 'bg-red-500' },
    { value: 'bar', label: 'Bar', icon: '🍺', color: 'bg-blue-500' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️', color: 'bg-green-500' },
    { value: 'hotel', label: 'Hotel', icon: '🏨', color: 'bg-indigo-500' },
    { value: 'transport', label: 'Transport', icon: '🚌', color: 'bg-gray-500' },
    { value: 'entertainment', label: 'Unterhaltung', icon: '🎪', color: 'bg-pink-500' }
  ];

  const predefinedPriceRanges = [
    { value: '€', label: '€ (Günstig)' },
    { value: '€€', label: '€€ (Mittel)' },
    { value: '€€€', label: '€€€ (Teuer)' },
    { value: '€€€€', label: '€€€€ (Sehr teuer)' }
  ];

  // Dynamic categories and price ranges based on existing content
  const categories = useMemo(() => {
    return getAvailableContentFilterOptions(cityTips, predefinedCategories, 'category');
  }, [cityTips]);

  const priceRanges = useMemo(() => {
    return getAvailableContentFilterOptions(cityTips, predefinedPriceRanges, 'price_range');
  }, [cityTips]);

  const handleAddTipSubmit = async (formData) => {
    console.log('[AdminCityTips] handleAddTipSubmit called with data:', formData);
    
    const tipData = {
      ...formData,
      // Let empty strings be undefined, not 0 - schema now handles coercion
      latitude: formData.latitude || undefined,
      longitude: formData.longitude || undefined,
      opening_hours: formData.opening_hours ? JSON.parse(formData.opening_hours) : null,
      contact_info: formData.contact_info_email ? { email: formData.contact_info_email } : null
    };
    
    console.log('[AdminCityTips] Processed tipData:', tipData);
    
    const result = await createCityTip.mutateAsync(tipData);
    console.log('[AdminCityTips] Create mutation result:', result);
    
    resetForm();
    setShowAddForm(false);
    setSuccessMessage('Stadt-Tipp erfolgreich erstellt!');
  };

  const handleUpdateTip = async (formData) => {
    const tipData = {
      ...formData,
      // Let empty strings be undefined, not 0 - schema now handles coercion
      latitude: formData.latitude || undefined,
      longitude: formData.longitude || undefined,
      opening_hours: formData.opening_hours ? JSON.parse(formData.opening_hours) : null,
      contact_info: formData.contact_info_email ? { email: formData.contact_info_email } : null
    };

    await updateCityTip.mutateAsync({ id: editingTip.id, ...tipData });
    setEditingTip(null);
    setSuccessMessage('Stadt-Tipp erfolgreich aktualisiert!');
  };

  const handleDeleteTip = async (id) => {
    if (window.confirm('Möchten Sie diesen Stadt-Tipp wirklich löschen?')) {
        await deleteCityTip.mutateAsync(id);
      setSuccessMessage('Stadt-Tipp erfolgreich gelöscht!');
    }
  };

  const handleEditTip = (tip) => {
    setEditingTip({
      ...tip,
      latitude: tip.latitude?.toString() || '',
      longitude: tip.longitude?.toString() || ''
    });
  };

  const handleResetForm = () => {
    resetForm();
  };

  const handleGeocodeAddress = async () => {
    const address = form.getValues('address');
    if (!address || address.trim() === '') {
      alert('Bitte geben Sie zuerst eine Adresse ein.');
      return;
    }

    try {
      // Use a free geocoding service (OpenStreetMap Nominatim)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=de`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service nicht verfügbar');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        form.setValue('latitude', parseFloat(result.lat).toFixed(6));
        form.setValue('longitude', parseFloat(result.lon).toFixed(6));
        
        // Show success message
        setSuccessMessage(`Koordinaten erfolgreich ermittelt: ${result.display_name}`);
      } else {
        alert('Adresse nicht gefunden. Bitte überprüfen Sie die Eingabe oder geben Sie die Koordinaten manuell ein.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Fehler beim Ermitteln der Koordinaten. Bitte geben Sie die Koordinaten manuell ein.');
    }
  };

  const getCategoryIconLocal = (category) => {
    return getCategoryIcon(category, 'cityTips');
  };

  const getCategoryColor = (category) => {
    const categoryObj = categories.find(cat => cat.value === category);
    return categoryObj?.color || 'bg-gray-500';
  };

  const filteredTips = cityTips.filter(tip =>
    tip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tip.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tip.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner size="xl" text="Stadt-Tipps werden geladen..." />;
  if (error) return <div className="text-red-600">Fehler beim Laden der Stadt-Tipps: {error?.message || error}</div>;

  return (
    <div className="space-y-6">
      {/* Error and Success Messages */}
      {componentError && (
        <ErrorMessage 
          error={componentError} 
          onDismiss={clearError}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      )}
      
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          onDismiss={() => setSuccessMessage(null)}
          duration={3000}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stadt-Tipps verwalten</h1>
          <p className="text-gray-600 dark:text-gray-400">Chemnitz Empfehlungen und Locations verwalten</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            resetForm();
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{showAddForm ? 'Formular schließen' : 'Stadt-Tipp hinzufügen'}</span>
        </button>
      </div>

      {/* Search */}
      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        searchPlaceholder="Stadt-Tipps suchen..."
        className="mb-6"
      />

      {/* Add/Edit Form */}
      {(showAddForm || editingTip) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingTip ? 'Stadt-Tipp bearbeiten' : 'Neuen Stadt-Tipp hinzufügen'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingTip(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            submitForm(editingTip ? handleUpdateTip : handleAddTipSubmit);
          }} className="p-6 space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Grundinformationen</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput 
                  control={form.control}
                  name="name" 
                  label="Name *" 
                  error={form.formState.errors.name?.message}
                />
                <TextInput 
                  control={form.control}
                  name="slug" 
                  label="URL-Slug *" 
                  error={form.formState.errors.slug?.message}
                />
              </div>
              <SelectInput 
                control={form.control}
                name="category" 
                label="Kategorie *"
                options={categories.map(c => ({ value: c.value, label: `${c.icon} ${c.label}` }))}
                error={form.formState.errors.category?.message}
              />
                  <TextareaInput
                control={form.control}
                    name="description"
                label="Beschreibung *"
                error={form.formState.errors.description?.message}
                    rows={4}
                  />
                </div>

            {/* Location Section */}
            <div className="space-y-4 pt-6 border-t">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Standort (optional)</h4>
              <TextInput 
                control={form.control}
                name="address" 
                label="Adresse"
                placeholder="z.B. Marktplatz 1, 09111 Chemnitz"
                error={form.formState.errors.address?.message}
              />
              
              {/* Coordinate Lookup Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Koordinaten
                  </label>
                  <button 
                    type="button"
                    onClick={handleGeocodeAddress}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>📍 Automatisch ermitteln</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <TextInput 
                      control={form.control}
                      name="latitude" 
                      label="Breitengrad" 
                      type="number"
                      step="0.000001"
                      placeholder="z.B. 50.8278"
                      error={form.formState.errors.latitude?.message}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Chemnitz: 50.8278° N
                    </p>
                  </div>
                  <div>
                    <TextInput 
                      control={form.control}
                      name="longitude" 
                      label="Längengrad" 
                      type="number"
                      step="0.000001"
                      placeholder="z.B. 12.9214"
                      error={form.formState.errors.longitude?.message}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Chemnitz: 12.9214° E
                    </p>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  💡 <strong>Tipp:</strong> Geben Sie eine Adresse ein und klicken Sie "Automatisch ermitteln" für präzise Koordinaten.
                  Oder geben Sie die Koordinaten manuell ein (z.B. von Google Maps).
                </div>
              </div>
            </div>

            {/* Optional Details - Collapsible */}
            <details className="pt-6 border-t">
              <summary className="text-lg font-semibold cursor-pointer hover:text-blue-600 mb-4">
                Weitere Details (optional)
              </summary>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput 
                    control={form.control}
                    name="website" 
                    label="Website" 
                    type="url"
                    error={form.formState.errors.website?.message}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectInput 
                    control={form.control}
                    name="price_range" 
                    label="Preiskategorie"
                    options={priceRanges}
                    error={form.formState.errors.price_range?.message}
                  />
                  <TextInput 
                    control={form.control}
                    name="contact_info_email" 
                    label="E-Mail" 
                      type="email"
                    error={form.formState.errors.contact_info_email?.message}
                  />
                </div>
                <TextareaInput 
                  control={form.control}
                  name="opening_hours" 
                  label="Öffnungszeiten (JSON)"
                  error={form.formState.errors.opening_hours?.message}
                  rows={3}
                  placeholder='{"monday": "09:00-18:00", "tuesday": "09:00-18:00"}'
                />
                <TextareaInput 
                  control={form.control}
                  name="tips" 
                  label="Tipps & Hinweise"
                  error={form.formState.errors.tips?.message}
                  rows={4}
                />
              </div>
            </details>

            {/* Actions */}
            <div className="flex gap-2 pt-6 border-t">
                <button
                  type="button"
                onClick={() => { setShowAddForm(false); setEditingTip(null); resetForm(); }} 
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                  <button
                    type="submit"
                disabled={form.formState.isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editingTip ? 'Änderungen speichern' : 'Stadt-Tipp hinzufügen'}
                  </button>
            </div>
          </form>
        </div>
      )}

      {/* City Tips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTips.map((tip) => (
          <div key={tip.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md ${getCategoryColor(tip.category)}`}>
                    {getCategoryIconLocal(tip.category)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{tip.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(tip.category)} text-white`}>
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
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditTip(tip)}
                    className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    title="Bearbeiten"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteTip(tip.id)}
                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Löschen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{tip.description}</p>
              
              {tip.address && (
                <div className="flex items-start space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{tip.address}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                {tip.phone && (
                    <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{tip.phone}</span>
                  </div>
                )}
                {tip.website && (
                    <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <a href={tip.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      Website
                    </a>
                  </div>
                )}
                </div>
                {tip.price_range && (
                  <span className="text-gray-500 dark:text-gray-400 font-medium">{tip.price_range}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}