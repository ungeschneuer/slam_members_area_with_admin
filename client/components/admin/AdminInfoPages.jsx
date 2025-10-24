import React, { useState, useMemo, useEffect } from 'react';
import { useInfoPages, useCreateInfoPage, useUpdateInfoPage, useDeleteInfoPage } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { useFormManager } from '../../hooks/useFormManager.js';
import { createValidationSchema, getDefaultValues } from '../../../shared/schemas/validationFactory.js';
import { mapInfoPageFormToAPI } from '../../utils/formMappers.js';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import TextareaInput from '../forms/TextareaInput.jsx';
import MarkdownTextarea from '../forms/MarkdownTextarea.jsx';
import CheckboxInput from '../forms/CheckboxInput.jsx';
import { getAvailableContentFilterOptions, validateFilterValue } from '../../utils/filterUtils.js';

// Use centralized validation schema
const infoPageSchema = createValidationSchema('infoPage');

const AdminInfoPages = () => {
  const { data: pagesData, isLoading: loading, error } = useInfoPages({}, true); // isAdmin = true
  const createInfoPage = useCreateInfoPage();
  const updateInfoPage = useUpdateInfoPage();
  const deleteInfoPage = useDeleteInfoPage();
  
  const pages = useMemo(() => Array.isArray(pagesData) ? pagesData : [], [pagesData]);
  const [editingPage, setEditingPage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form management with centralized error handling
  const { 
    form, 
    error: componentError, 
    isSubmitting, 
    submitForm, 
    resetForm, 
    setFormValues,
    clearError 
  } = useFormManager(infoPageSchema, { 
    defaultValues: getDefaultValues('infoPage') 
  });
  
  // Auto-generate slug from title
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'title' && value?.title && !editingPage) {
        const slug = value.title
          .toLowerCase()
          .replace(/[äöü]/g, char => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[char]))
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 200);
        form.setValue('slug', slug);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, form.setValue, editingPage]);

  const onSubmit = async (data) => {
    const apiData = mapInfoPageFormToAPI(data);
    if (editingPage) {
      await updateInfoPage.mutateAsync({ id: editingPage.id, ...apiData });
    } else {
      await createInfoPage.mutateAsync(apiData);
    }
    
    // Proper cleanup
    setShowForm(false);
    setEditingPage(null);
    resetForm(); // Reset to defaults
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    setFormValues({
      title: page.title,
      slug: page.slug,
      content: page.content,
      excerpt: page.excerpt || '',
      category: page.category,
      order: page.order || 0,
      status: page.status,
      featuredImageUrl: page.featured_image_url || '',
      metaDescription: page.meta_description || '',
      tags: page.tags || [],
      isPublished: page.is_published
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Möchtest du diese Seite wirklich löschen?')) {
      return;
    }
    
    try {
      await deleteInfoPage.mutateAsync(id);
    } catch (err) {
      console.error('Error deleting page:', err);
      setError('root', { type: 'server', message: 'Fehler beim Löschen der Seite' });
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`/api/info-pages/${editingPage.id}/upload-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include' // Important for sending cookies
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      form.setValue('featuredImageUrl', result.image.filePath, { shouldDirty: true });
    } catch (err) {
      console.error('Error uploading image:', err);
      // Error handling is now managed by useFormManager
      console.error('Error uploading image:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleResetForm = () => {
    resetForm();
  };

  const predefinedCategories = [
    { value: 'general', label: 'Allgemein' },
    { value: 'rules', label: 'Regeln' },
    { value: 'legal', label: 'Rechtliches' },
    { value: 'help', label: 'Hilfe' }
  ];

  // Dynamic categories based on existing content (only published items)
  const categories = useMemo(() => {
    // Get categories that have at least one published item
    const categoriesInUse = new Set(
      pages
        .filter(page => page.status === 'PUBLISHED' || page.is_published)
        .map(page => page.category)
        .filter(Boolean)
    );
    
    // Return predefined options that have published content or are the "all" option
    return predefinedCategories.filter(option => 
      option.value === 'all' || categoriesInUse.has(option.value)
    );
  }, [pages]);

  const statusOptions = [
    { value: 'DRAFT', label: 'Entwurf' },
    { value: 'PUBLISHED', label: 'Veröffentlicht' },
    { value: 'ARCHIVED', label: 'Archiviert' }
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Info-Seiten verwalten</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingPage(null);
            resetForm();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Neue Seite erstellen
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error?.message || error}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingPage ? 'Seite bearbeiten' : 'Neue Seite erstellen'}
          </h3>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{form.formState.errors.root.message}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput label="Titel *" name="title" control={form.control} error={form.formState.errors.title?.message} />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  aria-invalid={form.formState.errors.slug ? 'true' : 'false'}
                  {...form.register('slug', { required: 'Slug ist erforderlich' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {form.formState.errors.slug && (
                  <p className="mt-1 text-sm text-red-600" role="alert">{form.formState.errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectInput label="Kategorie" name="category" control={form.control} options={categories.map(c => ({ value: c.value, label: c.label }))} error={form.formState.errors.category?.message} />
              
              <SelectInput label="Status" name="status" control={form.control} options={statusOptions.map(s => ({ value: s.value, label: s.label }))} error={form.formState.errors.status?.message} />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reihenfolge
                </label>
                <input
                  type="number"
                  aria-invalid={form.formState.errors.order ? 'true' : 'false'}
                  {...form.register('order', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <TextareaInput
                label="Kurzbeschreibung"
                name="excerpt"
                control={form.control}
                error={form.formState.errors}
                placeholder="Kurze Beschreibung der Seite..."
                rows={2}
              />
            </div>

            <div>
              <MarkdownTextarea
                label="Inhalt (Markdown) *"
                name="content"
                control={form.control}
                errors={form.formState.errors}
                placeholder="# Überschrift&#10;&#10;Hier kommt der Inhalt in Markdown-Format..."
                rows={12}
                rules={{ required: 'Inhalt ist erforderlich' }}
                helpText="Verwende Markdown-Syntax für Formatierung. URLs werden automatisch verlinkt."
              />
            </div>

            <div>
              <TextareaInput
                label="Meta-Beschreibung"
                name="meta_description"
                control={form.control}
                error={form.formState.errors}
                placeholder="SEO Meta-Beschreibung..."
                rows={2}
              />
            </div>

            {editingPage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bild hochladen
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {uploading && <p className="text-sm text-gray-500 mt-1">Wird hochgeladen...</p>}
                
                {/* Current file preview */}
                {editingPage?.featured_image_url && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Aktuelle Datei:</p>
                    {editingPage.featured_image_url.toLowerCase().includes('.pdf') ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">📄</span>
                        <span className="text-sm text-gray-600">PDF-Datei</span>
                        <a 
                          href={editingPage.featured_image_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Anzeigen
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <img 
                          src={editingPage.featured_image_url} 
                          alt="Featured image" 
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div>
                          <p className="text-sm text-gray-600">Bild</p>
                          <a 
                            href={editingPage.featured_image_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Anzeigen
                          </a>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue('featuredImageUrl', '');
                        setEditingPage({...editingPage, featured_image_url: null});
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Datei entfernen
                    </button>
                  </div>
                )}
              </div>
            )}

            <CheckboxInput
              label="Sofort veröffentlichen"
              name="is_published"
              control={form.control}
              error={form.formState.errors.is_published?.message}
            />

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPage(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createInfoPage.isPending || updateInfoPage.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-70"
              >
                {isSubmitting || createInfoPage.isPending || updateInfoPage.isPending ? 'Speichern...' : (editingPage ? 'Aktualisieren' : 'Erstellen')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pages List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Alle Seiten ({pages.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map(page => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {page.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        /{page.slug}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {page.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      page.is_published 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {page.is_published ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(page.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(page)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminInfoPages;













