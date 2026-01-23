import React, { useState, useMemo, useEffect } from 'react';
import { geocodingService } from '../../services/geocodingService.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { getCategoryOptions } from '../../../shared/constants/cityTipsCategories.js';
import { getCategoryIcon, getCategoryColor } from '../../utils/categoryUtils.js';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import TextareaInput from '../forms/TextareaInput.jsx';
import CheckboxInput from '../forms/CheckboxInput.jsx';
import SearchFilters from '../forms/SearchFilters.jsx';
import { useFormManager } from '../../hooks/useFormManager.js';
import { createValidationSchema, getDefaultValues } from '../../../shared/schemas/validationFactory.js';
import { ErrorMessage, SuccessMessage } from '../shared/ErrorMessage.jsx';
import { getAvailableContentFilterOptions, validateFilterValue } from '../../utils/filterUtils.js';
import { useCityTips, useCreateCityTip, useUpdateCityTip, useDeleteCityTip } from '../../hooks/useCityTips.js';
import { handleLinkClick } from '../../utils/linkUtils.js';

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
        opening_hours: editingTip.opening_hours || ''
      });
    } else {
      // CRITICAL FIX: Reset form to default values when not editing
      resetForm();
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

  const predefinedCategories = useMemo(() => {
    return getCategoryOptions();
  }, []);

  const predefinedPriceRanges = [
    { value: 'Kostenlos', label: 'Kostenlos' },
    { value: '€', label: '€ (Günstig)' },
    { value: '€€', label: '€€ (Mittel)' },
    { value: '€€€', label: '€€€ (Teuer)' },
    { value: '€€€€', label: '€€€€ (Sehr teuer)' }
  ];

  // For admin interface, show all predefined categories (not filtered by existing content)
  const categories = useMemo(() => {
    return predefinedCategories;
  }, []);

  const priceRanges = useMemo(() => {
    return predefinedPriceRanges;
  }, []);

  const handleAddTipSubmit = async (formData) => {
    const tipData = {
      ...formData,
      // Let empty strings be undefined, not 0 - schema now handles coercion
      latitude: formData.latitude || undefined,
      longitude: formData.longitude || undefined,
      opening_hours: formData.opening_hours || null
    };
    
    const result = await createCityTip.mutateAsync(tipData);
    
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
      opening_hours: formData.opening_hours || null
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
      const result = await geocodingService.geocodeAddress(address);
      form.setValue('latitude', result.lat.toFixed(6));
      form.setValue('longitude', result.lng.toFixed(6));
      
      // Show success message
      setSuccessMessage(`Koordinaten erfolgreich ermittelt: ${result.displayName}`);
    } catch (error) {
      const processedError = geocodingService.handleError(error);
      alert(`Fehler beim Ermitteln der Koordinaten: ${processedError.message}`);
    }
  };

  const filteredTips = cityTips.filter(tip =>
    (tip.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tip.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tip.address || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          showDetails={import.meta.env.DEV}
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stadt-Tipps verwalten</h1>
          <p className="text-gray-600 dark:text-gray-400">Chemnitz Empfehlungen und Locations verwalten</p>
        </div>
        <button
          onClick={() => {
            setEditingTip(null);  // Clear editing state - useEffect will handle reset
            setShowAddForm(!showAddForm);
          }}
          className="w-full sm:w-auto min-h-[44px] px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 touch-manipulation active:scale-95"
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
        <div className="card-base overflow-hidden">
          {/* Form Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h2 className="heading-secondary">
                {editingTip ? 'Stadt-Tipp bearbeiten' : 'Neuen Stadt-Tipp hinzufügen'}
              </h2>
              <button
                onClick={() => {
                  setEditingTip(null);      // Clear editing state - useEffect will handle reset
                  setShowAddForm(false);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                options={categories.map(c => ({ value: c.value, label: `${getCategoryIcon(c.value, 'cityTip')} ${c.label}` }))}
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
                    className="min-h-[44px] px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1 touch-manipulation active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>📍 Automatisch ermitteln</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <summary className="text-lg font-semibold cursor-pointer text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 mb-4">
                Weitere Details (optional)
              </summary>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextInput 
                    control={form.control}
                    name="website" 
                    label="Website" 
                    type="url"
                    error={form.formState.errors.website?.message}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectInput 
                    control={form.control}
                    name="price_range" 
                    label="Preiskategorie"
                    options={priceRanges}
                    error={form.formState.errors.price_range?.message}
                  />
                </div>
                <TextareaInput 
                  control={form.control}
                  name="opening_hours" 
                  label="Öffnungszeiten"
                  error={form.formState.errors.opening_hours?.message}
                  rows={3}
                  placeholder="Mo-Fr: 09:00-18:00
Sa: 10:00-16:00
So: Geschlossen"
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
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <button
                  type="button"
                onClick={() => { setEditingTip(null); setShowAddForm(false); }} 
                className="w-full sm:w-auto min-h-[44px] btn-secondary touch-manipulation active:scale-95"
                >
                  Abbrechen
                </button>
                  <button
                    type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto min-h-[44px] btn-primary disabled:opacity-50 touch-manipulation active:scale-95"
                  >
                    {editingTip ? 'Änderungen speichern' : 'Stadt-Tipp hinzufügen'}
                  </button>
            </div>
          </form>
        </div>
      )}

      {/* City Tips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTips.map((tip) => (
          <div key={tip.id} className="card-elevated">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md ${getCategoryColor(tip.category)}`}>
                    {getCategoryIcon(tip.category, 'cityTip')}
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
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEditTip(tip)}
                    className="min-h-[44px] min-w-[44px] p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors touch-manipulation active:scale-95 rounded"
                    title="Bearbeiten"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteTip(tip.id)}
                    className="min-h-[44px] min-w-[44px] p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors touch-manipulation active:scale-95 rounded"
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
                {tip.website && (
                    <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <a 
                        href={tip.website} 
                        onClick={(e) => {
                          const websiteLink = {
                            url: tip.website,
                            title: 'Website',
                            is_external: true
                          };
                          handleLinkClick(websiteLink, e);
                        }}
                        className="hover:underline"
                      >
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