import React, { useState, useMemo, useEffect } from 'react';
import { useCityTips, useCreateCityTip, useUpdateCityTip, useDeleteCityTip } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { generateSlug } from '../../utils/slugUtils.js';
import { useForm } from 'react-hook-form';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import TextareaInput from '../forms/TextareaInput.jsx';
import CheckboxInput from '../forms/CheckboxInput.jsx';
import SearchFilters from '../forms/SearchFilters.jsx';

export default function AdminCityTips() {
  const { data: cityTipsData, isLoading: loading, error } = useCityTips();
  const createCityTip = useCreateCityTip();
  const updateCityTip = useUpdateCityTip();
  const deleteCityTip = useDeleteCityTip();
  
  const cityTips = useMemo(() => Array.isArray(cityTipsData) ? cityTipsData : [], [cityTipsData]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTip, setEditingTip] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const addForm = useForm({
    defaultValues: {
      name: '',
      slug: '',
      category: 'culture',
      description: '',
      address: '',
      latitude: '',
      longitude: '',
      phone: '',
      website: '',
      price_range: '€',
      tips: '',
      is_featured: false,
      status: 'ACTIVE',
      opening_hours: '',
      contact_info_email: ''
    }
  });
  const editForm = useForm({
    defaultValues: {
      name: '',
      slug: '',
      category: 'culture',
      description: '',
      address: '',
      latitude: '',
      longitude: '',
      phone: '',
      website: '',
      price_range: '€',
      tips: '',
      is_featured: false,
      status: 'ACTIVE',
      opening_hours: '',
      contact_info_email: ''
    }
  });

  useEffect(() => {
    if (editingTip) {
      editForm.reset({
        name: editingTip.name || '',
        slug: editingTip.slug || '',
        category: editingTip.category || 'culture',
        description: editingTip.description || '',
        address: editingTip.address || '',
        latitude: editingTip.latitude?.toString() || '',
        longitude: editingTip.longitude?.toString() || '',
        phone: editingTip.phone || '',
        website: editingTip.website || '',
        price_range: editingTip.price_range || '€',
        tips: editingTip.tips || '',
        is_featured: !!editingTip.is_featured,
        status: editingTip.status || 'ACTIVE',
        opening_hours: typeof editingTip.opening_hours === 'string' ? editingTip.opening_hours : JSON.stringify(editingTip.opening_hours || {}, null, 2),
        contact_info_email: editingTip.contact_info?.email || ''
      });
    }
  }, [editingTip]);

  const categories = [
    { value: 'culture', label: 'Kultur', icon: '🎭', color: 'bg-purple-500' },
    { value: 'cafe', label: 'Café', icon: '☕', color: 'bg-yellow-500' },
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️', color: 'bg-red-500' },
    { value: 'bar', label: 'Bar', icon: '🍺', color: 'bg-blue-500' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️', color: 'bg-green-500' },
    { value: 'hotel', label: 'Hotel', icon: '🏨', color: 'bg-indigo-500' },
    { value: 'transport', label: 'Transport', icon: '🚇', color: 'bg-orange-500' },
    { value: 'landmark', label: 'Sehenswürdigkeit', icon: '🏛️', color: 'bg-red-600' },
    { value: 'nature', label: 'Natur', icon: '🌳', color: 'bg-green-600' },
    { value: 'leisure', label: 'Freizeit', icon: '🏊', color: 'bg-cyan-500' },
    { value: 'sports', label: 'Sport', icon: '⚽', color: 'bg-orange-600' }
  ];

  const priceRanges = [
    { value: '€', label: 'Günstig', icon: '€' },
    { value: '€€', label: 'Mittel', icon: '€€' },
    { value: '€€€', label: 'Teuer', icon: '€€€' },
    { value: '€€€€', label: 'Luxus', icon: '€€€€' }
  ];

  const formSteps = [
    { id: 1, title: 'Grundinformationen', description: 'Name, Kategorie und Beschreibung' },
    { id: 2, title: 'Standort', description: 'Adresse und Koordinaten' },
    { id: 3, title: 'Details', description: 'Kontakt und Preise' },
    { id: 4, title: 'Zusätzlich', description: 'Öffnungszeiten und Tipps' }
  ];

  // Live data handled by useLiveData

  const handleAddTipSubmit = async (data) => {
    try {
      const slug = data.slug || generateSlug(data.name);
      const tipData = {
        ...data,
        slug,
        latitude: parseFloat(data.latitude) || 0,
        longitude: parseFloat(data.longitude) || 0,
        opening_hours: data.opening_hours ? JSON.parse(data.opening_hours) : null,
        contact_info: data.contact_info_email ? { email: data.contact_info_email } : null
      };
      await createCityTip.mutateAsync(tipData);
      addForm.reset();
      setCurrentStep(1);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating city tip:', error);
      alert('Fehler beim Erstellen des Stadt-Tipps');
    }
  };

  const handleUpdateTip = async (e) => {
    e.preventDefault();
    try {
      const data = editForm.getValues();
      const tipData = {
        ...editingTip,
        name: data.name,
        slug: data.slug || generateSlug(data.name),
        category: data.category,
        description: data.description,
        address: data.address,
        latitude: parseFloat(data.latitude) || 0,
        longitude: parseFloat(data.longitude) || 0,
        phone: data.phone,
        website: data.website,
        price_range: data.price_range,
        tips: data.tips,
        is_featured: !!data.is_featured,
        status: data.status || 'ACTIVE',
        opening_hours: data.opening_hours ? JSON.parse(data.opening_hours) : null,
        contact_info: data.contact_info_email ? { email: data.contact_info_email } : null
      };

      await updateCityTip.mutateAsync({ id: editingTip.id, ...tipData });
      setEditingTip(null);
    } catch (error) {
      console.error('Error updating city tip:', error);
      alert('Fehler beim Aktualisieren des Stadt-Tipps');
    }
  };

  const handleDeleteTip = async (id) => {
    if (window.confirm('Möchten Sie diesen Stadt-Tipp wirklich löschen?')) {
      try {
        await deleteCityTip.mutateAsync(id);
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
      longitude: tip.longitude?.toString() || ''
    });
    setCurrentStep(1);
  };

  const resetForm = () => {
    setNewTip({
      name: '',
      slug: '',
      category: 'culture',
      description: '',
      address: '',
      latitude: '',
      longitude: '',
      phone: '',
      website: '',
      price_range: '€',
      tips: '',
      is_featured: false,
      status: 'ACTIVE',
      opening_hours: '',
      contact_info: { phone: '', email: '' },
      images: []
    });
    setCurrentStep(1);
  };

  const getCategoryIcon = (category) => {
    const categoryObj = categories.find(cat => cat.value === category);
    return categoryObj?.icon || '📍';
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
          onClick={() => {
            setShowAddForm(!showAddForm);
            resetForm();
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{showAddForm ? 'Formular schließen' : '+ Stadt-Tipp hinzufügen'}</span>
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
          {/* Form Header with Steps */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
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
            
            {/* Step Indicator */}
            <div className="flex items-center space-x-4">
              {formSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    currentStep >= step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }`}>
                    {step.id}
                  </div>
                  <div className="ml-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{step.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{step.description}</div>
                  </div>
                  {index < formSteps.length - 1 && (
                    <div className="w-8 h-px bg-gray-300 dark:bg-gray-600 mx-4"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <form onSubmit={editingTip ? editForm.handleSubmit(handleUpdateTip) : addForm.handleSubmit(handleAddTipSubmit)} className="p-6">
            {/* RHF hidden fields for edit flow to sync values */}
            {editingTip && (
              <div className="hidden">
                <input type="text" {...editForm.register('name')} />
                <input type="text" {...editForm.register('slug')} />
                <input type="text" {...editForm.register('category')} />
                <input type="text" {...editForm.register('description')} />
                <input type="text" {...editForm.register('address')} />
                <input type="text" {...editForm.register('latitude')} />
                <input type="text" {...editForm.register('longitude')} />
                <input type="text" {...editForm.register('phone')} />
                <input type="text" {...editForm.register('website')} />
                <input type="text" {...editForm.register('price_range')} />
                <input type="checkbox" {...editForm.register('is_featured')} />
                <textarea {...editForm.register('opening_hours')} />
                <input type="text" {...editForm.register('contact_info_email')} />
                <textarea {...editForm.register('tips')} />
              </div>
            )}
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name *
                    </label>
                    {editingTip ? (
                      <input
                        type="text"
                        required
                        {...editForm.register('name', { required: true })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Name des Ortes"
                      />
                    ) : (
                      <input
                        type="text"
                        required
                        {...addForm.register('name', { required: true, onChange: (e) => {
                          const slug = generateSlug(e.target.value, { maxLength: 35, removeStopwords: true });
                          addForm.setValue('slug', slug, { shouldDirty: true });
                        } })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Name des Ortes"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kategorie *
                    </label>
                    {editingTip ? (
                      <select
                        required
                        {...editForm.register('category', { required: true })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        {categories.map(category => (
                          <option key={category.value} value={category.value}>
                            {category.icon} {category.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        required
                        {...addForm.register('category', { required: true })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        {categories.map(category => (
                          <option key={category.value} value={category.value}>
                            {category.icon} {category.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL-Slug
                  </label>
                  {editingTip ? (
                    <input
                      type="text"
                      {...editForm.register('slug')}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="wird automatisch generiert"
                      onBlur={(e) => {
                        if (!e.target.value && editForm.getValues('name')) {
                          const slug = generateSlug(editForm.getValues('name'), { maxLength: 35, removeStopwords: true });
                          editForm.setValue('slug', slug, { shouldDirty: true });
                        }
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      {...addForm.register('slug')}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="wird automatisch generiert"
                      onBlur={(e) => {
                        if (!e.target.value && addForm.getValues('name')) {
                          const slug = generateSlug(addForm.getValues('name'), { maxLength: 35, removeStopwords: true });
                          addForm.setValue('slug', slug, { shouldDirty: true });
                        }
                      }}
                    />
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    URL-freundlicher Name für die Detailseite (wird automatisch generiert)
                  </p>
                </div>

                <div>
                  <TextareaInput
                    label="Beschreibung"
                    name="description"
                    register={editingTip ? editForm.register : addForm.register}
                    errors={editingTip ? editForm.formState.errors : addForm.formState.errors}
                    placeholder="Beschreibung der Location..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adresse *
                  </label>
                  {editingTip ? (
                    <input
                      type="text"
                      required
                      {...editForm.register('address', { required: true })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Vollständige Adresse"
                    />
                  ) : (
                    <input
                      type="text"
                      required
                      {...addForm.register('address', { required: true })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Vollständige Adresse"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Breitengrad *
                    </label>
                    {editingTip ? (
                      <input
                        type="number"
                        step="any"
                        required
                        {...editForm.register('latitude', { required: true })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="50.8278"
                      />
                    ) : (
                      <input
                        type="number"
                        step="any"
                        required
                        {...addForm.register('latitude', { required: true })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="50.8278"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Längengrad *
                    </label>
                    {editingTip ? (
                      <input
                        type="number"
                        step="any"
                        required
                        {...editForm.register('longitude', { required: true })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="12.9214"
                      />
                    ) : (
                      <input
                        type="number"
                        step="any"
                        required
                        {...addForm.register('longitude', { required: true })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="12.9214"
                      />
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 text-xl">💡</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Tipp für Koordinaten</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Sie können die Koordinaten von Google Maps kopieren. Klicken Sie mit der rechten Maustaste auf den gewünschten Ort und wählen Sie "Koordinaten kopieren".
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Telefon
                    </label>
                    {editingTip ? (
                      <input
                        type="tel"
                        {...editForm.register('phone')}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="+49 371 123456"
                      />
                    ) : (
                      <input
                        type="tel"
                        {...addForm.register('phone')}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="+49 371 123456"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Website
                    </label>
                    {editingTip ? (
                      <input
                        type="url"
                        {...editForm.register('website')}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="https://example.com"
                      />
                    ) : (
                      <input
                        type="url"
                        {...addForm.register('website')}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="https://example.com"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preiskategorie
                    </label>
                    {editingTip ? (
                      <select
                        {...editForm.register('price_range')}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        {priceRanges.map(price => (
                          <option key={price.value} value={price.value}>
                            {price.icon} {price.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        {...addForm.register('price_range')}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        {priceRanges.map(price => (
                          <option key={price.value} value={price.value}>
                            {price.icon} {price.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                </div>

                <CheckboxInput
                  label="Als empfohlen markieren"
                  name="is_featured"
                  register={editingTip ? editForm.register : addForm.register}
                  errors={editingTip ? editForm.formState.errors : addForm.formState.errors}
                />
              </div>
            )}

            {/* Step 4: Additional */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <TextareaInput
                    label="Öffnungszeiten (JSON)"
                    name="opening_hours"
                    register={editingTip ? editForm.register : addForm.register}
                    errors={editingTip ? editForm.formState.errors : addForm.formState.errors}
                    placeholder='{"Montag": "9:00-18:00", "Dienstag": "9:00-18:00", ...}'
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    JSON-Format für strukturierte Öffnungszeiten
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kontakt E-Mail
                  </label>
                  {editingTip ? (
                    <input
                      type="email"
                      {...editForm.register('contact_info_email')}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="info@example.com"
                    />
                  ) : (
                    <input
                      type="email"
                      {...addForm.register('contact_info_email')}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="info@example.com"
                    />
                  )}
                </div>

                <div>
                  <TextareaInput
                    label="Tipps & Empfehlungen"
                    name="tips"
                    register={editingTip ? editForm.register : addForm.register}
                    errors={editingTip ? editForm.formState.errors : addForm.formState.errors}
                    placeholder="Besondere Tipps und Empfehlungen für Besucher..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Form Navigation */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="flex space-x-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Zurück
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingTip(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Abbrechen
                </button>
                
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Weiter
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {editingTip ? 'Änderungen speichern' : 'Stadt-Tipp hinzufügen'}
                  </button>
                )}
              </div>
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
          <div key={tip.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md ${getCategoryColor(tip.category)}`}>
                    {getCategoryIcon(tip.category)}
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
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{tip.description}</p>
              
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
                <div className="flex items-center justify-end">
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