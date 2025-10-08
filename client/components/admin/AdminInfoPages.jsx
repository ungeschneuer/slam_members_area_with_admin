import React, { useState, useMemo, useEffect } from 'react';
import { useInfoPages, useCreateInfoPage, useUpdateInfoPage, useDeleteInfoPage } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { generateSlug as generateSlugUtil } from '../../utils/slugUtils.js';
import { useForm } from 'react-hook-form';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import TextareaInput from '../forms/TextareaInput.jsx';
import CheckboxInput from '../forms/CheckboxInput.jsx';

const AdminInfoPages = () => {
  const { data: pagesData, isLoading: loading, error } = useInfoPages();
  const createInfoPage = useCreateInfoPage();
  const updateInfoPage = useUpdateInfoPage();
  const deleteInfoPage = useDeleteInfoPage();
  
  const pages = useMemo(() => Array.isArray(pagesData) ? pagesData : [], [pagesData]);
  const [editingPage, setEditingPage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, clearErrors, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      category: 'general',
      order: 0,
      status: 'DRAFT',
      featuredImageUrl: '',
      metaDescription: '',
      tags: [],
      isPublished: false
    }
  });
  
  // Auto-generate slug when title changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'title') {
        const next = value?.title || '';
        setValue('slug', generateSlug(next), { shouldDirty: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  // Live data handled by useLiveData

  // Legacy handler removed - RHF handles input changes automatically

  const generateSlug = (title) => {
    return generateSlugUtil(title, { maxLength: 45, removeStopwords: true });
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setValue('title', title, { shouldDirty: true });
    setValue('slug', generateSlug(title), { shouldDirty: true });
  };

  const onSubmit = async (data) => {
    try {
      clearErrors('root');
      if (editingPage) {
        await updateInfoPage.mutateAsync({ id: editingPage.id, ...data });
      } else {
        await createInfoPage.mutateAsync(data);
      }
      setShowForm(false);
      setEditingPage(null);
      reset();
    } catch (err) {
      console.error('Error saving page:', err);
      setError('root', { type: 'server', message: 'Fehler beim Speichern der Seite' });
    }
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    reset({
      title: page.title,
      slug: page.slug,
      content: page.content,
      excerpt: page.excerpt || '',
      category: page.category,
      order: page.order || 0,
      status: page.status,
      featuredImageUrl: page.featuredImageUrl || '',
      metaDescription: page.metaDescription || '',
      tags: page.tags || [],
      isPublished: page.isPublished
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
      setValue('featuredImageUrl', result.image.filePath, { shouldDirty: true });
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('root', { type: 'server', message: 'Fehler beim Hochladen des Bildes' });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    reset({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      category: 'general',
      order: 0,
      status: 'DRAFT',
      featuredImageUrl: '',
      metaDescription: '',
      tags: [],
      isPublished: false
    });
  };

  const categories = [
    { value: 'general', label: 'Allgemein' },
    { value: 'rules', label: 'Regeln' },
    { value: 'legal', label: 'Rechtliches' },
    { value: 'help', label: 'Hilfe' }
  ];

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
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{errors.root.message}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput label="Titel *" name="title" register={register} rules={{ required: 'Titel ist erforderlich' }} errors={errors} />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  aria-invalid={errors.slug ? 'true' : 'false'}
                  {...register('slug', { required: 'Slug ist erforderlich' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.slug && (
                  <p className="mt-1 text-sm text-red-600" role="alert">{errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectInput label="Kategorie" name="category" register={register} options={categories.map(c => ({ value: c.value, label: c.label }))} errors={errors} />
              
              <SelectInput label="Status" name="status" register={register} options={statusOptions.map(s => ({ value: s.value, label: s.label }))} errors={errors} />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reihenfolge
                </label>
                <input
                  type="number"
                  aria-invalid={errors.order ? 'true' : 'false'}
                  {...register('order', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <TextareaInput
                label="Kurzbeschreibung"
                name="excerpt"
                register={register}
                errors={errors}
                placeholder="Kurze Beschreibung der Seite..."
                rows={2}
              />
            </div>

            <div>
              <TextareaInput
                label="Inhalt (Markdown) *"
                name="content"
                register={register}
                errors={errors}
                placeholder="# Überschrift&#10;&#10;Hier kommt der Inhalt in Markdown-Format..."
                rows={15}
                rules={{ required: 'Inhalt ist erforderlich' }}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <TextareaInput
                label="Meta-Beschreibung"
                name="metaDescription"
                register={register}
                errors={errors}
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
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {uploading && <p className="text-sm text-gray-500 mt-1">Wird hochgeladen...</p>}
              </div>
            )}

            <CheckboxInput
              label="Sofort veröffentlichen"
              name="isPublished"
              register={register}
              errors={errors}
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
                      page.isPublished 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {page.isPublished ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(page.createdAt).toLocaleDateString('de-DE')}
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













